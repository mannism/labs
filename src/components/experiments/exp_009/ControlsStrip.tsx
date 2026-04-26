"use client";

/**
 * ControlsStrip — sticky control bar above the benchmark grid.
 *
 * Contains:
 *   1. RUN SUITE button — chartreuse fill, dark text, disabled while running.
 *   2. Status badge — pulsing dot + state text (hidden pre-run).
 *   3. Task counter + elapsed timer (hidden pre-run).
 *   4. Error message (shown when status === "error").
 *
 * Design pattern: interactive controls live inside the dark canvas area.
 * The top input-type pill in ExperimentDetail is a passive descriptive tag only.
 *
 * The strip is sticky (z-index: 30, below navbar at z-40) with glass blur.
 * Elapsed timer uses setInterval updated every second by the parent Dashboard.
 * borderBottom is hidden in idle state to prevent a visible divider line when
 * the strip shows only the run button and nothing else.
 */

import type { StreamStatus } from "@/hooks/useExp009Stream";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlsStripProps {
  /** Current SSE stream status — drives badge copy and counter visibility. */
  status: StreamStatus;
  /** True while the POST /run fetch is in-flight (before SSE connects). */
  isStarting: boolean;
  /** Total tasks in the suite (shown in counter). */
  totalTasks: number;
  /** Elapsed seconds since the run started (shown in counter). */
  elapsedSeconds: number;
  /** Called when the user clicks RUN SUITE. */
  onRunClick: () => void;
  /** Non-null when status === "error". */
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format elapsed seconds as MM:SS */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Determines whether the run button should be disabled. */
function isRunDisabled(status: StreamStatus, isStarting: boolean): boolean {
  return isStarting || status === "connecting" || status === "streaming";
}

// ─── Status badge config ──────────────────────────────────────────────────────

interface StatusConfig {
  dotColour: string;
  text: string;
  pulsing: boolean;
}

function getStatusConfig(status: StreamStatus): StatusConfig | null {
  if (status === "idle") return null;
  if (status === "connecting" || status === "streaming") {
    return { dotColour: "#22C55E", text: "RUNNING", pulsing: true };
  }
  if (status === "done") {
    return { dotColour: "#10A37F", text: "COMPLETE", pulsing: false };
  }
  if (status === "error") {
    return { dotColour: "#EF4444", text: "ERROR", pulsing: false };
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ControlsStrip({
  status,
  isStarting,
  totalTasks,
  elapsedSeconds,
  onRunClick,
  error,
}: ControlsStripProps) {
  const statusConfig = getStatusConfig(status);
  const showCounter =
    status === "connecting" ||
    status === "streaming" ||
    status === "done" ||
    status === "error";
  const disabled = isRunDisabled(status, isStarting);

  return (
    <div
      role="region"
      aria-label="Run controls and status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--exp-glass-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        // Only show divider after a run has started — avoids a phantom line in idle state.
        borderBottom: status !== "idle" ? "1px solid var(--exp-glass-border)" : "none",
        padding: "var(--v2-space-lg) 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--v2-space-md)",
        flexWrap: "wrap",
      }}
    >
      {/* ── Left group: run button + status badge ────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--v2-space-md)",
          flexWrap: "wrap",
        }}
      >
        {/* RUN SUITE button — chartreuse fill, near-black text */}
        <button
          type="button"
          onClick={onRunClick}
          disabled={disabled}
          aria-label={disabled ? "Run in progress" : "Run benchmark suite"}
          style={{
            background: "var(--v2-accent)",
            color: "var(--v2-text-primary)",
            fontFamily: "var(--v2-font-display)",
            fontWeight: 600,
            fontSize: "var(--v2-font-size-xs)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
            border: "none",
            borderRadius: "4px",
            padding: "0.5rem 1.25rem",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            transition: "opacity 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(200,255,0,0.3)";
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            (e.currentTarget as HTMLButtonElement).style.opacity = disabled ? "0.6" : "1";
          }}
        >
          {disabled ? "RUNNING…" : "RUN SUITE"}
        </button>

        {/* Status badge — hidden pre-run */}
        {statusConfig && (
          <div
            role="status"
            aria-live="polite"
            aria-label={`Run status: ${statusConfig.text}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--v2-space-xs)",
            }}
          >
            {/* Indicator dot */}
            <span
              aria-hidden="true"
              className={statusConfig.pulsing ? "animate-pulse-dot" : ""}
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: statusConfig.dotColour,
                flexShrink: 0,
              }}
            />
            {/* Status text */}
            <span
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--exp-glass-text)",
                letterSpacing: "var(--v2-letter-spacing-wide)",
                textTransform: "uppercase",
              }}
            >
              {statusConfig.text}
            </span>
          </div>
        )}
      </div>

      {/* ── Right group: task counter + elapsed time ──────────── */}
      {showCounter && (
        <div
          aria-label={`${totalTasks} tasks, elapsed time ${formatElapsed(elapsedSeconds)}`}
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text)",
            padding: "0.5rem 1rem",
            background: "rgba(26, 29, 35, 0.6)",
            border: "1px solid var(--exp-glass-border)",
            borderRadius: "4px",
          }}
        >
          {totalTasks > 0 ? `${totalTasks} Tasks` : "Tasks"} • Elapsed:{" "}
          <span style={{ fontWeight: 600 }}>{formatElapsed(elapsedSeconds)}</span>
        </div>
      )}

      {/* ── Error message (inline, beneath status) ────────────── */}
      {status === "error" && error && (
        <p
          role="alert"
          style={{
            width: "100%",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "#EF4444",
            margin: 0,
            paddingTop: "var(--v2-space-xs)",
          }}
        >
          Stream error: {error}
        </p>
      )}
    </div>
  );
}
