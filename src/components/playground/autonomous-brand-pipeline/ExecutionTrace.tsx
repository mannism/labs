"use client";

import { useEffect, useRef } from "react";
import type { PipelineEvent, PipelineStep } from "@/types/brandPipeline";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/**
 * ExecutionTrace — terminal-style live log for the brand pipeline SSE stream.
 *
 * Inspired by AuditTerminal (EXP_004). Renders events as they arrive:
 *  - step_start:      chartreuse bold label with timestamp
 *  - llm_chunk:       monospace streaming text, appended to the active step
 *  - step_complete:   green tick with timestamp
 *  - pipeline_done:   success banner
 *  - pipeline_error:  red error message (safe string, never raw object)
 *
 * Auto-scrolls to bottom as new events arrive.
 * Accessible: role="log" with aria-live="polite", aria-label, aria-atomic="false".
 * prefers-reduced-motion is honoured — animation on the cursor is suppressed.
 */

interface ExecutionTraceProps {
  events: PipelineEvent[];
  /** Whether the stream is currently active (shows blinking cursor). */
  isStreaming: boolean;
}

/** Human-readable step labels. */
const STEP_LABELS: Record<PipelineStep, string> = {
  generate: "GENERATE VARIANTS",
  evaluate: "EVALUATE VARIANTS",
  rank: "RANK & SELECT",
};

/** Timestamp formatted as HH:MM:SS from a Unix ms timestamp. */
function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Collapse consecutive llm_chunk events for the same step into a single
 * rendered block, preserving the streaming feel by displaying the accumulated
 * text. Returns a minimal render-friendly array.
 */
interface TraceEntry {
  id: string;
  type: "step_start" | "llm_chunk_block" | "step_complete" | "pipeline_done" | "pipeline_error";
  step?: PipelineStep;
  timestamp?: number;
  content?: string;
}

function collapseEvents(events: PipelineEvent[]): TraceEntry[] {
  const entries: TraceEntry[] = [];

  for (const event of events) {
    if (event.type === "llm_chunk") {
      const last = entries[entries.length - 1];
      if (last?.type === "llm_chunk_block" && last.step === event.step) {
        // Accumulate into the existing block.
        last.content = (last.content ?? "") + event.content;
        continue;
      }
      // Start a new chunk block.
      entries.push({
        id: `chunk-${entries.length}`,
        type: "llm_chunk_block",
        step: event.step,
        content: event.content,
      });
    } else if (event.type === "step_start") {
      entries.push({
        id: `start-${event.step}-${event.timestamp}`,
        type: "step_start",
        step: event.step,
        timestamp: event.timestamp,
      });
    } else if (event.type === "step_complete") {
      entries.push({
        id: `complete-${event.step}-${event.timestamp}`,
        type: "step_complete",
        step: event.step,
        timestamp: event.timestamp,
      });
    } else if (event.type === "pipeline_done") {
      entries.push({
        id: `done-${event.timestamp}`,
        type: "pipeline_done",
        timestamp: event.timestamp,
      });
    } else if (event.type === "pipeline_error") {
      entries.push({
        id: `error-${event.timestamp}`,
        type: "pipeline_error",
        step: event.step,
        timestamp: event.timestamp,
        content: event.error,
      });
    }
  }

  return entries;
}

