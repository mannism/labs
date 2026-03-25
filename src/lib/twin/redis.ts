/**
 * Redis client singleton for the Digital Twin chat engine.
 *
 * Node.js module-level caching guarantees exactly one IORedis instance per
 * process — no connection churn across Route Handler invocations.
 *
 * Design choices:
 *   - enableOfflineQueue: true (default) — commands queue during the initial async
 *     connection window and during brief reconnects, rather than throwing.
 *     `enableOfflineQueue: false` was causing "Stream isn't writeable" errors on
 *     the first request because ioredis connects asynchronously; the client object
 *     exists before the TCP handshake completes.
 *   - maxRetriesPerRequest: 1 — commands retry once on a dropped connection, then
 *     fail with an error caught by memory.ts's try-catch wrappers.
 *   - lazyConnect: false — initiates the TCP connection at module load so it is
 *     ready (or has failed visibly) before the first request arrives.
 */

import Redis from "ioredis";
import { REDIS_URL } from "./config";

let _client: Redis | null = null;

function createClient(): Redis | null {
    try {
        const client = new Redis(REDIS_URL, {
            lazyConnect:          false,
            maxRetriesPerRequest: 1,
        });
        client.on("error", (err: Error) => {
            console.error("[twin/redis] connection error:", err.message);
        });
        return client;
    } catch (err) {
        console.error("[twin/redis] failed to initialize:", err);
        return null;
    }
}

export function getRedisClient(): Redis | null {
    if (!_client) {
        _client = createClient();
    }
    return _client;
}
