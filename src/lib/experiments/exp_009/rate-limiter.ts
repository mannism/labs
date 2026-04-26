/**
 * EXP_009 — Two-layer rate limiter for the /run endpoint.
 *
 * Uses Redis sorted-set sliding windows, namespaced under exp009:ratelimit:*
 * to avoid coupling to the twin's keyspace.
 *
 * Two independent layers, both must pass:
 *
 *   Layer 1 — per-cookie (UX layer):
 *     1 request per 180 seconds per browser (HttpOnly cookie `exp009_client_id`).
 *     Rationale: one run takes ~2 minutes; prevents rapid re-clicks and lets each
 *     user in an office/shared-NAT environment have their own independent 3-min
 *     cooldown window rather than sharing a single IP quota.
 *
 *   Layer 2 — per-IP (security floor):
 *     5 requests per 3600 seconds per egress IP.
 *     Rationale: at ~$5/run the ceiling is $25/hr from any single IP regardless
 *     of cookie cycling (incognito, clearing cookies, etc.). Cookie cycling cannot
 *     bypass this hard floor.
 *
 * Both layers fail CLOSED — Redis unavailable → request blocked. An experiment
 * endpoint that can trigger N×M provider API calls must never be unguarded.
 *
 * On block, returns the remaining window of the blocking layer (or the larger of
 * the two if both block simultaneously) so the client countdown is accurate and
 * doesn't bounce back too soon.
 */

import { getRedisClient } from '../../twin/redis';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cookie layer: 1 request per browser per 3 minutes. */
const COOKIE_LIMIT_MAX = 1;
const COOKIE_WINDOW_SECONDS = 180;

/**
 * IP layer: 5 requests per IP per hour.
 * Cost ceiling: 5 × ~$5 = $25/hr from a single egress IP regardless of cookie
 * cycling. Office collisions (multiple users sharing an IP) are unlikely to
 * exceed 5 legitimate runs/hour; if they do, the Retry-After header communicates
 * the wait time clearly.
 */
const IP_LIMIT_MAX = 5;
const IP_WINDOW_SECONDS = 3600;

/** Redis key namespaces — separate for cookie and IP layers, no shared state. */
const COOKIE_KEY_PREFIX = 'exp009:ratelimit:cookie';
const IP_KEY_PREFIX = 'exp009:ratelimit:ip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateLimitLayer = 'cookie' | 'ip';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; layer: RateLimitLayer };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Check a single sliding-window bucket in Redis.
 *
 * Returns { admitted: true } if the request is within limits and increments
 * the counter. Returns { admitted: false, retryAfterSeconds } if blocked
 * (counter NOT incremented — caller must not admit the request).
 *
 * Uses a pipeline (ZREMRANGEBYSCORE + ZCARD + ZRANGE) to prune expired entries,
 * read the current count, and fetch the oldest entry for accurate Retry-After
 * — all atomically before the admit/block decision.
 */
