"use client";

import { motion } from "framer-motion";
import type { ExperimentStatus } from "@/types/experiment";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/**
 * StatusIndicator — reusable dot + label for experiment status.
 * LIVE: pulsing green dot. BETA: static amber dot. CONCEPT: static grey dot.
 * Colour is never the sole indicator — dot is always paired with a text label.
 */

/** Map status to its CSS custom property colour token. */
const STATUS_COLOR: Record<ExperimentStatus, string> = {
  live: "var(--exp-status-live)",
  beta: "var(--exp-status-beta)",
  concept: "var(--exp-status-concept)",
};

/** Map status to its display label. */
const STATUS_LABEL: Record<ExperimentStatus, string> = {
  live: "LIVE",
  beta: "BETA",
  concept: "CONCEPT",
};

export function StatusIndicator({ status }: { status: ExperimentStatus }) {
  const prefersReduced = useReducedMotion();
  const isLive = status === "live";

  return (
    <span
      aria-label={`Status: ${STATUS_LABEL[status]}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--v2-font-mono)",
        fontSize: "var(--v2-font-size-xs)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--v2-text-tertiary)",
      }}
    >
      {/* Status dot — pulses for LIVE, static otherwise. aria-hidden because text label conveys meaning. */}
      <motion.span
        aria-hidden="true"
        animate={
          isLive && !prefersReduced
            ? { opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }
            : undefined
        }
        transition={
          isLive && !prefersReduced
            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: STATUS_COLOR[status],
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
