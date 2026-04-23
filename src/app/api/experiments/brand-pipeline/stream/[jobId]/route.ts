/**
 * GET /api/experiments/brand-pipeline/stream/[jobId]
 *
 * SSE endpoint that streams brand pipeline events to the client.
 *
 * Protocol:
 *   1. Validates jobId format (must be a non-empty string).
 *   2. Subscribes to Redis pub/sub channel `brand-pipeline:<jobId>`.
 *   3. Forwards each message as an SSE `data:` frame.
 *   4. Closes the stream when a `pipeline_done` or `pipeline_error` event
 *      arrives — these are terminal events.
 *   5. Sends a heartbeat comment (`:\n\n`) every 25 s to keep the
 *      connection alive through proxies and load balancers that close idle
 *      connections (default timeout is typically 30 s).
 *
 * Client disconnect handling:
 *   When the client closes the connection, the AbortSignal fires and the
 *   cleanup function unsubscribes from the Redis channel and disconnects the
 *   subscriber client to avoid connection leaks.
 *
 * Redis subscriber isolation:
 *   Each SSE request creates a dedicated ioredis client in subscribe mode.
 *   A client in subscribe mode can only issue subscribe/unsubscribe/psubscribe
 *   commands, so it cannot be shared with the queue or worker connections.
 *   The client is disconnected on stream close.
 *
 * Failure modes:
 *   - Redis connection failure: stream opens and immediately closes with a
 *     pipeline_error event (fail-closed — client receives actionable error).
 *   - Malformed message from pub/sub: logged and skipped, stream stays open.
 *   - Job never completes: client should enforce a frontend timeout and
 *     abort the connection. The heartbeat keeps the connection alive until then.
 */

import { NextRequest }  from "next/server";
import Redis            from "ioredis";
import type { PipelineEvent } from "@/types/brandPipeline";

// SSE frame helpers
function sseData(payload: PipelineEvent): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
}

// Heartbeat comment — keeps proxies from closing idle connections
const SSE_HEARTBEAT = ": heartbeat\n\n";
const HEARTBEAT_INTERVAL_MS = 25_000;

function createSubscriberConnection(): Redis {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    const client = new Redis(url, {
        maxRetriesPerRequest: null,
        enableOfflineQueue:   true,
    });
    client.on("error", (err: Error) => {
        console.error("[api/brand-pipeline/stream] Redis subscriber error:", err.message);
    });
    return client;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
    const { jobId } = await params;

    // Validate jobId — must be a non-empty string
    if (!jobId || typeof jobId !== "string" || !jobId.trim()) {
        return Response.json({ error: "jobId is required" }, { status: 400 });
    }

    const channel = `brand-pipeline:${jobId}`;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const subscriber = createSubscriberConnection();
            let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
            let closed = false;

            // Cleanup: unsubscribe and disconnect the Redis subscriber client
            function cleanup(): void {
                if (closed) return;
                closed = true;
                if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
                subscriber.unsubscribe(channel).catch((err: Error) => {
                    console.error("[api/brand-pipeline/stream] unsubscribe error:", err.message);
                });
                subscriber.disconnect();
            }

            // Handle client disconnect via AbortSignal
            req.signal.addEventListener("abort", () => {
                console.log(`[api/brand-pipeline/stream] client disconnected — job: ${jobId}`);
                cleanup();
                try { controller.close(); } catch { /* already closed */ }
            });

            // Heartbeat — fires every 25 s to keep the connection alive
            heartbeatTimer = setInterval(() => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(SSE_HEARTBEAT));
                } catch {
                    // Controller is closed; stop the heartbeat
                    cleanup();
                }
            }, HEARTBEAT_INTERVAL_MS);

            // Subscribe to the job-specific pub/sub channel
            try {
                await subscriber.subscribe(channel);
            } catch (err) {
                console.error(`[api/brand-pipeline/stream] failed to subscribe to channel ${channel}:`, err);
                const errorEvent: PipelineEvent = {
                    type:      "pipeline_error",
                    error:     "Failed to connect to the pipeline stream. Please try again.",
                    timestamp: Date.now(),
                };
                try {
                    controller.enqueue(encoder.encode(sseData(errorEvent)));
                } catch { /* controller may already be closed */ }
                cleanup();
                controller.close();
                return;
            }

            console.log(`[api/brand-pipeline/stream] subscribed to channel: ${channel}`);

            // Forward pub/sub messages as SSE frames
            subscriber.on("message", (_channel: string, message: string) => {
                if (closed) return;

                let event: PipelineEvent;
                try {
                    event = JSON.parse(message) as PipelineEvent;
                } catch (err) {
                    console.error(`[api/brand-pipeline/stream] malformed message on channel ${channel}:`, err);
                    return; // skip malformed messages, keep stream open
                }

                try {
                    controller.enqueue(encoder.encode(sseData(event)));
                } catch {
                    cleanup();
                    return;
                }

                // Close stream on terminal events
                if (event.type === "pipeline_done" || event.type === "pipeline_error") {
                    console.log(
                        `[api/brand-pipeline/stream] terminal event received (${event.type}) — closing stream for job: ${jobId}`
                    );
                    cleanup();
                    try { controller.close(); } catch { /* already closed */ }
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type":      "text/event-stream",
            "Cache-Control":     "no-cache",
            "Connection":        "keep-alive",
            "X-Accel-Buffering": "no",  // Disable Nginx response buffering for SSE
        },
    });
}
