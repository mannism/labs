/**
 * Redis client singleton for the Digital Twin chat engine.
 *
 * Node.js module-level caching guarantees exactly one IORedis instance per
 * process — no connection churn across Route Handler invocations.
 *
 * Design choices:
 *   - enableOfflineQueue: false  → fail fast when Redis is down, matching the
 *     Python backend's redis.ping() guard that aborts on unavailability.
 *   - lazyConnect: false         → connect immediately so errors surface at
 *     startup rather than on the first request.
 */

import Redis from "ioredis";
import { REDIS_URL } from "./config";

let _client: Redis | null = null;

function createClient(): Redis | null {
    try {
        const client = new Redis(REDIS_URL, {
            lazyConnect: false,
            enableOfflineQueue: false,
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
