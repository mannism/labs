"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

/**
 * ScanLine — atmospheric decorative element for v2.
 * A thin 1px horizontal line (chartreuse at 8% opacity) that drifts
 * slowly down the page on a continuous loop. Creates a subtle
 * "system scanning" feel without being distracting.
 * Absolutely positioned, pointer-events: none so it never blocks interaction.
 * Entirely disabled when prefers-reduced-motion is set.
 */
export function ScanLine() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        height: "1px",
        background: "rgba(200, 255, 0, 0.08)",
        boxShadow: "0 0 12px rgba(200, 255, 0, 0.06)",
        pointerEvents: "none",
        zIndex: 1,
      }}
      animate={{
        top: ["-1px", "100vh"],
      }}
      transition={{
        duration: 18,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}
