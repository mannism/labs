/**
 * EXP_009 — IP-based rate limiter for the /run endpoint.
 *
 * Uses a Redis sorted-set sliding window, namespaced under exp009:ratelimit:*
 * to avoid coupling to the twin's keyspace.
 *
 * Design:
 *   - 10 requests per IP per 60 seconds (configurable via constants below).
 *   - Fails CLOSED — if Redis is unavailable, the request is blocked.
 *     This is intentional: an experiment endpoint that can trigger N×M
 *     provider API calls should never be unguarded.
 *   - Each call uses a pipeline (ZREMRANGEBYSCORE + ZCARD) to read the
 *     current count atomically before deciding whether to admit or block.
 *   - On admit, ZADD records the timestamp and EXPIRE refreshes the window TTL.
 */

import { getRedisClient } from '../../twin/redis';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of /run requests per IP within the window. */
const RATE_LIMIT_MAX = 10;

/** Sliding-window size in seconds. */
const RATE_LIMIT_WINDOW_SECONDS = 60;

/** Redis key namespace — must not overlap with twin's keyspace. */
const KEY_PREFIX = 'exp009:ratelimit';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the given IP address is within the rate limit.
 *
 * Returns true  → request is allowed (counter incremented).
 * Returns false → request is blocked (429 should be returned to caller).
 *
 * Fails closed: Redis error or absence → blocked.
 */
export async function checkExp009RateLimit(ip: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    console.warn('[exp_009][rate-limiter] Redis unavailable — blocking request (fail-closed)');
    return false;
  }

  const now = Date.now() / 1000; // seconds
  const windowStart = now - RATE_LIMIT_WINDOW_SECONDS;
  const key = `${KEY_PREFIX}:${ip}`;

  try {
    // Pipeline: prune expired entries + read current count atomically.
    const pipe = client.pipeline();
    pipe.zremrangebyscore(key, '-inf', windowStart.toString());
    pipe.zcard(key);
    const results = await pipe.exec();

    const count = (results?.[1]?.[1] as number) ?? 0;
    if (count >= RATE_LIMIT_MAX) {
      return false; // Blocked
    }

    // Admitted — record this request and refresh the TTL.
    await client.zadd(key, now, String(now));
    await client.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    return true;
  } catch (err: unknown) {
    console.error('[exp_009][rate-limiter] checkExp009RateLimit error:', err);
    return false; // Fail closed
  }
}
