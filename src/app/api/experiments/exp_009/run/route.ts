/**
 * POST /api/experiments/exp_009/run
 *
 * Enqueues a benchmark run against the requested task/model subset.
 * Returns { runId } immediately — results are streamed via SSE at /results.
 *
 * Request body (JSON):
 *   taskIds?  string[]  — subset of task IDs; omit/[] → all loaded tasks
 *   modelIds? ModelId[] — subset of MODEL_IDS; omit/[] → all three models
 *
 * Responses:
 *   200  { runId: string }             — run enqueued
 *   400  { error: string }             — invalid request body
 *   429  { error: string }             — IP rate limit exceeded
 *   500  { error: string }             — unexpected server error
 *
 * Rate limit: 10 requests per IP per 60 seconds. Fails closed (Redis down → blocked).
 */

import { NextRequest, NextResponse } from 'next/server';
import { RunRequestSchema, MODEL_IDS } from '../../../../../lib/experiments/exp_009/types';
import { loadTasks } from '../../../../../lib/experiments/exp_009/task-loader';
import { checkExp009RateLimit } from '../../../../../lib/experiments/exp_009/rate-limiter';
import { initRun } from '../../../../../lib/experiments/exp_009/store';
import { orchestrateRun } from '../../../../../lib/experiments/exp_009/orchestrator';
import type { ModelId } from '../../../../../lib/experiments/exp_009/types';

// ---------------------------------------------------------------------------
// Run ID generation — crypto.randomUUID is available in Node 22 / Edge Runtime.
// ---------------------------------------------------------------------------

function generateRunId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

function getClientIp(req: NextRequest): string {
  // Vercel / Railway forward the real IP in x-forwarded-for.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Fallback — local dev / direct connections.
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  let allowed: boolean;
  try {
    allowed = await checkExp009RateLimit(ip);
  } catch (err: unknown) {
    // checkExp009RateLimit wraps its own errors and returns false — this catch
    // is a final defensive layer.
    console.error('[exp_009][run] Rate limiter threw unexpectedly:', err);
    allowed = false;
  }

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before starting another run.' },
      { status: 429 },
    );
  }

  // ── Parse + validate body ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = RunRequestSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: `Invalid request: ${errors}` }, { status: 400 });
  }

  const { taskIds, modelIds } = parsed.data;

  // ── Resolve tasks ───────────────────────────────────────────────────────
  const allTasks = await loadTasks();
  if (allTasks.length === 0) {
    return NextResponse.json(
      { error: 'No tasks available. Check the task data directory.' },
      { status: 500 },
    );
  }

  const resolvedTasks =
    taskIds && taskIds.length > 0
      ? allTasks.filter((t) => taskIds.includes(t.id))
      : allTasks;

  if (resolvedTasks.length === 0) {
    return NextResponse.json(
      { error: `None of the requested taskIds exist: ${taskIds?.join(', ')}` },
      { status: 400 },
    );
  }

  // ── Resolve models ──────────────────────────────────────────────────────
  const resolvedModelIds: ModelId[] =
    modelIds && modelIds.length > 0 ? modelIds : [...MODEL_IDS];

  // ── Initialise run in store ─────────────────────────────────────────────
  const runId = generateRunId();
  const totalResults = resolvedTasks.length * resolvedModelIds.length;

  try {
    await initRun(runId, totalResults);
  } catch (err: unknown) {
    console.error(`[exp_009][run] Failed to initialise run store for ${runId}:`, err);
    return NextResponse.json(
      { error: 'Failed to initialise run. Please try again.' },
      { status: 500 },
    );
  }

  // ── Fire-and-forget orchestration ───────────────────────────────────────
  // orchestrateRun pushes TaskResults into the store as they complete.
  // The SSE /results route polls the store and streams them to the client.
  // We do NOT await here — the response is returned immediately with the runId.
  orchestrateRun(runId, resolvedTasks, resolvedModelIds).catch((err: unknown) => {
    // orchestrateRun catches its own errors internally; this handles the case
    // where the function itself throws (should not happen, but belt-and-suspenders).
    console.error(`[exp_009][run] orchestrateRun error for run ${runId}:`, err);
  });

  console.log(
    `[exp_009][run] enqueued run=${runId} tasks=${resolvedTasks.length} models=${resolvedModelIds.join(',')} total=${totalResults} ip=${ip}`,
  );

  return NextResponse.json({ runId }, { status: 200 });
}
