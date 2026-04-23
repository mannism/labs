"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineEvent } from "@/types/brandPipeline";

/**
 * useEventStream — generic SSE client hook for pipeline event streams.
 *
 * Connects to a server-sent events endpoint and parses each `data:` frame
 * as JSON. Designed for one-shot pipeline streams that have a defined terminal
 * event (pipeline_done or pipeline_error) — no auto-reconnect.
 *
 * Usage:
 *   const { events, status, error, connect } = useEventStream();
 *   connect("/api/experiments/brand-pipeline/stream/abc123");
 *
 * Cleanup: AbortController cancels the fetch on component unmount or when
 * connect() is called again before the previous stream has ended.
 */

export type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error";

export interface UseEventStreamReturn {
  events: PipelineEvent[];
  status: StreamStatus;
  error: string | null;
  /** Begin streaming from the given URL. Safe to call multiple times — cancels any existing stream first. */
  connect: (url: string) => void;
  /** Reset all state back to idle without starting a new stream. */
  reset: () => void;
}

export function useEventStream(): UseEventStreamReturn {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /** Holds the AbortController for the current stream. */
  const abortRef = useRef<AbortController | null>(null);

  /** Abort any existing stream. */
  const abortExisting = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortExisting();
    setEvents([]);
    setStatus("idle");
    setError(null);
  }, [abortExisting]);

  const connect = useCallback(
    (url: string) => {
      // Cancel any in-flight stream before starting a new one.
      abortExisting();

      const controller = new AbortController();
      abortRef.current = controller;

      setEvents([]);
      setError(null);
      setStatus("connecting");

      (async () => {
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: "text/event-stream" },
          });

          if (!response.ok) {
            throw new Error(`Stream request failed: ${response.status}`);
          }

          if (!response.body) {
            throw new Error("Response has no readable body");
          }

          setStatus("streaming");

          const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .getReader();

          /**
           * SSE frames arrive as text lines. We buffer across chunks because a
           * single read() call may contain partial frames or multiple frames.
           * Format per spec:
           *   data: <json>\n\n
           */
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();

            if (done) {
              // Stream closed by server without a pipeline_done — treat as done.
              setStatus("done");
              break;
            }

            buffer += value;

            // Split on double-newline (SSE event separator).
            const frames = buffer.split(/\n\n/);
            // Keep the last (potentially incomplete) chunk in the buffer.
            buffer = frames.pop() ?? "";

            for (const frame of frames) {
              const dataLine = frame
                .split("\n")
                .find((line) => line.startsWith("data:"));

              if (!dataLine) continue;

              const json = dataLine.slice("data:".length).trim();
              if (!json) continue;

              let parsed: PipelineEvent;
              try {
                parsed = JSON.parse(json) as PipelineEvent;
              } catch {
                // Malformed frame — skip and continue.
                continue;
              }

              setEvents((prev) => [...prev, parsed]);

              // Terminal events — close the reader and update status.
              if (parsed.type === "pipeline_done") {
                reader.cancel();
                setStatus("done");
                return;
              }

              if (parsed.type === "pipeline_error") {
                reader.cancel();
                setError(parsed.error);
                setStatus("error");
                return;
              }
            }
          }
        } catch (err) {
          // Ignore AbortError — that is an intentional cancellation.
          if (err instanceof DOMException && err.name === "AbortError") return;

          const message =
            err instanceof Error ? err.message : "Unknown stream error";
          setError(message);
          setStatus("error");
        }
      })();
    },
    [abortExisting]
  );

  // Cancel stream on unmount.
  useEffect(() => {
    return () => {
      abortExisting();
    };
  }, [abortExisting]);

  return { events, status, error, connect, reset };
}
