"use client";

/**
 * ModelColumn — renders a single model's column in the three-column benchmark grid.
 *
 * Contains:
 *   - A sticky-within-column header (model name, provider colour bottom border)
 *   - A staggered stack of TaskCard components (one per task)
 *   - Skeleton cards shown in pre-run state
 *
 * Framer Motion staggerChildren drives the 80ms stagger between card entries.
 */

import { motion } from "framer-motion";
import { TaskCard, SkeletonCard, type CardState } from "./TaskCard";
import type { TaskResult, ModelId, ModelConfig } from "@/lib/experiments/exp_009/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelColumnProps {
  config: ModelConfig;
  /** All task IDs in the suite — defines card ordering. */
  taskIds: string[];
  /** Results received for this model so far, keyed by taskId. */
  resultsByTaskId: Map<string, TaskResult>;
  /** Set of taskIds currently executing (for running state). */
  runningTaskIds: Set<string>;
  /** Whether we've received any results yet (controls skeleton vs live cards). */
  hasStarted: boolean;
}

// ─── Model brand colours ──────────────────────────────────────────────────────

const MODEL_BRAND_COLOUR: Record<ModelId, string> = {
  "gpt-5.5": "var(--model-gpt-55-brand)",
  "claude-opus-4-7": "var(--model-claude-brand)",
  "gemini-3.1-pro": "var(--model-gemini-brand)",
};

// ─── Animation variants ───────────────────────────────────────────────────────

/** Container variant: stagger children 80ms apart, 100ms initial delay */
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ModelColumn({
  config,
  taskIds,
  resultsByTaskId,
  runningTaskIds,
  hasStarted,
}: ModelColumnProps) {
  const brandColour = MODEL_BRAND_COLOUR[config.id];

  /**
   * Determine the display state for a given task card.
   * Priority: result present → passed/failed. Running set → running. Default → pending.
   */
  function getCardState(taskId: string): CardState {
    const result = resultsByTaskId.get(taskId);
    if (result) return result.pass ? "passed" : "failed";
    if (runningTaskIds.has(taskId)) return "running";
    return "pending";
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {/* ── Column header ──────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--v2-space-xs)",
          padding: "var(--v2-space-md)",
          marginBottom: "var(--v2-space-md)",
          borderBottom: `2px solid ${brandColour}`,
        }}
      >
        {/* Provider colour dot */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: brandColour,
            flexShrink: 0,
            opacity: 0.9,
          }}
        />

        {/* Model label */}
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "var(--v2-letter-spacing-wide)",
          }}
        >
          {config.label}
        </span>
      </div>

      {/* ── Task card stack ────────────────────────────────────── */}
      {!hasStarted ? (
        /* Pre-run: show skeleton cards */
        <div
          style={{ display: "flex", flexDirection: "column", gap: "var(--v2-space-sm)" }}
          aria-label={`${config.label} — awaiting run`}
        >
          {taskIds.slice(0, 5).map((id, i) => (
            <SkeletonCard key={id} index={i} />
          ))}
          {taskIds.length > 5 && (
            <p
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--exp-glass-text-muted)",
                textAlign: "center",
                opacity: 0.4,
                margin: 0,
                padding: "var(--v2-space-sm)",
              }}
            >
              +{taskIds.length - 5} more tasks
            </p>
          )}
        </div>
      ) : (
        /* Live: staggered card stack */
        <motion.div
          variants={containerVariants}
          animate="animate"
          style={{ display: "flex", flexDirection: "column", gap: "var(--v2-space-sm)" }}
          aria-label={`${config.label} task results`}
        >
          {taskIds.map((taskId) => {
            const result = resultsByTaskId.get(taskId) ?? null;
            const state = getCardState(taskId);
            return (
              <TaskCard
                key={taskId}
                taskId={taskId}
                result={result}
                state={state}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