export function ExecutionTrace({ events, isStreaming }: ExecutionTraceProps) {
  const prefersReduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Auto-scroll to bottom whenever events change. */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const entries = collapseEvents(events);

  return (
    <div
      style={{
        width: "100%",
        height: "clamp(360px, 50vh, 640px)",
        background: "var(--exp-canvas-bg)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--v2-font-mono)",
        fontSize: "var(--v2-font-size-xs)",
        border: "1px solid var(--exp-glass-border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
      role="log"
      aria-label="Pipeline execution trace"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Terminal chrome */}
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          flexShrink: 0,
        }}
      >
        {(["#EF4444", "#F59E0B", "#22C55E"] as const).map((color, i) => (
          <span
            key={i}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: color,
              opacity: 0.7,
              display: "inline-block",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "auto",
            color: "#4B5563",
            fontSize: "0.625rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          autonomous-brand-pipeline · execution trace
        </span>
      </div>

      {/* Scrollable output area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {entries.length === 0 && (
          <p
            style={{
              color: "#4B5563",
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              margin: 0,
            }}
          >
            Waiting for pipeline to start...
          </p>
        )}

        {entries.map((entry) => {
          switch (entry.type) {
            case "step_start":
              return (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "12px",
                    marginBottom: "4px",
                    marginTop: "12px",
                  }}
                >
                  {/* Chartreuse accent line */}
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: "3px",
                      height: "14px",
                      background: "var(--v2-accent)",
                      flexShrink: 0,
                      alignSelf: "center",
                    }}
                  />
                  <span
                    style={{
                      color: "var(--v2-accent)",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {entry.step ? STEP_LABELS[entry.step] : "STEP START"}
                  </span>
                  {entry.timestamp !== undefined && (
                    <span style={{ color: "#4B5563", fontSize: "0.625rem", marginLeft: "auto" }}>
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  )}
                </div>
              );

            case "llm_chunk_block":
              return (
                <div
                  key={entry.id}
                  style={{
                    color: "#C9D1D9",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    paddingLeft: "15px",
                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                    margin: "4px 0",
                  }}
                >
                  {entry.content}
                </div>
              );

            case "step_complete":
              return (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                    paddingLeft: "15px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ color: "#22C55E" }}
                  >
                    ✓
                  </span>
                  <span style={{ color: "#22C55E" }}>
                    {entry.step ? STEP_LABELS[entry.step] : "STEP"} complete
                  </span>
                  {entry.timestamp !== undefined && (
                    <span style={{ color: "#4B5563", fontSize: "0.625rem", marginLeft: "auto" }}>
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  )}
                </div>
              );

            case "pipeline_done":
              return (
                <div
                  key={entry.id}
                  style={{
                    marginTop: "16px",
                    padding: "10px 14px",
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span aria-hidden="true" style={{ color: "#22C55E", fontWeight: 700 }}>
                    ✓
                  </span>
                  <span style={{ color: "#22C55E", fontWeight: 600, letterSpacing: "0.06em" }}>
                    PIPELINE COMPLETE
                  </span>
                  {entry.timestamp !== undefined && (
                    <span style={{ color: "#4B5563", fontSize: "0.625rem", marginLeft: "auto" }}>
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  )}
                </div>
              );

            case "pipeline_error":
              return (
                <div
                  key={entry.id}
                  style={{
                    marginTop: "16px",
                    padding: "10px 14px",
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.25)",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: entry.content ? "6px" : 0,
                    }}
                  >
                    <span aria-hidden="true" style={{ color: "#F87171", fontWeight: 700 }}>
                      ✕
                    </span>
                    <span style={{ color: "#F87171", fontWeight: 600, letterSpacing: "0.06em" }}>
                      PIPELINE ERROR
                      {entry.step ? ` — ${STEP_LABELS[entry.step]}` : ""}
                    </span>
                    {entry.timestamp !== undefined && (
                      <span style={{ color: "#4B5563", fontSize: "0.625rem", marginLeft: "auto" }}>
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    )}
                  </div>
                  {entry.content && (
                    <p
                      style={{
                        color: "#FCA5A5",
                        lineHeight: 1.6,
                        margin: 0,
                        paddingLeft: "20px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {entry.content}
                    </p>
                  )}
                </div>
              );

            default:
              return null;
          }
        })}

        {/* Blinking cursor while streaming */}
        {isStreaming && !prefersReduced && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "7px",
              height: "13px",
              background: "var(--v2-accent)",
              verticalAlign: "text-bottom",
              animation: "trace-blink 1s step-end infinite",
              marginLeft: "4px",
            }}
          />
        )}
      </div>

      {/* Cursor blink keyframe — self-contained, no globals.css modification needed */}
      <style>{`
        @keyframes trace-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="trace-blink"] { animation: none !important; display: none; }
        }
      `}</style>
    </div>
  );
}
