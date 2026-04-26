/**
 * EXP_009 — OpenAI provider
 *
 * Uses the OpenAI Responses API (openai v6), which is the canonical API for
 * GPT-5.5 and GPT-4.1. Falls back from GPT-5.5 → GPT-4.1 if the primary
 * model returns a 404 (model not found) or 403 (access gated).
 *
 * Return contract:
 *   - For tool-calling tasks: returns `{ tool_calls: [{ tool_name, arguments }] }`
 *     so the caller can validate against either weather_tool_call or
 *     parallel_weather_currency schemas without knowing the provider.
 *   - For structured_json tasks (no toolDefinitions): parses the output text
 *     as JSON and returns the parsed value directly.
 *   - Never throws — all errors are returned as { error: string }.
 */

import OpenAI, { APIError } from 'openai';
import type { ToolDefinition } from '../types';
import {
  EXP009_OPENAI_API_KEY,
  EXP009_OPENAI_MODEL_FALLBACK,
  EXP009_OPENAI_MODEL_OVERRIDE,
  EXP009_OPENAI_MODEL_PRIMARY,
} from '../config';

export interface ProviderResult {
  /** Normalised object to validate against schemaRegistry. */
  parsed: unknown;
  /** Stringified raw response for the TaskResult.rawResponse field. */
  raw: string;
}

export interface ProviderError {
  error: string;
  raw: string;
}

export type ProviderOutcome = ProviderResult | ProviderError;

export function isProviderError(o: ProviderOutcome): o is ProviderError {
  return 'error' in o;
}

// Singleton client — created once at module load, reused across calls.
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: EXP009_OPENAI_API_KEY });
  }
  return _client;
}

/**
 * Convert provider-agnostic ToolDefinition[] to the OpenAI Responses API
 * FunctionTool[] shape. The Responses API uses `type: 'function'` with a
 * `parameters` object (JSON Schema) and `strict: true`.
 */
function toOpenAITools(
  tools: ToolDefinition[],
): OpenAI.Responses.FunctionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    // ToolParameter is structurally compatible with JSON Schema.
    // Double-cast through unknown to satisfy strict structural checking.
    parameters: t.parameters as unknown as Record<string, unknown>,
    strict: false, // strict mode requires all properties to be required — relax for flexibility
  }));
}

/**
 * Normalise the OpenAI Responses API output into our canonical shape.
 * Tool calls → { tool_calls: [{ tool_name, arguments }] }
 * Text output → parsed JSON object
 */
function normaliseOutput(
  output: OpenAI.Responses.ResponseOutputItem[],
  hasTools: boolean,
): unknown {
  if (hasTools) {
    // Extract all function_call items from the output array.
    const calls = output
      .filter(
        (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
          item.type === 'function_call',
      )
      .map((call) => ({
        tool_name: call.name,
        // arguments is a JSON string — parse to object for schema validation.
        arguments: JSON.parse(call.arguments) as unknown,
      }));

    return { tool_calls: calls };
  }

  // Structured JSON task: find the first message output and parse its text.
  const message = output.find(
    (item): item is OpenAI.Responses.ResponseOutputMessage =>
      item.type === 'message',
  );
  if (!message) return null;

  const textPart = message.content.find(
    (c): c is OpenAI.Responses.ResponseOutputText => c.type === 'output_text',
  );
  if (!textPart) return null;

  // Strip markdown code fences if the model wraps output in ```json ... ```
  const text = textPart.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Return the raw text so validation produces a meaningful error.
    return text;
  }
}

/**
 * Call the OpenAI Responses API for a single benchmark task.
 * Attempts GPT-5.5 first; falls back to GPT-4.1 on model-access errors.
 */
export async function callOpenAI(
  prompt: string,
  tools: ToolDefinition[] | undefined,
  maxTokens: number,
  timeoutMs: number,
): Promise<ProviderOutcome> {
  const client = getClient();
  const hasTools = Array.isArray(tools) && tools.length > 0;

  // Resolve model: env override > primary > (fallback handled below).
  const primaryModel = EXP009_OPENAI_MODEL_OVERRIDE || EXP009_OPENAI_MODEL_PRIMARY;

  const requestBody: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
    model: primaryModel,
    input: prompt,
    max_output_tokens: maxTokens,
    ...(hasTools && {
      tools: toOpenAITools(tools!),
      // tool_choice: 'auto' lets the model decide — mirrors real orchestration.
      tool_choice: 'auto',
    }),
  };

  const attemptCall = async (model: string): Promise<OpenAI.Responses.Response> => {
    const withModel = { ...requestBody, model };
    // AbortController gives us a clean per-call timeout.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await client.responses.create(withModel, {
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  };

  let response: OpenAI.Responses.Response;
  let modelUsed = primaryModel;

  try {
    response = await attemptCall(primaryModel);
  } catch (err: unknown) {
    // Check for model-access errors (404 model not found, 403 access gated).
    const isAccessError =
      err instanceof APIError &&
      (err.status === 404 || err.status === 403);

    if (isAccessError && primaryModel === EXP009_OPENAI_MODEL_PRIMARY) {
      console.warn(
        `[exp_009][openai] ${primaryModel} gated (${(err as APIError).status}) — falling back to ${EXP009_OPENAI_MODEL_FALLBACK}`,
      );
      modelUsed = EXP009_OPENAI_MODEL_FALLBACK;
      try {
        response = await attemptCall(EXP009_OPENAI_MODEL_FALLBACK);
      } catch (fallbackErr: unknown) {
        return errorOutcome(fallbackErr, 'openai-fallback');
      }
    } else {
      return errorOutcome(err, 'openai');
    }
  }

  if (modelUsed !== primaryModel) {
    console.warn(
      `[exp_009][openai] using fallback model ${modelUsed} — results labelled gpt-5.5 for schema but reflect gpt-4.1 performance`,
    );
  }

  const raw = JSON.stringify({ model: modelUsed, output: response.output });

  try {
    const parsed = normaliseOutput(response.output, hasTools);
    return { parsed, raw };
  } catch (parseErr: unknown) {
    return {
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      raw,
    };
  }
}

function errorOutcome(err: unknown, context: string): ProviderError {
  if (err instanceof APIError) {
    const msg = `[${context}] OpenAI API error ${err.status}: ${err.message}`;
    console.error(msg);
    return { error: msg, raw: JSON.stringify({ status: err.status, message: err.message }) };
  }
  if (err instanceof Error && err.name === 'AbortError') {
    const msg = `[${context}] OpenAI request timed out`;
    console.error(msg);
    return { error: msg, raw: JSON.stringify({ error: 'timeout' }) };
  }
  const msg = `[${context}] unexpected error: ${err instanceof Error ? err.message : String(err)}`;
  console.error(msg);
  return { error: msg, raw: JSON.stringify({ error: String(err) }) };
}
