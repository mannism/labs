/**
 * UICanvas — renders the ordered list of UIBlocks as a progressive layout.
 *
 * Each block enters with a fade-up animation via Framer Motion's AnimatePresence.
 * Animation is suppressed when the user has `prefers-reduced-motion: reduce` set —
 * blocks appear instantly without any motion.
 *
 * Blocks are stable by `block.id` so AnimatePresence can track entries correctly.
 */

"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { UIBlock } from "@/lib/schemas/uiBlocks";
import { BlockRenderer } from "./BlockRenderer";

interface UICanvasProps {
  blocks: UIBlock[];
}

/** Spring config for block entry animation. */
const ENTRY_SPRING = { type: "spring", stiffness: 400, damping: 35 } as const;

/** Block entry animation variants. */
const BLOCK_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit:   { opacity: 0 },
} as const;

/** Instant variants used when prefers-reduced-motion is set. */
const BLOCK_VARIANTS_REDUCED = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
} as const;

export function UICanvas({ blocks }: UICanvasProps) {
  /** Respect user's motion preference — set by useReducedMotion from Framer Motion. */
  const reducedMotion = useReducedMotion();

  const variants = reducedMotion ? BLOCK_VARIANTS_REDUCED : BLOCK_VARIANTS;
  const transition = reducedMotion ? { duration: 0 } : ENTRY_SPRING;

  return (
    <div
      aria-live="polite"
      aria-label="Generated UI canvas"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-md)",
        width: "100%",
      }}
    >
      <AnimatePresence initial={false}>
        {blocks.map((block) => (
          <motion.div
            key={block.id}
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
          >
            <BlockRenderer block={block} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
