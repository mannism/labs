"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * SignalField — full-viewport HTML5 Canvas dot grid background.
 * Renders a fixed grid of small dots that react to cursor proximity on desktop
 * (brighten + slight chartreuse shift within 120px, subtle pull within 60px).
 * On mobile (no cursor), an ambient sine wave brightness oscillation
 * travels horizontally across the grid every ~10 seconds.
 * Uses requestAnimationFrame for smooth rendering, only recalculates dots
 * within a bounding box around the cursor for performance.
 * Respects prefers-reduced-motion: renders a static grid only.
 */

/** Grid configuration */
const DOT_RADIUS = 1.5; // 3px diameter — larger for better visibility
const GRID_SPACING = 40;
const BASE_OPACITY = 0.12; // more visible base grid
const HOVER_OPACITY = 0.45; // stronger cursor highlight
const HOVER_RADIUS = 160; // wider cursor influence area
const PULL_RADIUS = 60;
const PULL_STRENGTH = 2.5; // max displacement in pixels

/** Base dot color (matches --v2-text-tertiary approximate RGB) */
const BASE_R = 140;
const BASE_G = 145;
const BASE_B = 155;

/** Chartreuse accent color for hover glow */
const ACCENT_R = 200;
const ACCENT_G = 255;
const ACCENT_B = 0;

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function SignalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();
  const cursorRef = useRef({ x: -1000, y: -1000 });
  const hasCursorRef = useRef(false);
  const rafRef = useRef<number>(0);
  /** Smooth cursor position for lerp interpolation */
  const smoothCursorRef = useRef({ x: -1000, y: -1000 });

  /** Detect touch device — no cursor events */
  const isTouchDevice = useCallback(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const isTouch = isTouchDevice();

    /** Resize canvas to match viewport at device pixel ratio */
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    /** Track cursor position */
    const onMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
      hasCursorRef.current = true;
    };

    if (!isTouch) {
      window.addEventListener("mousemove", onMouseMove);
    }

    /** Main render loop */
    const draw = (timestamp: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      /* Smooth cursor interpolation */
      if (hasCursorRef.current) {
        smoothCursorRef.current.x = lerp(
          smoothCursorRef.current.x,
          cursorRef.current.x,
          0.25
        );
        smoothCursorRef.current.y = lerp(
          smoothCursorRef.current.y,
          cursorRef.current.y,
          0.25
        );
      }

      const cx = smoothCursorRef.current.x;
      const cy = smoothCursorRef.current.y;

      /* Calculate bounding box around cursor for optimization */
      const boxLeft = cx - HOVER_RADIUS - GRID_SPACING;
      const boxRight = cx + HOVER_RADIUS + GRID_SPACING;
      const boxTop = cy - HOVER_RADIUS - GRID_SPACING;
      const boxBottom = cy + HOVER_RADIUS + GRID_SPACING;

      /* Ambient wave phase for mobile */
      const wavePhase = (timestamp / 10000) * Math.PI * 2;

      for (let x = GRID_SPACING; x < w; x += GRID_SPACING) {
        for (let y = GRID_SPACING; y < h; y += GRID_SPACING) {
          let opacity = BASE_OPACITY;
          let r = BASE_R;
          let g = BASE_G;
          let b = BASE_B;
          let drawX = x;
          let drawY = y;

          if (prefersReduced) {
            /* Static grid only — no cursor response or wave */
          } else if (
            !isTouch &&
            hasCursorRef.current &&
            x >= boxLeft &&
            x <= boxRight &&
            y >= boxTop &&
            y <= boxBottom
          ) {
            /* Desktop: cursor-reactive behavior */
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < HOVER_RADIUS) {
              const t = 1 - dist / HOVER_RADIUS;
              opacity = lerp(BASE_OPACITY, HOVER_OPACITY, t);
              r = lerp(BASE_R, ACCENT_R, t * 0.6);
              g = lerp(BASE_G, ACCENT_G, t * 0.6);
              b = lerp(BASE_B, ACCENT_B, t * 0.6);

              /* Pull effect within inner radius */
              if (dist < PULL_RADIUS && dist > 0) {
                const pullT = 1 - dist / PULL_RADIUS;
                drawX = x - dx * pullT * (PULL_STRENGTH / dist) * pullT;
                drawY = y - dy * pullT * (PULL_STRENGTH / dist) * pullT;
              }
            }
          } else if (isTouch && !prefersReduced) {
            /* Mobile: ambient sine wave brightness oscillation */
            const normalizedX = x / w;
            const wave = Math.sin(wavePhase + normalizedX * Math.PI * 4);
            const waveT = (wave + 1) / 2; // 0..1
            opacity = lerp(BASE_OPACITY, BASE_OPACITY * 2.5, waveT * 0.3);
          }

          ctx.beginPath();
          ctx.arc(drawX, drawY, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${opacity})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      if (!isTouch) {
        window.removeEventListener("mousemove", onMouseMove);
      }
    };
  }, [prefersReduced, isTouchDevice]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
