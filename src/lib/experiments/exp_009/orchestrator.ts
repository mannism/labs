/**
 * EXP_009 — Run orchestrator.
 *
 * Sits between the API route and runner.ts. Responsibilities:
 *
 *   1. Backoff/retry — wraps runTask() calls so that provider 429/5xx responses
 *      trigger exponential backoff with full jitter. Up to 3 attempts per task.
 *      Final-attempt failures produce a pass:false TaskResult — never throw.
 *
 *   2. Concurrency control — caps parallel calls per provider to avoid hammering
 *      APIs. Uses a simple semaphore pattern (no external queue library).
 *      Default: MAX_CONCURRENT_PER_PROVIDER = 2.
 *
 *   3. Result fan-out — each completed TaskResult is pushed to the store as it
 *      arrives, enabling the SSE client to stream results in real-time.
 *
 * runner.ts stays provider-dispatch only. All retry/concurrency logic lives here.
 */

import { runTask } from './runner';
import { pushResult, markDone } from './store';
import { MODEL_CONFIGS } from './types';
import type { Task, ModelConfig, TaskResult, ModelId } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of concurrent provider calls per provider type. */
const MAX_CONCURRENT_PER_PROVIDER = 2;

/** Maximum number of retry attempts (including the initial attempt). */
const MAX_ATTEMPTS = 3;

/** Base delay for exponential backoff in milliseconds. */
const BACKOFF_BASE_MS = 500;

/** Maximum backoff cap to prevent runaway delays. */
const BACKOFF_CAP_MS = 16_000;

// ---------------------------------------------------------------------------
// Semaphore (p-limit pattern — no external dependency)
// ---------------------------------------------------------------------------

/**
 * A simple counting semaphore that limits the number of concurrently executing
 * async tasks. Works by keeping a count of active slots and queueing waiters
 * that resolve when a slot becomes free.
 */
function createSemaphore(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function release(): void {
    active--;
    const next = queue.shift();
    if (next) {
      active++;
      next();
    }
  }

  async function acquire(): Promise<void> {
    if (active < concurrency) {
      active++;
      return;
    }
    // Wait until a slot opens.
    return new Promise<void>((resolve) => {
      queue.push(resolve);
    });
  }

  return { acquire, release };
}

// One semaphore per provider, shared across all runOrchestrated calls within a
// single invocation. Created fresh per orchestrateRun() call so concurrent /run
// requests don't share limits.
type ProviderSemaphores = Record<string, ReturnType<typeof createSemaphore>>;

// ---------------------------------------------------------------------------
// Backoff helper
// ---------------------------------------------------------------------------

/**
 * Full-jitter exponential backoff delay.
 * Delay = random(0, min(cap, base * 2^attempt)).
 * "Full jitter" avoids thundering herd on simultaneous retries.
 */
function backoffDelayMs(attempt: number): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * Math.pow(2, attempt));
  return Math.floor(Math.random() * ceiling);
}

/**
 * Determine if a TaskResult indicates a retriable provider error.
 * We treat pass:false results whose validationErrors contain HTTP status
 * indicators (429, 5xx) as retriable. This avoids re-running schema failures
 * which will never pass regardless of retries.
 */
function isRetriableFailure(result: TaskResult): boolean {
  if (result.pass) return false;
  const errors = result.validationErrors ?? [];
  return errors.some((e) => /429|500|502|503|504|rate.?limit|server.?error/i.test(e));
}

// ---------------------------------------------------------------------------
// Core: run one task against one model with retry + backoff
// ---------------------------------------------------------------------------

async function runWithRetry(
  task: Task,
  model: ModelConfig,
  semaphores: ProviderSemaphores,
): Promise<TaskResult> {
  const sem = semaphores[model.provider];

  let lastResult: TaskResult | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = backoffDelayMs(attempt);
      console.warn(
        `[exp_009][orchestrator] retry ${attempt}/${MAX_ATTEMPTS - 1} for task=${task.id} model=${model.id} delay=${delay}ms`,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }

    // Acquire semaphore slot before calling the provider.
    await sem.acquire();
    let result: TaskResult;
    try {
      result = await runTask(task, model);
    } finally {
      sem.release();
    }

    lastResult = result;

    if (result.pass || !isRetriableFailure(result)) {
      // Either success or a non-retriable failure (schema error, auth, etc.).
      return result;
    }
  }

  // Exhausted retries — return the last result (pass: false).
  // This should always be set by this point.
  return lastResult!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Orchestrate a full run: execute all task×model combinations with concurrency
 * control and retry/backoff, streaming results to the store as they complete.
 *
 * @param runId    Identifier for this run (used for store keying + logging).
 * @param tasks    Task list to execute.
 * @param modelIds Which models to run against (default: all three).
 */
export async function orchestrateRun(
  runId: string,
  tasks: Task[],
  modelIds: ModelId[],
): Promise<void> {
  // Build per-provider semaphores for this run.
  const semaphores: ProviderSemaphores = {};
  const providers = new Set(modelIds.map((id) => MODEL_CONFIGS[id].provider));
  for (const provider of providers) {
    semaphores[provider] = createSemaphore(MAX_CONCURRENT_PER_PROVIDER);
  }

  // Build the flat list of (task, model) pairs.
  const pairs: Array<{ task: Task; model: ModelConfig }> = [];
  for (const task of tasks) {
    for (const modelId of modelIds) {
      pairs.push({ task, model: MODEL_CONFIGS[modelId] });
    }
  }

  console.log(
    `[exp_009][orchestrator] starting run=${runId} tasks=${tasks.length} models=${modelIds.join(',')} total=${pairs.length}`,
  );

  // Fan out all pairs concurrently. Per-provider semaphores gate actual
  // provider calls; Promise.allSettled ensures we never lose a result.
  const executions = pairs.map(async ({ task, model }) => {
    try {
      const result = await runWithRetry(task, model, semaphores);
      await pushResult(runId, result);
    } catch (err: unknown) {
      // runWithRetry should never throw — this is a defensive catch.
      console.error(
        `[exp_009][orchestrator] unexpected error for task=${task.id} model=${model.id}:`,
        err,
      );
      // Push a synthetic failure result so the SSE client isn't left waiting.
      const syntheticResult: TaskResult = {
        taskId: task.id,
        model: model.id,
        pass: false,
        latencyMs: 0,
        rawResponse: '',
        validationErrors: [`Orchestrator error: ${err instanceof Error ? err.message : String(err)}`],
        timestamp: new Date().toISOString(),
      };
      await pushResult(runId, syntheticResult);
    }
  });

  await Promise.allSettled(executions);

  // Mark the run complete so SSE clients can close the stream.
  await markDone(runId);

  console.log(`[exp_009][orchestrator] run=${runId} completed`);
}
