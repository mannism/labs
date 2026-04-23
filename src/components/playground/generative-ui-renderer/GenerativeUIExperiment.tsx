/**
 * GenerativeUIExperiment — top-level orchestrator for EXP_006.
 *
 * Manages three visual phases:
 *   1. input   — ChatInput visible, canvas empty
 *   2. render  — ChatInput disabled, blocks appearing progressively
 *   3. done    — ChatInput re-enabled with "Try Again" option, canvas stable
 *
 * Error state displays a message in the canvas area and re-enables the input.
 *
 * State lives entirely in this component via useUIBlockStream — no external
 * state management required.
 */

"use client";

import { useCallback } from "react";
import { useUIBlockStream } from "@/hooks/useUIBlockStream";
import { ChatInput } from "./ChatInput";
import { UICanvas } from "./UICanvas";

export function GenerativeUIExperiment() {
  const { blocks, status, error, theme, submit, reset } = useUIBlockStream();

  const isStreaming = status === "streaming";
  const isDone      = status === "done";
  const isError     = status === "error";
  const hasContent  = blocks.length > 0;

  /** Submit prompt — hook handles AbortController internally. */
  const handleSubmit = useCallback(
    (prompt: string) => {
      submit(prompt);
    },
    [submit]
  );

  /** Reset all state and return to empty input phase. */
  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "clamp(480px, 70vh, 900px)",
        background: "var(--exp-canvas-bg)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "var(--v2-space-xl) var(--v2-space-lg)",
      }}
    >
      {/* Inner layout: max-width container */}
      <div
        style={{
          maxWidth: "760px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--v2-space-xl)",
          flex: 1,
        }}
      >
        {/* Header */}
        <div>
          <p
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text-muted)",
              letterSpacing: "var(--v2-letter-spacing-wide)",
              textTransform: "uppercase",
              margin: "0 0 var(--v2-space-xs) 0",
            }}
          >
            EXP_006 // GENERATIVE UI RENDERER
          </p>
          <p
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "var(--v2-font-size-sm)",
              color: "var(--exp-glass-text-muted)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "600px",
            }}
          >
            Describe a UI layout in plain text. An LLM renders a live component
            tree — blocks appear as they stream.
          </p>
        </div>

        {/* Input area */}
        <div>
          <ChatInput
            onSubmit={handleSubmit}
            disabled={isStreaming}
          />

          {/* Done / error action row */}
          {(isDone || isError) && (
            <div
              style={{
                marginTop: "var(--v2-space-sm)",
                display: "flex",
                alignItems: "center",
                gap: "var(--v2-space-md)",
              }}
            >
              <button
                onClick={handleReset}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--exp-glass-text-muted)",
                  letterSpacing: "var(--v2-letter-spacing-wide)",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--exp-glass-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--exp-glass-text-muted)";
                }}
              >
                Clear &amp; Try Again
              </button>

              {/* Theme indicator — shown when server returned a theme value */}
              {isDone && theme !== undefined && theme !== null && (
                <span
                  aria-label={`Canvas theme: ${theme}`}
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--exp-glass-text-muted)",
                    letterSpacing: "var(--v2-letter-spacing-wide)",
                    textTransform: "uppercase",
                  }}
                >
                  THEME: {theme.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Canvas / state area */}
        <div style={{ flex: 1 }}>
          {/* Streaming / done state — render blocks */}
          {hasContent && (
            <UICanvas blocks={blocks} />
          )}

          {/* Streaming indicator — shown when streaming but no blocks yet */}
          {isStreaming && !hasContent && (
            <div
              role="status"
              aria-label="Generating UI layout"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--v2-space-sm)",
                padding: "var(--v2-space-md) 0",
              }}
            >
              {/* Pulsing dot */}
              <div
                aria-hidden="true"
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--v2-accent)",
                  animation: "gen-ui-pulse 1.2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--exp-glass-text-muted)",
                  letterSpacing: "var(--v2-letter-spacing-wide)",
                  textTransform: "uppercase",
                }}
              >
                GENERATING…
              </span>
            </div>
          )}

          {/* Error state — shown when status === 'error' */}
          {isError && (
            <div
              role="alert"
              style={{
                padding: "var(--v2-space-md)",
                background: "rgba(248,113,113,0.06)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: "2px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "#F87171",
                  letterSpacing: "var(--v2-letter-spacing-wide)",
                  textTransform: "uppercase",
                  margin: "0 0 var(--v2-space-xs) 0",
                }}
              >
                RENDER ERROR
              </p>
              <p
                style={{
                  fontFamily: "var(--v2-font-body)",
                  fontSize: "var(--v2-font-size-sm)",
                  color: "var(--exp-glass-text-muted)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {error ?? "An unexpected error occurred. Please try again."}
              </p>
            </div>
          )}

          {/* Idle empty state — prompt to start */}
          {status === "idle" && (
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--v2-space-3xl) 0",
                gap: "var(--v2-space-sm)",
                opacity: 0.35,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--exp-glass-text-muted)",
                  letterSpacing: "var(--v2-letter-spacing-wide)",
                  textTransform: "uppercase",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                CANVAS EMPTY — DESCRIBE A LAYOUT TO GENERATE
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pulse keyframe animation for the streaming indicator dot.
          Suppressed by prefers-reduced-motion via the media query. */}
      <style>{`
        @keyframes gen-ui-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes gen-ui-pulse {
            0%, 100% { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
