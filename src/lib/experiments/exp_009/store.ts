/**
 * EXP_009 — In-flight run store.
 *
 * Stores run state (enqueued task results) so the SSE /results route can
 * retrieve them as they complete. Two storage tiers:
 *
 *   Primary:  Redis — keys namespaced under exp009:run:<runId>:*
 *             TTL 1 hour. Results are pushed as a Redis list; a companion
 *             key tracks completion (exp009:run:<runId>:done).
 *
 *   Fallback: In-process Map — used when Redis is unavailable. Results
 *             are lost on process restart and invisible to other instances,
 *             but the run still completes correctly for the requesting client.
 *             A warning is logged on fallback entry.
 *
 * Key schema:
 *   exp009:run:<runId>:results   — Redis List of JSON-serialised TaskResult
 *   exp009:run:<runId>:done      — '1' when all tasks are complete
 *   exp009:run:<runId>:total     — total number of expected results (string)
 *
 * TTL: 3600 seconds on all keys.
 */

import { getRedisClient } from '../../twin/redis';
import type { TaskResult } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NS = 'exp009:run';
const RUN_TTL_SECONDS = 3600; // 1 hour

// ---------------------------------------------------------------------------
// In-process fallback store
// ---------------------------------------------------------------------------

interface InMemoryRun {
  results: TaskResult[];
  total: number;
  done: boolean;
}

/** Module-level fallback — only used when Redis is absent. */
const inMemoryStore = new Map<string, InMemoryRun>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resultsKey(runId: string): string {
  return `${NS}:${runId}:results`;
}

function doneKey(runId: string): string {
  return `${NS}:${runId}:done`;
}

function totalKey(runId: string): string {
  return `${NS}:${runId}:total`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise a new run slot.
 * Must be called before pushResult() so consumers know the expected total.
 *
 * @param runId   Unique run identifier.
 * @param total   Total number of TaskResults expected across all tasks × models.
 */
export async function initRun(runId: string, total: number): Promise<void> {
  const client = getRedisClient();

  if (!client) {
    console.warn(`[exp_009][store] Redis unavailable — using in-process store for run ${runId}`);
    inMemoryStore.set(runId, { results: [], total, done: false });
    return;
  }

  try {
    const pipe = client.pipeline();
    pipe.set(totalKey(runId), String(total), 'EX', RUN_TTL_SECONDS);
    pipe.del(doneKey(runId)); // ensure clean slate
    await pipe.exec();
  } catch (err: unknown) {
    console.error(`[exp_009][store] initRun Redis error for ${runId}:`, err);
    // Fall back to in-process.
    inMemoryStore.set(runId, { results: [], total, done: false });
  }
}

/**
 * Append a completed TaskResult to the run's result list.
 * Also marks the run done if the list length has reached the expected total.
 */
export async function pushResult(runId: string, result: TaskResult): Promise<void> {
  const client = getRedisClient();
  const serialised = JSON.stringify(result);

  // In-process fallback path.
  const inMem = inMemoryStore.get(runId);
  if (!client || inMem) {
    if (inMem) {
      inMem.results.push(result);
      if (inMem.results.length >= inMem.total) {
        inMem.done = true;
      }
    }
    return;
  }

  try {
    const pipe = client.pipeline();
    pipe.rpush(resultsKey(runId), serialised);
    pipe.expire(resultsKey(runId), RUN_TTL_SECONDS);
    const pushResults = await pipe.exec();

    const listLen = (pushResults?.[0]?.[1] as number) ?? 0;
    const totalRaw = await client.get(totalKey(runId));
    const total = totalRaw ? parseInt(totalRaw, 10) : 0;

    if (total > 0 && listLen >= total) {
      await client.set(doneKey(runId), '1', 'EX', RUN_TTL_SECONDS);
    }
  } catch (err: unknown) {
    console.error(`[exp_009][store] pushResult Redis error for ${runId}:`, err);
  }
}

/**
 * Mark the run as complete regardless of result count.
 * Called by the orchestrator after all tasks have settled.
 */
export async function markDone(runId: string): Promise<void> {
  const client = getRedisClient();

  const inMem = inMemoryStore.get(runId);
  if (!client || inMem) {
    if (inMem) inMem.done = true;
    return;
  }

  try {
    await client.set(doneKey(runId), '1', 'EX', RUN_TTL_SECONDS);
  } catch (err: unknown) {
    console.error(`[exp_009][store] markDone Redis error for ${runId}:`, err);
  }
}

/**
 * Poll the run store for any new results beyond the given cursor offset.
 *
 * @param runId   Run identifier.
 * @param cursor  Number of results already consumed by the SSE client.
 * @returns       { results, done } — new results since cursor, plus done flag.
 */
export async function pollResults(
  runId: string,
  cursor: number,
): Promise<{ results: TaskResult[]; done: boolean }> {
  const client = getRedisClient();

  // In-process fallback path.
  const inMem = inMemoryStore.get(runId);
  if (!client || inMem) {
    if (inMem) {
      const slice = inMem.results.slice(cursor);
      return { results: slice, done: inMem.done };
    }
    return { results: [], done: false };
  }

  try {
    // LRANGE cursor -1 → all elements from cursor to end of list.
    const rawItems = await client.lrange(resultsKey(runId), cursor, -1);
    const results: TaskResult[] = rawItems.map((item) => JSON.parse(item) as TaskResult);

    const doneFlag = await client.get(doneKey(runId));
    return { results, done: doneFlag === '1' };
  } catch (err: unknown) {
    console.error(`[exp_009][store] pollResults Redis error for ${runId}:`, err);
    return { results: [], done: false };
  }
}

/**
 * Check whether a run exists (has been initialised).
 * Used by the SSE route to return 404 for unknown runIds.
 */
export async function runExists(runId: string): Promise<boolean> {
  if (inMemoryStore.has(runId)) return true;

  const client = getRedisClient();
  if (!client) return false;

  try {
    // Check for the total key — present iff initRun was called.
    const val = await client.get(totalKey(runId));
    return val !== null;
  } catch (err: unknown) {
    console.error(`[exp_009][store] runExists Redis error for ${runId}:`, err);
    return false;
  }
}
