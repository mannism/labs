/**
 * EXP_009 — Agentic Reliability Dashboard: Runner Engine
 *
 * Executes a single benchmark task against one model and returns a validated
 * TaskResult. Dispatches to the correct provider SDK based on ModelConfig.provider.
 *
 * Contract:
 *   - Resolves to TaskResult on both pass and fail (no throws on validation failure).
 *   - Throws only on unrecoverable errors: missing provider implementation.
 *   - Provider errors (timeout, rate limit, 5xx) are captured as pass:false results.
 *   - Latency is measured from just before the provider call to just after.
 *
 * Normalisation:
 *   All providers return { tool_calls: [{ tool_name, arguments }] } for tool-calling
 *   tasks. The schemaRegistry for single-tool tasks (weather_tool_call) expects the
 *   singular shape { tool_name, arguments }, so the runner unwraps the first element
 *   when the task category is 'simple_tool_call'.
 */

import { type Task, type ModelConfig, type TaskResult, schemaRegistry } from './types';
import { callOpenAI } from './providers/openai';
import { callAnthropic } from './providers/anthropic';
import { callGoogle } from './providers/google';
import { isProviderError } from './providers/openai';

/**
 * Run a single benchmark task against one model.
 * All provider errors are caught and returned as pass:false TaskResults.
 */
export async function runTask(task: Task, model: ModelConfig): Promise<TaskResult> {
  const schema = schemaRegistry[task.expectedSchema];
  if (!schema) {
    // Unknown schema key — this is a task authoring error, not a provider error.
    return buildResult(task, model, false, 0, '', [
      `Unknown expectedSchema key: "${task.expectedSchema}"`,
    ]);
  }

  const startMs = Date.now();

  // Dispatch to the correct provider.
  let outcome: Awaited<ReturnType<typeof callOpenAI>>;

  try {
    switch (model.provider) {
      case 'openai':
        outcome = await callOpenAI(
          task.prompt,
          task.toolDefinitions,
          model.maxTokens,
          model.timeoutMs,
        );
        break;
      case 'anthropic':
        outcome = await callAnthropic(
          task.prompt,
          task.toolDefinitions,
          model.maxTokens,
          model.timeoutMs,
        );
        break;
      case 'google':
        outcome = await callGoogle(
          task.prompt,
          task.toolDefinitions,
          model.maxTokens,
          model.timeoutMs,
        );
        break;
      default: {
        // TypeScript exhaustiveness check — should never reach here.
        const _exhaustive: never = model.provider;
        throw new Error(`Unimplemented provider: ${String(_exhaustive)}`);
      }
    }
  } catch (err: unknown) {
    // Unrecoverable dispatch error — provider not implemented, etc.
    const latencyMs = Math.round(Date.now() - startMs);
    return buildResult(task, model, false, latencyMs, '', [
      `Dispatch error: ${err instanceof Error ? err.message : String(err)}`,
    ]);
  }

  const latencyMs = Math.round(Date.now() - startMs);

  // Provider returned an error — task fails.
  if (isProviderError(outcome)) {
    return buildResult(task, model, false, latencyMs, outcome.raw, [outcome.error]);
  }

  // Normalise the parsed output before schema validation.
  const normalised = normaliseForSchema(task, outcome.parsed);

  // Validate against the expected Zod schema.
  const validation = schema.safeParse(normalised);

  if (validation.success) {
    return buildResult(task, model, true, latencyMs, outcome.raw, undefined);
  }

  // Schema validation failed — collect error messages.
  const errors = validation.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  return buildResult(task, model, false, latencyMs, outcome.raw, errors);
}

/**
 * Normalise provider output to match the expected schema shape.
 *
 * Providers always return { tool_calls: [...] } for tool tasks.
 * - simple_tool_call tasks expect the singular { tool_name, arguments } shape.
 *   Unwrap by returning the first element of tool_calls.
 * - parallel_tool_calls tasks expect { tool_calls: [...] } — pass through as-is.
 * - structured_json tasks have no tools — pass through the parsed JSON directly.
 */
function normaliseForSchema(task: Task, parsed: unknown): unknown {
  if (task.category === 'simple_tool_call') {
    // Unwrap { tool_calls: [first, ...] } → first element.
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'tool_calls' in parsed &&
      Array.isArray((parsed as { tool_calls: unknown[] }).tool_calls) &&
      (parsed as { tool_calls: unknown[] }).tool_calls.length > 0
    ) {
      return (parsed as { tool_calls: unknown[] }).tool_calls[0];
    }
  }
  return parsed;
}

/**
 * Build a TaskResult from components.
 */
function buildResult(
  task: Task,
  model: ModelConfig,
  pass: boolean,
  latencyMs: number,
  rawResponse: string,
  validationErrors: string[] | undefined,
): TaskResult {
  return {
    taskId: task.id,
    model: model.id,
    pass,
    latencyMs,
    rawResponse,
    validationErrors,
    timestamp: new Date().toISOString(),
  };
}
