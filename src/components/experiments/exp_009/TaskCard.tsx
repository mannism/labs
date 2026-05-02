"use client";

/**
 * TaskCard — renders a single benchmark task in one of four states:
 *   pending  → grey, waiting to execute
 *   running  → green tint, pulsing animation
 *   passed   → sustained green, checkmark icon
 *   failed   → red tint, expandable validation errors
 *
 * Failed cards are keyboard-accessible (role="button", Enter/Space toggles).
 * All animations respect prefers-reduced-motion via globals.css.
 */

import { useState } from "react";
import * as m from "framer-motion/m";
import { AnimatePresence } from "framer-motion";
import type { TaskResult } from "@/lib/experiments/exp_009/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardState = "pending" | "running" | "passed" | "failed";

interface SkeletonCardProps {
  /** Index used to stagger skeleton animation delays slightly. */
  index: number;
}

interface TaskCardProps {
  /** Live task result data — null when task is still pending. */
  result: TaskResult | null;
  /** Task ID shown even before a result arrives. */
  taskId: string;
  /** Current rendering state of this card. */
  state: CardState;
  /** Elapsed milliseconds shown for running tasks. Undefined for other states. */
  elapsedMs?: number;
  /** Attempt number for display (1-based). Defaults to 1. */
  attempt?: number;
}

// ─── Animation variants (Framer Motion) ──────────────────────────────────────

/** Card entry: slide up from y:10, fade in, scale from 0.98 */
const cardVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
} as const;

/** Validation error expansion (failed card expand/collapse) */
const errorDetailsVariants = {
  collapsed: { opacity: 0, height: 0, overflow: "hidden" },
  expanded: {
    opacity: 1,
    height: "auto",
    overflow: "hidden",
    transition: { duration: 0.3, ease: "easeOut" },
  },
} as const;

// ─── State-derived styles ─────────────────────────────────────────────────────

function getCardStyle(state: CardState, isExpanded: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    width: "100%",
    minHeight: "80px",
    padding: "var(--v2-space-md)",
    borderRadius: "0.375rem",
    border: "1px solid",
    position: "relative",
    cursor: state === "failed" ? "pointer" : "default",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.6, 1)",
  };

  switch (state) {
    case "pending":
      return {
        ...base,
        backgroundColor: "rgba(248, 250, 252, 0.04)",
        borderColor: "rgba(255, 255, 255, 0.06)",
      };
    case "running":
      return {
        ...base,
        backgroundColor: "rgba(34, 197, 94, 0.08)",
        borderColor: "rgba(34, 197, 94, 0.25)",
        animation: "card-running-pulse 2s ease-in-out infinite",
        cursor: "default",
      };
    case "passed":
      return {
        ...base,
        backgroundColor: "rgba(34, 197, 94, 0.12)",
        borderColor: "rgba(34, 197, 94, 0.4)",
      };
    case "failed":
      return {
        ...base,
        backgroundColor: isExpanded
          ? "rgba(239, 68, 68, 0.12)"
          : "rgba(239, 68, 68, 0.08)",
        borderColor: isExpanded
          ? "rgba(239, 68, 68, 0.4)"
          : "rgba(239, 68, 68, 0.25)",
      };
  }
}

function getBadgeStyle(state: CardState): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontFamily: "var(--v2-font-mono)",
    fontSize: "var(--v2-font-size-xs)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    border: "1px solid",
    transition: "background 0.2s ease, border-color 0.2s ease",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };

  switch (state) {
    case "pending":
      return {
        ...base,
        backgroundColor: "rgba(248, 250, 252, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.08)",
        color: "var(--exp-glass-text-muted)",
      };
    case "running":
      return {
        ...base,
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        borderColor: "#22C55E",
        color: "#22C55E",
      };
    case "passed":
      return {
        ...base,
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        borderColor: "#22C55E",
        color: "#22C55E",
      };
    case "failed":
      return {
        ...base,
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        borderColor: "#EF4444",
        color: "#EF4444",
      };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton card shown in pre-run state for a task slot. */
export function SkeletonCard({ index }: SkeletonCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "80px",
        borderRadius: "0.375rem",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        backgroundColor: "rgba(248, 250, 252, 0.04)",
        animation: `skeleton-shimmer 1.5s ease-in-out infinite`,
        animationDelay: `${index * 0.1}s`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden="true"
    >
      <span
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
          opacity: 0.5,
        }}
      >
        awaiting run
      </span>
    </div>
  );
}

// ─── Main TaskCard ────────────────────────────────────────────────────────────

