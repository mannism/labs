/**
 * EXP_009 — Anthropic provider
 *
 * Uses @anthropic-ai/sdk messages.create with tools.
 *
 * Return contract (same as openai.ts):
 *   - Tool-calling tasks: { tool_calls: [{ tool_name, arguments }] }
 *   - Structured JSON tasks: parsed JSON object from the text content block
 *   - Never throws — errors returned as { error: string }
 *
 * Anthropic tool_use content blocks have this shape:
 *   { type: 'tool_use', id: string, name: string, input: Record<string,unknown> }
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ToolDefinition } from '../types';
import { EXP009_ANTHROPIC_API_KEY, EXP009_ANTHROPIC_MODEL } from '../config';
import type { ProviderError, ProviderOutcome, ProviderResult } from './openai';

// Singleton client.
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: EXP009_ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Convert provider-agnostic ToolDefinition[] to the Anthropic tool format.
 * Anthropic expects: { name, description, input_schema: { type:'object', properties, required } }
 */
function toAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool['input_schema'],
  }));
}

/**
 * Normalise Anthropic message content into our canonical shape.
 * tool_use blocks → { tool_calls: [{ tool_name, arguments }] }
 * text blocks → parsed JSON
 */
function normaliseContent(
  content: Anthropic.ContentBlock[],
  hasTools: boolean,
): unknown {
  if (hasTools) {
    const calls = content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block) => ({
        tool_name: block.name,
        // block.input is already a parsed object — keep it as-is.
        arguments: block.input,
      }));
    return { tool_calls: calls };
  }

  // Structured JSON task: extract text block and parse.
  const textBlock = content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  if (!textBlock) return null;

  const text = textBlock.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Call the Anthropic Messages API for a single benchmark task.
 */
export async function callAnthropic(
  prompt: string,
  tools: ToolDefinition[] | undefined,
  maxTokens: number,
  timeoutMs: number,
): Promise<ProviderOutcome> {
  const client = getClient();
  const hasTools = Array.isArray(tools) && tools.length > 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.messages.create(
      {
        model: EXP009_ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        ...(hasTools && {
          tools: toAnthropicTools(tools!),
          tool_choice: { type: 'auto' },
        }),
      },
      { signal: controller.signal },
    );

    const raw = JSON.stringify({
      model: response.model,
      stop_reason: response.stop_reason,
      content: response.content,
    });

    try {
      const parsed = normaliseContent(response.content, hasTools);
      return { parsed, raw } satisfies ProviderResult;
    } catch (parseErr: unknown) {
      return {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        raw,
      } satisfies ProviderError;
    }
  } catch (err: unknown) {
    return anthropicErrorOutcome(err);
  } finally {
    clearTimeout(timer);
  }
}

function anthropicErrorOutcome(err: unknown): ProviderError {
  if (err instanceof Anthropic.APIError) {
    const msg = `[anthropic] API error ${err.status}: ${err.message}`;
    console.error(msg);
    return { error: msg, raw: JSON.stringify({ status: err.status, message: err.message }) };
  }
  if (err instanceof Error && err.name === 'AbortError') {
    const msg = '[anthropic] request timed out';
    console.error(msg);
    return { error: msg, raw: JSON.stringify({ error: 'timeout' }) };
  }
  const msg = `[anthropic] unexpected error: ${err instanceof Error ? err.message : String(err)}`;
  console.error(msg);
  return { error: msg, raw: JSON.stringify({ error: String(err) }) };
}
