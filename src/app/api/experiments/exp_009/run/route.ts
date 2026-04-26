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
 *   200  { runId: string }
 *   400  { error: string }
 *   429  { error: 'rate_limited', retryAfterSeconds: number, layer: 'cookie' | 'ip' }
 *        Retry-After header set per RFC 7231 §7.1.3
 *   500  { error: string }
 *
 * Rate limiting — two independent layers, both must pass:
 *   cookie layer: 1 request per client (HttpOnly cookie) per 180 seconds.
 *   ip layer:     5 requests per egress IP per 3600 seconds.
 * Fails closed (Redis down → blocked).
 */

import { NextRequest, NextResponse } from 'next/server';
import { RunRequestSchema, MODEL_IDS } from '../../../../../lib/experiments/exp_009/types';
import { loadTasks } from '../../../../../lib/experiments/exp_009/task-loader';
import { checkExp009RateLimit } from '../../../../../lib/experiments/exp_009/rate-limiter';
import type { RateLimitResult } from '../../../../../lib/experiments/exp_009/rate-limiter';
import { initRun } from '../../../../../lib/experiments/exp_009/store';
import { orchestrateRun } from '../../../../../lib/experiments/exp_009/orchestrator';
import type { ModelId } from '../../../../../lib/experiments/exp_009/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cookie that identifies a browser for the per-client rate limit layer. */
const CLIENT_COOKIE_NAME = 'exp009_client_id';

/**
 * Cookie TTL — 1 year. Long-lived so incognito sessions cycling cookies don't
 * trivially bypass the per-client layer. The IP floor remains the hard cap.
 */
const CLIENT_COOKIE_MAX_AGE = 31_536_000; // seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRunId(): string {
  // crypto.randomUUID is available in Node 22 and Edge Runtime.
  return crypto.randomUUID();
}

function getClientIp(req: NextRequest): string {
  // Vercel / Railway forward the real IP in x-forwarded-for.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Fallback — local dev / direct connections.
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Read or generate the client ID from/for the exp009_client_id cookie.
 *
 * Returns:
 *   clientId — the UUID to use for rate-limit keying
 *   isNew    — true if we generated a new ID (caller must Set-Cookie in response)
 */
function getOrCreateClientId(req: NextRequest): { clientId: string; isNew: boolean } {
  const existing = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
  // Basic validation: must look like a UUID v4 to avoid Redis key injection.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (existing && uuidPattern.test(existing)) {
    return { clientId: existing, isNew: false };
  }
  return { clientId: crypto.randomUUID(), isNew: true };
}

/** Build the Set-Cookie header value for the client ID cookie. */
function buildClientIdCookieHeader(clientId: string): string {
  return [
    `${CLIENT_COOKIE_NAME}=${clientId}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Path=/`,
    `Max-Age=${CLIENT_COOKIE_MAX_AGE}`,
  ].join('; ');
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Cookie: read or generate client ID ──────────────────────────────────
  const ip = getClientIp(req);
  const { clientId, isNew } = getOrCreateClientId(req);

  // ── Rate limit (two layers: cookie + IP) ────────────────────────────────
  let rateLimitResult: RateLimitResult;
  try {
    rateLimitResult = await checkExp009RateLimit(clientId, ip);
  } catch (err: unknown) {
    // checkExp009RateLimit wraps its own errors — this is a final defensive
    // layer that should never fire in practice.
    console.error('[exp_009][run] Rate limiter threw unexpectedly:', err);
    rateLimitResult = { allowed: false, retryAfterSeconds: 180, layer: 'cookie' };
  }

  if (!rateLimitResult.allowed) {
    const { retryAfterSeconds, layer } = rateLimitResult;
    const response = NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds, layer },
      {
        status: 429,
        headers: {
          // RFC 7231 §7.1.3 — seconds until the client may retry.
          'Retry-After': String(retryAfterSeconds),
        },
      },
    );
    // Set cookie even on 429 so new clients get their ID for subsequent requests.
    if (isNew) {
      response.headers.set('Set-Cookie', buildClientIdCookieHeader(clientId));
    }
    return response;
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
  // We do NOT await — the response is returned immediately with the runId.
  orchestrateRun(runId, resolvedTasks, resolvedModelIds).catch((err: unknown) => {
    // orchestrateRun catches its own errors internally; this handles the rare
    // case where the function itself throws (belt-and-suspenders).
    console.error(`[exp_009][run] orchestrateRun error for run ${runId}:`, err);
  });

  console.log(
    `[exp_009][run] enqueued run=${runId} tasks=${resolvedTasks.length} models=${resolvedModelIds.join(',')} total=${totalResults} ip=${ip} clientId=${clientId}`,
  );

  // ── Build response — set cookie if newly issued ──────────────────────────
  const response = NextResponse.json({ runId }, { status: 200 });
  if (isNew) {
    response.headers.set('Set-Cookie', buildClientIdCookieHeader(clientId));
  }
  return response;
}
