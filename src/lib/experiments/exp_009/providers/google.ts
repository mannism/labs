/**
 * EXP_009 — Google Generative AI provider
 *
 * Uses @google/generative-ai generateContent with functionDeclarations.
 *
 * Return contract (same as openai.ts / anthropic.ts):
 *   - Tool-calling tasks: { tool_calls: [{ tool_name, arguments }] }
 *   - Structured JSON tasks: parsed JSON object from the text part
 *   - Never throws — errors returned as { error: string }
 *
 * Google functionCall parts have this shape:
 *   { functionCall: { name: string, args: Record<string, unknown> } }
 *
 * Note: GOOGLE_AI_API_KEY is not yet provisioned (Owner's prepay account
 * pending). This module compiles and has correct call structure but Google
 * calls will fail at runtime until the key is set. The runner handles this
 * gracefully — missing key = error outcome, task marked fail.
 */

import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type FunctionDeclarationSchemaProperty,
  type GenerateContentRequest,
  type Part,
  type FunctionCallPart,
  type TextPart,
} from '@google/generative-ai';
import type { ToolDefinition, ToolParameter } from '../types';
import { EXP009_GOOGLE_AI_API_KEY, EXP009_GOOGLE_MODEL } from '../config';
import type { ProviderError, ProviderOutcome, ProviderResult } from './openai';

// Singleton client — created lazily so a missing key doesn't crash at import.
let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    _client = new GoogleGenerativeAI(EXP009_GOOGLE_AI_API_KEY);
  }
  return _client;
}

/**
 * Map a ToolParameter type string to the Google SchemaType enum.
 * Google uses 'integer' but our ToolParameter only has 'number'; we map
 * number → NUMBER (float). Arrays and objects handled separately.
 */
function toSchemaType(type: ToolParameter['type']): SchemaType {
  switch (type) {
    case 'string':
      return SchemaType.STRING;
    case 'number':
      return SchemaType.NUMBER;
    case 'boolean':
      return SchemaType.BOOLEAN;
    case 'array':
      return SchemaType.ARRAY;
    case 'object':
      return SchemaType.OBJECT;
  }
}

/**
 * Recursively convert a ToolParameter to the Google SDK's
 * FunctionDeclarationSchemaProperty (= Schema union type).
 * We use `unknown` as the intermediate to thread the needle between our
 * ToolParameter type and Google's discriminated union types.
 */
function toGoogleSchemaProperty(param: ToolParameter): FunctionDeclarationSchemaProperty {
  const base = {
    description: param.description,
    nullable: false,
  };

  switch (param.type) {
    case 'object': {
      const properties: Record<string, FunctionDeclarationSchemaProperty> = {};
      if (param.properties) {
        for (const [key, value] of Object.entries(param.properties)) {
          properties[key] = toGoogleSchemaProperty(value);
        }
      }
      return {
        ...base,
        type: SchemaType.OBJECT,
        // Google requires properties to be non-empty for OBJECT type.
        properties: Object.keys(properties).length > 0 ? properties : { _placeholder: { type: SchemaType.STRING } },
        ...(param.required && { required: param.required }),
      } as FunctionDeclarationSchemaProperty;
    }

    case 'array': {
      return {
        ...base,
        type: SchemaType.ARRAY,
        // items must be present for ARRAY — use string schema as fallback.
        items: param.items ? toGoogleSchemaProperty(param.items) : { type: SchemaType.STRING },
      } as FunctionDeclarationSchemaProperty;
    }

    case 'string': {
      if (param.enum && param.enum.length > 0) {
        return {
          ...base,
          type: SchemaType.STRING,
          format: 'enum' as const,
          enum: param.enum.map(String),
        } as FunctionDeclarationSchemaProperty;
      }
      return { ...base, type: SchemaType.STRING } as FunctionDeclarationSchemaProperty;
    }

    case 'number':
      return { ...base, type: SchemaType.NUMBER } as FunctionDeclarationSchemaProperty;

    case 'boolean':
      return { ...base, type: SchemaType.BOOLEAN } as FunctionDeclarationSchemaProperty;
  }
}