async function checkWindow(
  key: string,
  max: number,
  windowSeconds: number,
  fallbackRetryAfterSeconds: number,
): Promise<{ admitted: true } | { admitted: false; retryAfterSeconds: number }> {
  const client = getRedisClient();
  if (!client) {
    return { admitted: false, retryAfterSeconds: fallbackRetryAfterSeconds };
  }

  const now = Date.now() / 1000; // seconds (float)
  const windowStart = now - windowSeconds;

  const pipe = client.pipeline();
  pipe.zremrangebyscore(key, '-inf', windowStart.toString());
  pipe.zcard(key);
  pipe.zrange(key, 0, 0, 'WITHSCORES'); // oldest entry: [member, score]
  const results = await pipe.exec();

  const count = (results?.[1]?.[1] as number) ?? 0;
  if (count >= max) {
    const oldest = results?.[2]?.[1] as string[] | undefined;
    const oldestTs = oldest && oldest.length >= 2 ? parseFloat(oldest[1]) : now - windowSeconds;
    const expiresAt = oldestTs + windowSeconds;
    const retryAfterSeconds = Math.max(1, Math.ceil(expiresAt - now));
    return { admitted: false, retryAfterSeconds };
  }

  // Admit — record and refresh TTL.
  await client.zadd(key, now, String(now));
  await client.expire(key, windowSeconds);
  return { admitted: true };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the request is within both rate-limit layers.
 *
 * Returns { allowed: true } → both layers passed (counters incremented).
 * Returns { allowed: false, retryAfterSeconds, layer } → one layer blocked;
 *   `retryAfterSeconds` is the larger of the two remaining windows so the
 *   client doesn't bounce back before the binding limit resets.
 *   `layer` identifies which layer triggered the block for structured logging.
 *
 * Layer evaluation order: cookie first (UX), then IP (security floor).
 * If cookie blocks, IP counter is NOT incremented (fail-fast).
 * If both block, the larger retryAfterSeconds is returned.
 *
 * Fails closed: Redis unavailable → blocked with full window of binding layer.
 */
export async function checkExp009RateLimit(
  clientId: string,
  ip: string,
): Promise<RateLimitResult> {
  const client = getRedisClient();
  if (!client) {
    console.warn('[exp_009][rate-limiter] Redis unavailable — blocking request (fail-closed)');
    return { allowed: false, retryAfterSeconds: COOKIE_WINDOW_SECONDS, layer: 'cookie' };
  }

  const cookieKey = `${COOKIE_KEY_PREFIX}:${clientId}`;
  const ipKey = `${IP_KEY_PREFIX}:${ip}`;

  try {
    // ── Check cookie layer first ───────────────────────────────────────────
    const cookieResult = await checkWindow(
      cookieKey,
      COOKIE_LIMIT_MAX,
      COOKIE_WINDOW_SECONDS,
      COOKIE_WINDOW_SECONDS,
    );

    if (!cookieResult.admitted) {
      // Cookie layer blocked. Check IP layer read-only to get its remaining
      // window (for accurate max(retryAfter)) — but do NOT increment.
      // We do a read-only check by querying the IP key directly.
      let ipRetryAfter = 0;
      try {
        const now = Date.now() / 1000;
        const ipWindowStart = now - IP_WINDOW_SECONDS;
        const ipPipe = client.pipeline();
        ipPipe.zremrangebyscore(ipKey, '-inf', ipWindowStart.toString());
        ipPipe.zcard(ipKey);
        ipPipe.zrange(ipKey, 0, 0, 'WITHSCORES');
        const ipResults = await ipPipe.exec();
        const ipCount = (ipResults?.[1]?.[1] as number) ?? 0;
        if (ipCount >= IP_LIMIT_MAX) {
          const oldest = ipResults?.[2]?.[1] as string[] | undefined;
          const oldestTs = oldest && oldest.length >= 2 ? parseFloat(oldest[1]) : now - IP_WINDOW_SECONDS;
          ipRetryAfter = Math.max(1, Math.ceil(oldestTs + IP_WINDOW_SECONDS - now));
        }
      } catch {
        // IP read failed — ignore, use cookie retryAfter only.
      }
      const retryAfterSeconds = Math.max(cookieResult.retryAfterSeconds, ipRetryAfter);
      return { allowed: false, retryAfterSeconds, layer: 'cookie' };
    }

    // ── Cookie layer passed — check IP layer ──────────────────────────────
    const ipResult = await checkWindow(
      ipKey,
      IP_LIMIT_MAX,
      IP_WINDOW_SECONDS,
      IP_WINDOW_SECONDS,
    );

    if (!ipResult.admitted) {
      // IP layer blocked AFTER cookie was admitted — we must roll back the
      // cookie counter to keep the layers independent. Rollback: remove the
      // entry we just added (score = now, within floating-point tolerance).
      try {
        const now = Date.now() / 1000;
        // ZRANGEBYSCORE with a small epsilon window to find the entry we added.
        const toRemove = await client.zrangebyscore(cookieKey, now - 1, now + 1);
        if (toRemove.length > 0) {
          await client.zrem(cookieKey, ...toRemove);
        }
      } catch (rollbackErr: unknown) {
        // Rollback failed — log and continue. The cookie counter is now one
        // ahead, which means this user's next attempt within the window will
        // be blocked. Acceptable: the IP floor is the security boundary.
        console.warn('[exp_009][rate-limiter] cookie rollback failed after IP block:', rollbackErr);
      }
      return { allowed: false, retryAfterSeconds: ipResult.retryAfterSeconds, layer: 'ip' };
    }

    // Both layers passed.
    return { allowed: true };
  } catch (err: unknown) {
    console.error('[exp_009][rate-limiter] checkExp009RateLimit error:', err);
    // Fail closed — conservative window so the client shows a full countdown.
    return { allowed: false, retryAfterSeconds: COOKIE_WINDOW_SECONDS, layer: 'cookie' };
  }
}
