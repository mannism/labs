"use client";

/**
 * useExp009Stream — SSE client hook for the EXP_009 reliability benchmark stream.
 *
 * Subscribes to GET /api/experiments/exp_009/results?runId={runId} using the
 * Fetch API (not EventSource) so we can set custom headers and handle
 * reconnect via Last-Event-ID cleanly.
 *
 * Emitted SSE event types (matching types.ts):
 *   task_result  — a single TaskResult arrives; appended to `results`
 *   done         — all tasks complete; status → "done"
 *   error        — fatal run error; status → "error"
 *
 * The hook cleans up (aborts fetch) on unmount or when runId changes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskResult } from "@/lib/experiments/exp_009/types";

// ─── Public types ─────────────────────────────────────────────────────────────

export type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error";

export interface UseExp009StreamReturn {
  /** All TaskResult events received so far, in arrival order. */
  results: TaskResult[];
  status: StreamStatus;
  /** Non-null when status === "error". */
  error: string | null;
  /** Total results count from the done event (0 until the run completes). */
  totalResults: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to the SSE results stream for a given runId.
 * Pass null to stay idle (pre-run state).
 */
export function useExp009Stream(runId: string | null): UseExp009StreamReturn {
  const [results, setResults] = useState<TaskResult[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);

  /** Tracks the last event ID for resumable SSE connections. */
  const lastEventIdRef = useRef<string>("");
  /** Abort controller for the current stream fetch. */
  const abortRef = useRef<AbortController | null>(null);

  /** Parse and dispatch SSE frames from a readable stream. */
  const consumeStream = useCallback(
    async (body: ReadableStream<Uint8Array>, signal: AbortSignal) => {
      // Use a raw Uint8Array reader + manual TextDecoder to avoid the DOM lib
      // variance error with TextDecoderStream on strict TS targets.
      const rawReader = body.getReader();
      const decoder = new TextDecoder();
      const reader = {
        async read(): Promise<{ value: string; done: false } | { value: undefined; done: true }> {
          const { value, done } = await rawReader.read();
          if (done) return { value: undefined, done: true };
          return { value: decoder.decode(value, { stream: true }), done: false };
        },
        cancel() {
          return rawReader.cancel();
        },
      };

      let buffer = "";

      while (true) {
        if (signal.aborted) {
          reader.cancel();
          return;
        }

        const { value, done } = await reader.read();

        if (done) {
          // Server closed connection without a `done` event — treat as complete.
          setStatus("done");
          return;
        }

        buffer += value;

        // SSE events are separated by double newlines.
        const frames = buffer.split(/\n\n/);
        // Keep the trailing incomplete chunk in the buffer.
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const lines = frame.split("\n");

          let eventType = "message";
          let dataPayload = "";
          let eventId = "";

          for (const line of lines) {
            if (line.startsWith("id:")) {
              eventId = line.slice(3).trim();
            } else if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataPayload = line.slice(5).trim();
            }
          }

          // Track last event ID for potential reconnect.
          if (eventId) lastEventIdRef.current = eventId;

          if (!dataPayload) continue;

          let parsed: unknown;
          try {
            parsed = JSON.parse(dataPayload);
          } catch {
            // Malformed JSON frame — skip, do not crash.
            continue;
          }

          if (eventType === "task_result") {
            // SSE payload shape is { type: 'task_result', data: TaskResult }.
            const payload = parsed as { type: "task_result"; data: TaskResult };
            setResults((prev) => [...prev, payload.data]);
          } else if (eventType === "done") {
            const doneData = parsed as { runId: string; totalResults: number };
            setTotalResults(doneData.totalResults ?? 0);
            setStatus("done");
            reader.cancel();
            return;
          } else if (eventType === "error") {
            const errorData = parsed as { message: string };
            setError(errorData.message ?? "Unknown stream error");
            setStatus("error");
            reader.cancel();
            return;
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!runId) {
      // Reset to idle when runId is cleared.
      setResults([]);
      setStatus("idle");
      setError(null);
      setTotalResults(0);
      lastEventIdRef.current = "";
      return;
    }

    // Abort any previous stream.
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setResults([]);
    setError(null);
    setTotalResults(0);
    setStatus("connecting");

    const url = `/api/experiments/exp_009/results?runId=${encodeURIComponent(runId)}`;

    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };

    // Resume support: include Last-Event-ID header if we have one.
    if (lastEventIdRef.current) {
      headers["Last-Event-ID"] = lastEventIdRef.current;
    }

    (async () => {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers,
        });

        if (!response.ok) {
          throw new Error(`SSE stream request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("Response has no readable body");
        }

        setStatus("streaming");
        await consumeStream(response.body, controller.signal);
      } catch (err) {
        // AbortError is intentional (unmount / new runId) — do not surface as error.
        if (err instanceof DOMException && err.name === "AbortError") return;

        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
      }
    })();

    return () => {
      controller.abort();
    };
  }, [runId, consumeStream]);

  return { results, status, error, totalResults };
}
