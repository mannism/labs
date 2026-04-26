/**
 * GET /api/experiments/exp_009/results?runId=<runId>
 *
 * Server-Sent Events stream delivering TaskResult objects as they complete.
 *
 * Query params:
 *   runId  (required) — UUID returned by POST /run
 *
 * SSE event types:
 *   event: task_result  data: TaskResult JSON
 *   event: done         data: { runId, totalResults }
 *   event: error        data: { message }
 *
 * Heartbeat:
 *   A comment line (": heartbeat") is sent every 15 seconds to keep the
 *   connection alive through proxies and load balancers.
 *
 * Reconnection:
 *   Each task_result event carries an id: field equal to the 0-based result
 *   index. On reconnect, the client may send Last-Event-ID; the route resumes
 *   from that cursor so no results are lost.
 *
 * Responses:
 *   200  text/event-stream — connected, events will follow
 *   400  application/json  — missing or invalid runId
 *   404  application/json  — runId not found
 *   500  application/json  — unexpected error before stream starts
 *
 * Design:
 *   - Polls the store every POLL_INTERVAL_MS. Polling is simple and avoids the
 *     complexity of pub/sub across the Next.js request isolation model.
 *   - Times out after STREAM_TIMEOUT_MS to prevent zombie connections.
 *   - Never exposes stack traces or internal key names in error events.
 */

import { NextRequest } from 'next/server';
import { pollResults, runExists } from '../../../../../lib/experiments/exp_009/store';
import type { SseTaskResultEvent, SseDoneEvent, SseErrorEvent } from '../../../../../lib/experiments/exp_009/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often to poll the store for new results, in milliseconds. */
const POLL_INTERVAL_MS = 500;

/** Heartbeat interval — keeps the TCP connection alive. */
const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Maximum stream duration before closing. Protects against zombie connections.
 * 10 minutes matches the brief's full-suite timeout.
 */
const STREAM_TIMEOUT_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// SSE formatting helpers
// ---------------------------------------------------------------------------

function sseEvent(eventName: string, data: unknown, id?: number): string {
  const idLine = id !== undefined ? `id: ${id}\n` : '';
  return `${idLine}event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseHeartbeat(): string {
  return ': heartbeat\n\n';
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<Response> {
  // ── Validate query params ───────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId || runId.trim() === '') {
    return new Response(JSON.stringify({ error: 'runId query parameter is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Check run exists ────────────────────────────────────────────────────
  let exists: boolean;
  try {
    exists = await runExists(runId);
  } catch (err: unknown) {
    console.error(`[exp_009][results] runExists error for ${runId}:`, err);
    return new Response(JSON.stringify({ error: 'Unable to verify run. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!exists) {
    return new Response(JSON.stringify({ error: `Run not found: ${runId}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Resolve cursor from Last-Event-ID ───────────────────────────────────
  // The id field in each task_result event is the 0-based result index.
  // On reconnect, Last-Event-ID contains the last received index; resume from +1.
  const lastEventId = req.headers.get('last-event-id');
  const initialCursor = lastEventId ? parseInt(lastEventId, 10) + 1 : 0;

  // ── Build SSE stream ────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let cursor = initialCursor;
      let totalEmitted = 0;
      const startedAt = Date.now();

      // Heartbeat timer — runs independently of the poll loop.
      const heartbeatTimer = setInterval(() => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(sseHeartbeat()));
          } catch {
            // Controller may be closed — ignore.
          }
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Poll loop.
      const poll = async (): Promise<void> => {
        if (isClosed) return;

        // Timeout guard.
        if (Date.now() - startedAt > STREAM_TIMEOUT_MS) {
          console.warn(`[exp_009][results] stream timeout for run=${runId}`);
          const errorEvent: SseErrorEvent = {
            type: 'error',
            message: 'Stream timed out. The run may still be in progress.',
          };
          try {
            controller.enqueue(encoder.encode(sseEvent('error', errorEvent)));
            controller.close();
          } catch {
            // Already closed.
          }
          isClosed = true;
          clearInterval(heartbeatTimer);
          return;
        }

        let pollData: Awaited<ReturnType<typeof pollResults>>;
        try {
          pollData = await pollResults(runId, cursor);
        } catch (err: unknown) {
          console.error(`[exp_009][results] poll error for run=${runId}:`, err);
          // Don't close the stream on a transient poll error — retry next cycle.
          setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }

        const { results, done } = pollData;

        // Emit any new results.
        for (const result of results) {
          if (isClosed) break;
          const event: SseTaskResultEvent = { type: 'task_result', data: result };
          try {
            controller.enqueue(encoder.encode(sseEvent('task_result', event, cursor)));
          } catch {
            isClosed = true;
            break;
          }
          cursor++;
          totalEmitted++;
        }

        // Emit done event and close stream when the orchestrator is finished.
        if (done && !isClosed) {
          const doneEvent: SseDoneEvent = {
            type: 'done',
            runId,
            totalResults: totalEmitted,
          };
          try {
            controller.enqueue(encoder.encode(sseEvent('done', doneEvent)));
            controller.close();
          } catch {
            // Already closed.
          }
          isClosed = true;
          clearInterval(heartbeatTimer);
          return;
        }

        // Schedule next poll if not done.
        if (!isClosed) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      };

      // Start polling.
      poll().catch((err: unknown) => {
        console.error(`[exp_009][results] unhandled poll error for run=${runId}:`, err);
        clearInterval(heartbeatTimer);
        isClosed = true;
      });
    },

    cancel() {
      // Client disconnected.
      isClosed = true;
      console.log(`[exp_009][results] client disconnected from run=${runId}`);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable Vercel/Next.js response buffering so events arrive immediately.
      'X-Accel-Buffering': 'no',
    },
  });
}