export function TaskCard({ result, taskId, state, elapsedMs, attempt = 1 }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    if (state === "failed") setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (state === "failed" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      toggleExpanded();
    }
  };

  /** Friendly short label for the task ID (strip long prefix if present) */
  const shortId = taskId.length > 36 ? `${taskId.slice(0, 36)}…` : taskId;

  /** Latency display */
  const latencyDisplay =
    state === "pending"
      ? "— ms"
      : state === "running"
        ? `${elapsedMs ?? 0} ms elapsed`
        : result
          ? `${result.latencyMs} ms`
          : "— ms";

  /** Sub-label after latency */
  const subLabel =
    state === "pending"
      ? "Waiting..."
      : state === "running"
        ? `Attempt ${attempt}/3`
        : result
          ? `Attempt ${attempt}/3`
          : "";

  const errorCount = result?.validationErrors?.length ?? 0;

  return (
    <m.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      // Failed cards are buttons for expand/collapse
      role={state === "failed" ? "button" : undefined}
      tabIndex={state === "failed" ? 0 : undefined}
      aria-expanded={state === "failed" ? isExpanded : undefined}
      aria-label={
        state === "failed"
          ? `${isExpanded ? "Collapse" : "Expand"} errors for task ${taskId}`
          : undefined
      }
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      style={getCardStyle(state, isExpanded)}
    >
      {/* ── Top row: task ID + badge ──────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--v2-space-sm)",
          marginBottom: "var(--v2-space-xs)",
        }}
      >
        {/* Task ID with pass/fail icon prefix */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--v2-space-xs)",
            minWidth: 0,
          }}
        >
          {state === "passed" && (
            <span
              aria-hidden="true"
              style={{ color: "#22C55E", flexShrink: 0, fontSize: "14px" }}
            >
              ✓
            </span>
          )}
          {state === "failed" && (
            <span
              aria-hidden="true"
              style={{ color: "#EF4444", flexShrink: 0, fontSize: "14px" }}
            >
              ✗
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text)",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={taskId}
          >
            {shortId}
          </span>
        </div>

        {/* Status badge */}
        <span style={getBadgeStyle(state)}>
          {state.toUpperCase()}
        </span>
      </div>

      {/* ── Separator ─────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          marginBottom: "var(--v2-space-xs)",
        }}
      />

      {/* ── Latency + attempt ─────────────────────────────────── */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          margin: 0,
        }}
      >
        {latencyDisplay}
        {subLabel && (
          <span style={{ marginLeft: "var(--v2-space-xs)", opacity: 0.7 }}>
            • {subLabel}
          </span>
        )}
        {state === "failed" && errorCount > 0 && (
          <span style={{ marginLeft: "var(--v2-space-xs)", color: "#EF4444" }}>
            • {errorCount} validation error{errorCount !== 1 ? "s" : ""}
          </span>
        )}
        {state === "failed" && (
          <span
            style={{
              marginLeft: "var(--v2-space-sm)",
              opacity: 0.5,
              fontSize: "0.65rem",
            }}
          >
            {isExpanded ? "▲ collapse" : "▼ expand"}
          </span>
        )}
      </p>

      {/* ── Expandable error details (failed state only) ───────── */}
      <AnimatePresence initial={false}>
        {state === "failed" && isExpanded && result && (
          <m.div
            variants={errorDetailsVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            style={{ marginTop: "var(--v2-space-sm)" }}
          >
            {/* Separator */}
            <div
              aria-hidden="true"
              style={{
                borderTop: "1px solid rgba(239, 68, 68, 0.2)",
                marginBottom: "var(--v2-space-sm)",
              }}
            />

            {/* Validation errors */}
            {result.validationErrors && result.validationErrors.length > 0 && (
              <>
                <p
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--exp-glass-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    margin: "0 0 var(--v2-space-xs) 0",
                  }}
                >
                  Validation Errors:
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    margin: "0 0 var(--v2-space-sm) 0",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--v2-space-xs)",
                  }}
                >
                  {result.validationErrors.map((err, i) => (
                    <li
                      key={i}
                      style={{
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: "var(--v2-font-size-xs)",
                        color: "#EF4444",
                        paddingLeft: "var(--v2-space-sm)",
                        borderLeft: "2px solid rgba(239, 68, 68, 0.4)",
                        lineHeight: 1.5,
                      }}
                    >
                      {err}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Raw response preview */}
            <p
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--exp-glass-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 var(--v2-space-xs) 0",
              }}
            >
              Raw Response (first 300 chars):
            </p>
            <pre
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "0.65rem",
                color: "var(--exp-glass-text-muted)",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "0.25rem",
                padding: "var(--v2-space-sm)",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                lineHeight: 1.5,
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              {result.rawResponse.slice(0, 300)}
              {result.rawResponse.length > 300 ? "…" : ""}
            </pre>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
