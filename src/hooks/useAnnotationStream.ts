"use client";

/**
 * useAnnotationStream — SSE annotation hook for EXP_007 and EXP_008.
 *
 * POST to /api/experiments/orchestration/annotate, parse the SSE response,
 * and surface progressive state to the caller. An AbortController cancels
 * any in-flight request when a new element is selected, preventing overlapping
 * or out-of-order annotation output.
 *
 * SSE event contract (from Sable's route.ts):
 *   event: chunk   — { text: string }   streaming token text
 *   event: done    — {}                 stream complete
 *   event: error   — { message: string } safe error description
 *
 * Usage:
 *   const { state, annotate, clear } = useAnnotationStream();
 *   annotate({ elementType: 'node', elementData: { label, description, pattern } });
 */

import { useState, useRef, useCallback } from "react";
import type { NodeElementData, EdgeElementData } from "@/lib/prompts/orchestrationAnnotation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discriminated union for annotation panel display state. */
export type AnnotationStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export interface AnnotationState {
  status: AnnotationStatus;
  /** Accumulated response text — grows token by token during streaming. */
  text: string;
  /** Safe error message — only present when status === 'error'. */
  errorMessage: string | null;
}

/** Payload passed to annotate(). Mirrors the API route's request schema. */
export interface AnnotatePayload {
  elementType: "node" | "edge";
  elementData: NodeElementData | EdgeElementData;
  /** Optional topology context for EXP_008. */
  contextPrompt?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const ANNOTATE_ENDPOINT = "/api/experiments/orchestration/annotate";

export function useAnnotationStream() {
  const [state, setState] = useState<AnnotationState>({
    status: "idle",
    text: "",
    errorMessage: null,
  });

  /** Ref to the current AbortController so we can cancel on re-click. */
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancels any in-flight stream and resets state to idle.
   * Call when the user deselects all elements or closes the panel.
   */
  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ status: "idle", text: "", errorMessage: null });
  }, []);

  /**
   * Initiates an annotation request for the given element.
   * Cancels any previous in-flight request before starting a new one.
   */
  const annotate = useCallback(async (payload: AnnotatePayload) => {
    // Abort any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ status: "loading", text: "", errorMessage: null });

    try {
      const res = await fetch(ANNOTATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Non-2xx before SSE stream opened — surface the error body
        let errorMessage = "Annotation failed. Please try again.";
        try {
          const errorBody = await res.json() as { error?: string };
          if (typeof errorBody.error === "string") {
            errorMessage = errorBody.error;
          }
        } catch {
          // Ignore parse failure — use generic message above
        }
        setState({ status: "error", text: "", errorMessage });
        return;
      }

      if (!res.body) {
        setState({
          status: "error",
          text: "",
          errorMessage: "No response stream received.",
        });
        return;
      }

      // ---------------------------------------------------------------------------
      // Parse SSE stream
      // ---------------------------------------------------------------------------

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by double-newlines. Process complete frames.
        const frames = buffer.split("\n\n");
        // Keep the last (possibly incomplete) frame in the buffer
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          if (!frame.trim()) continue;

          // Extract event type and data lines from the frame
          const lines = frame.split("\n");
          let eventType = "message";
          let dataLine = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataLine = line.slice(6).trim();
            }
          }

          if (!dataLine) continue;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(dataLine) as Record<string, unknown>;
          } catch {
            // Malformed data line — skip
            continue;
          }

          switch (eventType) {
            case "chunk": {
              const text = typeof parsed["text"] === "string" ? parsed["text"] : "";
              accumulated += text;
              // Functional update avoids stale closure over accumulated
              setState((prev) => ({
                ...prev,
                status: "streaming",
                text: prev.text + text,
              }));
              break;
            }

            case "done": {
              setState((prev) => ({
                ...prev,
                status: "complete",
              }));
              break;
            }

            case "error": {
              const message =
                typeof parsed["message"] === "string"
                  ? parsed["message"]
                  : "Annotation failed.";
              setState({
                status: "error",
                text: accumulated,
                errorMessage: message,
              });
              break;
            }
          }
        }
      }
    } catch (err) {
      // AbortError = user clicked away — don't show error
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error("[useAnnotationStream] fetch error:", err);
      setState({
        status: "error",
        text: "",
        errorMessage: "Connection failed. Please try again.",
      });
    }
  }, []);

  return { state, annotate, clear };
}
