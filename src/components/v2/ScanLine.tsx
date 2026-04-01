"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

/**
 * ScanLine — purely atmospheric decorative element for v2.
 * A thin 1px horizontal line (chartreuse at 10% opacity) that drifts
 * slowly down the page on a continuous loop. Absolutely positioned,
 * pointer-events: none so it never blocks interaction.
 * Disabled entirely when prefers-reduced-motion is set.
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
        height: "2px",
        background: "rgba(200, 255, 0, 0.25)",
        boxShadow: "0 0 8px rgba(200, 255, 0, 0.15)",
        pointerEvents: "none",
        zIndex: 1,
      }}
      animate={{
        top: ["-2px", "100vh"],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}
