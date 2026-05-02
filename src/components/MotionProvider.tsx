"use client";

/**
 * MotionProvider — repo-wide LazyMotion boundary.
 *
 * Wraps children in framer-motion's LazyMotion with `domAnimation` features,
 * which covers transitions, spring animations, exit animations, and
 * tap/hover/focus gestures (~15KB). This is sufficient for all current motion
 * sites in the repo — none require drag/pan (which would need `domMax`).
 *
 * Mounted once in src/app/layout.tsx so the feature bundle is loaded a single
 * time and shared across every route. The layout itself stays a Server Component;
 * this is the only client boundary added.
 *
 * Every component that uses `m.X` from `framer-motion/m` must be rendered inside
 * this provider. AnimatePresence and useReducedMotion continue to import from
 * `framer-motion` (main entrypoint) — they are not affected by this boundary.
 *
 * Why domAnimation (not domMax):
 *   domMax adds drag + pan support at the cost of ~6KB extra. No current
 *   experiment or component uses drag. If drag is needed in a future experiment,
 *   change `features={domAnimation}` to `features={domMax}` here — single-line change.
 */

import { LazyMotion, domAnimation } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
