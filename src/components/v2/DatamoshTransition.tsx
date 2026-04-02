"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

/**
 * DatamoshTransition — glitch overlay that fires during view transitions.
 * Uses animated gradient bands with mix-blend-mode: difference and
 * repeating-linear-gradient to create an RGB channel separation effect.
 * A chartreuse scan-line sweeps top to bottom during the glitch.
 *
 * Two intensity modes:
 * - "full": grid-to-detail transitions (3-4 horizontal slices, 300ms)
 * - "mild": detail-to-grid transitions (single slice, 100ms)
 *
 * Respects prefers-reduced-motion: skips glitch entirely.
 * Mobile: always uses the mild variant.
 */

interface DatamoshTransitionProps {
  /** Whether the transition is currently active */
  active: boolean;
  /** Intensity of the glitch effect */
  mode?: "full" | "mild";
  /** Called when the animation completes */
  onComplete: () => void;
}

/** Duration in seconds for each mode */
const DURATIONS = {
  full: 0.3,
  mild: 0.1,
} as const;

export function DatamoshTransition({
  active,
  mode = "full",
  onComplete,
}: DatamoshTransitionProps) {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [phase, setPhase] = useState<"idle" | "freeze" | "glitch" | "done">(
    "idle"
  );

  /** Stable ref for onComplete to avoid re-triggering the effect */
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  /** Detect mobile viewport */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /** Resolve the effective mode — mobile always uses mild */
  const effectiveMode = isMobile ? "mild" : mode;
  const duration = DURATIONS[effectiveMode];

  /** Start/reset the animation sequence when active changes */
  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }

    /* Skip glitch for reduced motion — fire onComplete immediately */
    if (prefersReduced) {
      onCompleteRef.current();
      return;
    }

    /* Phase 1: freeze frame (~80ms) */
    setPhase("freeze");
    const freezeTimer = setTimeout(() => {
      setPhase("glitch");
    }, 80);

    /* Phase 2: glitch runs for the mode's duration, then completes */
    const totalTimer = setTimeout(
      () => {
        setPhase("done");
        onCompleteRef.current();
      },
      80 + duration * 1000
    );

    return () => {
      clearTimeout(freezeTimer);
      clearTimeout(totalTimer);
    };
  }, [active, prefersReduced, duration]);

  if (!active || prefersReduced || phase === "idle" || phase === "done") {
    return null;
  }

  return (
    <AnimatePresence>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* RGB channel separation — three overlapping gradient layers */}
        {phase === "glitch" && (
          <>
            {effectiveMode === "full" ? (
              <FullGlitch duration={duration} />
            ) : (
              <MildGlitch duration={duration} />
            )}

            {/* Chartreuse scan-line sweep */}
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration, ease: "linear" }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "3px",
                background: "rgba(200, 255, 0, 0.2)",
                boxShadow: "0 0 8px rgba(200, 255, 0, 0.15)",
                zIndex: 2,
              }}
            />
          </>
        )}
      </div>
    </AnimatePresence>
  );
}

/**
 * FullGlitch — intense RGB separation with 4 horizontal slice shifts.
 * Uses mix-blend-mode: difference with colored gradient overlays.
 */
function FullGlitch({ duration }: { duration: number }) {
  /** Random horizontal slice positions for displacement — larger shifts for visibility */
  const slices = [
    { top: "10%", height: "22%", shift: 30, color: "255,0,0" },
    { top: "35%", height: "15%", shift: -40, color: "0,255,0" },
    { top: "55%", height: "20%", shift: 25, color: "0,100,255" },
    { top: "80%", height: "12%", shift: -35, color: "200,255,0" },
  ];

  return (
    <>
      {/* Brief dark flash at the start — creates "freeze frame" visual */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background: "black",
          zIndex: 3,
        }}
      />

      {/* Semi-transparent dark backdrop so blend modes have contrast on light bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.05)",
          zIndex: 0,
        }}
      />

      {/* Displaced horizontal slices with solid color overlays */}
      {slices.map((slice, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, opacity: 0 }}
          animate={{
            x: [0, slice.shift, slice.shift * 0.5, 0],
            opacity: [0, 0.85, 0.6, 0],
          }}
          transition={{
            duration,
            ease: "easeInOut",
            times: [0, 0.3, 0.7, 1],
          }}
          style={{
            position: "absolute",
            top: slice.top,
            left: 0,
            right: 0,
            height: slice.height,
            background: `repeating-linear-gradient(
              0deg,
              rgba(${slice.color}, 0.25) 0px,
              transparent 2px,
              transparent 4px
            )`,
            mixBlendMode: "difference",
            zIndex: 1,
          }}
        />
      ))}

      {/* Full-screen RGB noise overlay — boosted opacity */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0.15, 0] }}
        transition={{ duration, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            rgba(200, 255, 0, 0.08) 0px,
            transparent 1px,
            transparent 3px
          )`,
          backgroundSize: "100% 3px",
          mixBlendMode: "difference",
          zIndex: 1,
        }}
      />
    </>
  );
}

/**
 * MildGlitch — subtle single-slice displacement for reverse transitions.
 */
function MildGlitch({ duration }: { duration: number }) {
  return (
    <motion.div
      initial={{ x: 0, opacity: 0 }}
      animate={{
        x: [0, 15, 0],
        opacity: [0, 0.5, 0],
      }}
      transition={{ duration, ease: "easeInOut" }}
      style={{
        position: "absolute",
        top: "40%",
        left: 0,
        right: 0,
        height: "20%",
        background: `repeating-linear-gradient(
          0deg,
          rgba(200, 255, 0, 0.06) 0px,
          transparent 2px,
          transparent 4px
        )`,
        mixBlendMode: "difference",
        zIndex: 1,
      }}
    />
  );
}
