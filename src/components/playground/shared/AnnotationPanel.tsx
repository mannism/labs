"use client";

/**
 * AnnotationPanel — side panel that streams a Claude architectural annotation
 * for a selected topology element (node or edge).
 *
 * States:
 *   idle      — no element selected; shows a prompt to click a node
 *   loading   — first tokens not yet received; shows a spinner
 *   streaming — tokens arriving; renders partial text progressively
 *   complete  — full response received; static display
 *   error     — SSE error event or fetch failure; shows safe message
 *
 * The panel renders as a fixed right-side overlay on the canvas container.
 * On small viewports (<640px) it transitions to a bottom sheet.
 *
 * Accessibility:
 *   - aria-live="polite" on content area so screen readers announce streaming text
 *   - aria-busy on loading state
 *   - Close button with clear aria-label
 *
 * Used in: EXP_007 (ADK Visualizer), EXP_008 (Orchestration Map)
 */

import { useEffect, useRef } from "react";
import type { AnnotationState } from "@/hooks/useAnnotationStream";

interface AnnotationPanelProps {
  /** Current annotation state from useAnnotationStream. */
  state: AnnotationState;
  /** Label of the currently selected element, shown in panel header. */
  selectedLabel: string | null;
  /** Callback to clear selection and close panel. */
  onClose: () => void;
}

export function AnnotationPanel({ state, selectedLabel, onClose }: AnnotationPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  /** Keep scroll at bottom while tokens stream in. */
  useEffect(() => {
    if (contentRef.current && state.status === "streaming") {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.text, state.status]);

  const isVisible = selectedLabel !== null;

  return (
    <div
      role="complementary"
      aria-label="Claude annotation panel"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "clamp(260px, 28%, 320px)",
        height: "100%",
        background: "rgba(20, 22, 28, 0.96)",
        backdropFilter: "blur(12px)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.07)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        transition: "transform 0.2s ease, opacity 0.2s ease",
        transform: isVisible ? "translateX(0)" : "translateX(100%)",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        // Bottom sheet on narrow viewports handled via inline media override below
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "8px",
              letterSpacing: "0.18em",
              color: "var(--v2-accent)",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            CLAUDE · ANNOTATION
          </p>
          {selectedLabel && (
            <p
              style={{
                fontFamily: "var(--v2-font-display)",
                fontSize: "12px",
                fontWeight: 600,
                color: "#F0F2F5",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {selectedLabel}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close annotation panel"
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "3px",
            color: "rgba(240, 242, 245, 0.5)",
            cursor: "pointer",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "10px",
            padding: "3px 7px",
            lineHeight: 1,
            transition: "border-color 0.15s ease, color 0.15s ease",
            minWidth: 44,
            minHeight: 28,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            e.currentTarget.style.color = "#F0F2F5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "rgba(240, 242, 245, 0.5)";
          }}
        >
          ✕
        </button>
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        aria-live="polite"
        aria-busy={state.status === "loading" || state.status === "streaming"}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {/* Loading — spinner while waiting for first token */}
        {state.status === "loading" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid rgba(200, 255, 0, 0.3)",
                borderTopColor: "var(--v2-accent)",
                animation: "annotation-spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "10px",
                color: "var(--exp-glass-text-muted)",
                margin: 0,
                letterSpacing: "0.08em",
              }}
            >
              Analysing...
            </p>
          </div>
        )}

        {/* Streaming + complete — render progressive text */}
        {(state.status === "streaming" || state.status === "complete") && state.text && (
          <p
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "12px",
              color: "#D1D5DB",
              lineHeight: 1.7,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {state.text}
            {/* Blinking cursor while streaming */}
            {state.status === "streaming" && (
              <span
                aria-hidden="true"
                style={{ animation: "annotation-blink 1s step-end infinite" }}
              >
                ▌
              </span>
            )}
          </p>
        )}

        {/* Error state */}
        {state.status === "error" && (
          <div
            role="alert"
            style={{
              background: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "10px",
                color: "#F87171",
                margin: "0 0 4px 0",
                letterSpacing: "0.06em",
              }}
            >
              ANNOTATION FAILED
            </p>
            <p
              style={{
                fontFamily: "var(--v2-font-body)",
                fontSize: "11px",
                color: "rgba(248, 113, 113, 0.8)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {state.errorMessage ?? "Unable to generate annotation. Please try again."}
            </p>
          </div>
        )}

        {/* Idle — no selection */}
        {state.status === "idle" && !selectedLabel && (
          <p
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "12px",
              color: "var(--exp-glass-text-muted)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Click any node or edge to get a Claude annotation explaining the
            architectural role of that element.
          </p>
        )}
      </div>

      {/* Footer — model attribution */}
      {(state.status === "complete" || state.status === "streaming") && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "8px",
              color: "rgba(136, 145, 164, 0.5)",
              margin: 0,
              letterSpacing: "0.1em",
            }}
          >
            claude haiku · 3 sentences
          </p>
        </div>
      )}

      {/* Keyframe animations — scoped inline */}
      <style>{`
        @keyframes annotation-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: no-preference) {
          @keyframes annotation-blink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes annotation-blink {
            0%, 100% { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