/**
 * Convert a ToolDefinition's top-level parameter (always an object) to
 * FunctionDeclarationSchema — the specific type Google requires for tool parameters.
 */
function toFunctionDeclarationSchema(param: ToolParameter): FunctionDeclarationSchema {
  const properties: Record<string, FunctionDeclarationSchemaProperty> = {};
  if (param.properties) {
    for (const [key, value] of Object.entries(param.properties)) {
      properties[key] = toGoogleSchemaProperty(value);
    }
  }

  return {
    type: toSchemaType(param.type),
    properties,
    description: param.description,
    required: param.required,
  };
}

/**
 * Convert provider-agnostic ToolDefinition[] to Google FunctionDeclaration[].
 */
function toGoogleTools(tools: ToolDefinition[]): FunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: toFunctionDeclarationSchema(t.parameters),
  }));
}

/**
 * Normalise Google response parts into our canonical shape.
 */
function normaliseParts(parts: Part[], hasTools: boolean): unknown {
  if (hasTools) {
    const calls = parts
      .filter((p): p is FunctionCallPart => 'functionCall' in p && p.functionCall !== undefined)
      .map((p) => ({
        tool_name: p.functionCall.name,
        // args is already a parsed object.
        arguments: p.functionCall.args as unknown,
      }));
    return { tool_calls: calls };
  }

  // Structured JSON task: extract text part and parse.
  const textPart = parts.find((p): p is TextPart => 'text' in p && typeof p.text === 'string');
  if (!textPart) return null;

  const text = textPart.text
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
 * Call the Google Generative AI API for a single benchmark task.
 */
export async function callGoogle(
  prompt: string,
  tools: ToolDefinition[] | undefined,
  maxTokens: number,
  timeoutMs: number,
): Promise<ProviderOutcome> {
  // Fail fast with a clear message if the API key is missing.
  if (!EXP009_GOOGLE_AI_API_KEY) {
    const msg = '[google] GOOGLE_AI_API_KEY not set — skipping';
    console.warn(msg);
    return { error: msg, raw: JSON.stringify({ error: 'missing_api_key' }) } satisfies ProviderError;
  }

  const hasTools = Array.isArray(tools) && tools.length > 0;
  const client = getClient();

  const model = client.getGenerativeModel({
    model: EXP009_GOOGLE_MODEL,
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const request: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(hasTools && {
      tools: [{ functionDeclarations: toGoogleTools(tools!) }],
    }),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // generateContent doesn't natively accept AbortSignal in this SDK version,
    // so we race against a manual timeout rejection.
    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError')),
      );
    });

    const result = await Promise.race([model.generateContent(request), timeoutPromise]);

    const candidate = result.response.candidates?.[0];
    if (!candidate) {
      return {
        error: '[google] no candidates in response',
        raw: JSON.stringify(result.response),
      } satisfies ProviderError;
    }

    const raw = JSON.stringify({
      model: EXP009_GOOGLE_MODEL,
      finishReason: candidate.finishReason,
      content: candidate.content,
    });

    try {
      const parsed = normaliseParts(candidate.content.parts, hasTools);
      return { parsed, raw } satisfies ProviderResult;
    } catch (parseErr: unknown) {
      return {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        raw,
      } satisfies ProviderError;
    }
  } catch (err: unknown) {
    return googleErrorOutcome(err);
  } finally {
    clearTimeout(timer);
  }
}

function googleErrorOutcome(err: unknown): ProviderError {
  if (err instanceof Error && err.name === 'AbortError') {
    const msg = '[google] request timed out';
    console.error(msg);
    return { error: msg, raw: JSON.stringify({ error: 'timeout' }) };
  }
  const msg = `[google] error: ${err instanceof Error ? err.message : String(err)}`;
  console.error(msg);
  return { error: msg, raw: JSON.stringify({ error: String(err) }) };
}
