"use client";

/**
 * useUIBlockStream — SSE client hook for EXP_006 Generative UI Renderer.
 *
 * POSTs a prompt to /api/experiments/generative-ui/render and consumes the
 * server-sent event stream. Each `block` event appends a new UIBlock to the
 * blocks array for progressive rendering. Terminal events `canvas_done` and
 * `canvas_error` update status and close the stream.
 *
 * Design decisions:
 *   - One-shot, no auto-reconnect — the API is generative, not persistent.
 *   - AbortController cleans up on unmount and on each new submit() call.
 *   - submit() is safe to call while streaming — cancels the prior request first.
 *   - Uses fetch() + ReadableStream rather than EventSource because the route
 *     requires a POST body (EventSource only supports GET).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIBlock, UICanvasSSEEvent } from "@/lib/schemas/uiBlocks";
import type { UICanvas } from "@/lib/schemas/uiBlocks";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type UIBlockStreamStatus = "idle" | "streaming" | "done" | "error";

export interface UseUIBlockStreamReturn {
  /** Blocks received so far — grows progressively during streaming. */
  blocks: UIBlock[];
  /** Current lifecycle status of the stream. */
  status: UIBlockStreamStatus;
  /** Safe error message — populated when status === 'error'. */
  error: string | null;
  /** Theme from canvas_done event — null until the stream completes. */
  theme: UICanvas["theme"] | null;
  /** Submit a new prompt — cancels any active stream first. */
  submit: (prompt: string) => void;
  /** Reset all state back to idle without starting a new stream. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const RENDER_ENDPOINT = "/api/experiments/generative-ui/render";

export function useUIBlockStream(): UseUIBlockStreamReturn {
  const [blocks, setBlocks] = useState<UIBlock[]>([]);
  const [status, setStatus] = useState<UIBlockStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<UICanvas["theme"] | null>(null);

  /** Ref to the active AbortController so we can cancel on re-submit or unmount. */
  const abortRef = useRef<AbortController | null>(null);

  /** Cancel the current stream if one is active. */
  const abortExisting = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortExisting();
    setBlocks([]);
    setStatus("idle");
    setError(null);
    setTheme(null);
  }, [abortExisting]);

  const submit = useCallback(
    (prompt: string) => {
      // Cancel any prior in-flight request before starting fresh.
      abortExisting();

      const controller = new AbortController();
      abortRef.current = controller;

      // Reset render state immediately.
      setBlocks([]);
      setError(null);
      setTheme(null);
      setStatus("streaming");

      (async () => {
        try {
          const response = await fetch(RENDER_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({ prompt }),
            signal: controller.signal,
          });

          // Non-2xx before stream opened — surface as error.
          if (!response.ok) {
            let message = `Request failed (${response.status})`;
            try {
              const body = (await response.json()) as { error?: string };
              if (typeof body.error === "string") message = body.error;
            } catch {
              // Ignore — use status-code message.
            }
            setError(message);
            setStatus("error");
            return;
          }

          if (!response.body) {
            setError("No response stream received.");
            setStatus("error");
            return;
          }

          // ---------------------------------------------------------------------------
          // Parse the SSE stream frame by frame.
          //
          // Wire format: `data: <JSON>\n\n`
          // Heartbeat comments (`: heartbeat\n\n`) are skipped — they contain no
          // `data:` line so the frame loop naturally ignores them.
          // ---------------------------------------------------------------------------

          const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .getReader();

          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();

            if (done) {
              // Stream closed by server — ensure we're in a terminal state.
              setStatus((prev) => (prev === "streaming" ? "done" : prev));
              break;
            }

            buffer += value;

            // Split on double-newline (SSE event separator).
            const frames = buffer.split(/\n\n/);
            // Last element may be an incomplete frame — keep it in the buffer.
            buffer = frames.pop() ?? "";

            for (const frame of frames) {
              const dataLine = frame
                .split("\n")
                .find((line) => line.startsWith("data:"));

              if (!dataLine) continue; // heartbeat or blank frame

              const json = dataLine.slice("data:".length).trim();
              if (!json) continue;

              let parsed: UICanvasSSEEvent;
              try {
                parsed = JSON.parse(json) as UICanvasSSEEvent;
              } catch {
                // Malformed frame — skip and continue.
                continue;
              }

              switch (parsed.type) {
                case "block":
                  // Append new block — functional update avoids stale closure.
                  setBlocks((prev) => [...prev, parsed.block]);
                  break;

                case "canvas_done":
                  // Capture optional theme before transitioning to done.
                  if (parsed.theme !== undefined) {
                    setTheme(parsed.theme);
                  }
                  reader.cancel();
                  setStatus("done");
                  return;

                case "canvas_error":
                  // Treat as non-fatal inline error — status stays streaming
                  // so partial blocks already rendered remain visible.
                  // If this is the first event (no blocks yet), flip to error.
                  setBlocks((prev) => {
                    if (prev.length === 0) {
                      setError(parsed.message);
                      setStatus("error");
                    }
                    return prev;
                  });
                  break;
              }
            }
          }
        } catch (err) {
          // AbortError = intentional cancellation (unmount or re-submit) — ignore.
          if (err instanceof DOMException && err.name === "AbortError") return;

          console.error("[useUIBlockStream] fetch error:", err);
          setError("Connection failed. Please try again.");
          setStatus("error");
        }
      })();
    },
    [abortExisting]
  );

  // Cancel stream on component unmount.
  useEffect(() => {
    return () => {
      abortExisting();
    };
  }, [abortExisting]);

  return { blocks, status, error, theme, submit, reset };
}
