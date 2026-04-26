"use client";

/**
 * ControlsStrip — sticky control bar above the benchmark grid.
 *
 * Contains:
 *   1. RUN SUITE button — chartreuse fill, dark text, disabled while running or
 *      in cooldown (post-run 3-minute server-enforced window).
 *   2. Status badge — pulsing dot + state text (hidden pre-run).
 *   3. Task counter + elapsed timer (hidden pre-run).
 *   4. Error message (shown when status === "error").
 *
 * Cooldown UX:
 *   After a successful run starts the button enters a 180-second cooldown.
 *   The label changes to "AVAILABLE IN M:SS" and counts down each second.
 *   When the countdown hits 0 the button re-enables and label restores.
 *
 *   Cooldown state is driven by the `cooldownStartedAt` prop (set by Dashboard
 *   on 200 response or on 429). ControlsStrip owns the countdown interval only.
 *
 * Design pattern: interactive controls live inside the dark canvas area.
 * The top input-type pill in ExperimentDetail is a passive descriptive tag only.
 *
 * The strip is sticky (z-index: 30, below navbar at z-40) with glass blur.
 * Elapsed timer uses setInterval updated every second by the parent Dashboard.
 * borderBottom is hidden in idle state to prevent a visible divider line when
 * the strip shows only the run button and nothing else.
 */

import { useEffect, useRef, useState } from "react";
import type { StreamStatus } from "@/hooks/useExp009Stream";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Must match the server-side RATE_LIMIT_WINDOW_SECONDS in rate-limiter.ts */
const COOLDOWN_WINDOW_MS = 180_000;

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
  /**
   * Epoch ms at which the current cooldown window started.
   * Set by Dashboard on 200 (run accepted) or on 429 (rate limit hit).
   * Null means no active cooldown.
   */
  cooldownStartedAt: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format remaining seconds as M:SS (e.g. 2:47) */
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Format elapsed seconds as MM:SS */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Determines whether the run button should be disabled (run in-flight or in cooldown). */
function isRunDisabled(
  status: StreamStatus,
  isStarting: boolean,
  cooldownSecondsLeft: number,
): boolean {
  return isStarting || status === "connecting" || status === "streaming" || cooldownSecondsLeft > 0;
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
  cooldownStartedAt,
}: ControlsStripProps) {
  // ── Cooldown countdown ────────────────────────────────────────────────────
  /**
   * cooldownSecondsLeft is the source of truth for rendering.
   * Updated exclusively from within the setInterval callback (never
   * synchronously in an effect body) to satisfy react-hooks/set-state-in-effect.
   * Date.now() is called only inside the interval callback, not during render,
   * to satisfy react-hooks/purity.
   *
   * The interval is recreated whenever cooldownStartedAt changes (new run or
   * 429 received). The ref tracks the interval ID for cleanup only.
   */
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState<number>(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any stale interval whenever cooldownStartedAt changes.
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    if (cooldownStartedAt === null) {
      // No active cooldown — no interval needed. cooldownSecondsLeft stays at
      // its current value (0 on initial mount; the interval self-clears to 0
      // when the window expires, so no manual reset is needed here).
      return;
    }

    // Start a 1-second ticker. cooldownStartedAt is captured in closure —
    // the effect re-runs if it changes, so the closure is always fresh.
    tickIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - cooldownStartedAt;
      const remaining = Math.ceil((COOLDOWN_WINDOW_MS - elapsed) / 1000);
      const left = remaining > 0 ? remaining : 0;
      setCooldownSecondsLeft(left);
      if (left <= 0 && tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }, 1_000);

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [cooldownStartedAt]);

  const statusConfig = getStatusConfig(status);
  const showCounter =
    status === "connecting" ||
    status === "streaming" ||
    status === "done" ||
    status === "error";
  const disabled = isRunDisabled(status, isStarting, cooldownSecondsLeft);

  // Button label hierarchy: running > cooldown > default
  const buttonLabel = (() => {
    if (isStarting || status === "connecting" || status === "streaming") return "RUNNING\u2026";
    if (cooldownSecondsLeft > 0) return `AVAILABLE IN ${formatCountdown(cooldownSecondsLeft)}`;
    return "RUN SUITE";
  })();

  const ariaLabel = (() => {
    if (isStarting || status === "connecting" || status === "streaming") return "Run in progress";
    if (cooldownSecondsLeft > 0) return `Run available in ${cooldownSecondsLeft} seconds`;
    return "Run benchmark suite";
  })();

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
          aria-label={ariaLabel}
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
            // Min-width prevents layout shift as countdown text changes width.
            minWidth: "10rem",
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
          {buttonLabel}
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
