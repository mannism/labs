/** Executes a single benchmark task against a given model and returns a validated TaskResult. */

import { type Task, type ModelConfig, type TaskResult } from './types';

/**
 * Run a single benchmark task against one model.
 *
 * Contract:
 *   - Resolves to a TaskResult on both pass and fail (no throws on validation failure).
 *   - Throws only on unrecoverable errors: SDK initialisation failure, hard timeout exceeded.
 *   - Provider SDK calls, schema validation, and latency measurement are all owned here.
 *
 * Implementation status: Day 2 — provider SDK wiring not yet implemented.
 */
export async function runTask(task: Task, model: ModelConfig): Promise<TaskResult> {
  // Day 2: implement provider dispatch (OpenAI / Anthropic / Google), timeout wrapper,
  // schema validation via schemaRegistry, and structured result construction.
  throw new Error('runner not implemented — Day 2');
}
