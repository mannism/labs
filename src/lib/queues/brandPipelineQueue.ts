/**
 * BullMQ Queue singleton for EXP_005 — Autonomous Brand Pipeline.
 *
 * Why a separate ioredis connection (not src/lib/twin/redis.ts):
 *   BullMQ manages its own connection lifecycle internally and requires
 *   dedicated connections for Queue, Worker, and QueueEvents. Sharing the
 *   twin's singleton would cause interference — BullMQ blocks the connection
 *   during BRPOPLPUSH and subscribe calls that are incompatible with the
 *   twin's request/response command pattern.
 *
 * Module-level singleton pattern: Next.js caches module exports across
 * invocations in the same process, so this file instantiates exactly one
 * Queue and one QueueEvents instance per server process.
 */

import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import type { BrandPipelineConfig } from "@/types/brandPipeline";

const QUEUE_NAME = "brand-pipeline";

// ---------------------------------------------------------------------------
// Shared Redis connection for Queue and QueueEvents.
// BullMQ does not use blocking commands on Queue/QueueEvents connections,
// so a single shared connection is safe for both.
// ---------------------------------------------------------------------------

function createRedisConnection(): Redis {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    const client = new Redis(url, {
        // BullMQ recommends maxRetriesPerRequest: null for its own connections
        // so it handles retries internally rather than failing fast.
        maxRetriesPerRequest: null,
        enableOfflineQueue:   true,
    });
    client.on("error", (err: Error) => {
        console.error("[queues/brandPipeline] Redis connection error:", err.message);
    });
    return client;
}

// ---------------------------------------------------------------------------
// Queue — used by route handlers to enqueue jobs
// ---------------------------------------------------------------------------

export const brandPipelineQueue = new Queue<BrandPipelineConfig>(QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
        // Remove completed jobs after 1 hour to prevent Redis memory growth
        removeOnComplete: { age: 3600 },
        // Keep failed jobs for 24 hours for post-mortem inspection
        removeOnFail:     { age: 86400 },
        attempts:         1,  // Brand pipelines are user-initiated — no silent retries
    },
});

// ---------------------------------------------------------------------------
// QueueEvents — used by SSE stream route to await job lifecycle events
// (completed, failed, progress) without polling
// ---------------------------------------------------------------------------

export const brandPipelineQueueEvents = new QueueEvents(QUEUE_NAME, {
    connection: createRedisConnection(),
});
