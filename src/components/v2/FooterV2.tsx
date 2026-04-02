"use client";

import { useState, useEffect } from "react";
import packageJson from "../../../package.json";
import { useReducedMotion } from "./useReducedMotion";

/**
 * FooterV2 — system status bar for the Speculative Interface.
 * Left: "SYSTEM.INT // {year} LABS_CORE v{version}" — system identifier.
 * Right: "LATENCY: {value}ms" + "STATUS: NOMINAL" with pulsing chartreuse dot.
 * Matches Stitch footer design: monospace, compact, atmospheric.
 * Bottom padding (80px) clears the floating chat widget.
 * Latency readout respects prefers-reduced-motion (static value when reduced).
 */
export function FooterV2() {
  const prefersReduced = useReducedMotion();
  const [latency, setLatency] = useState(24);

  /* Decorative latency readout — updates every 4 seconds with damped random value */
  useEffect(() => {
    if (prefersReduced) return;

    const timer = setInterval(() => {
      setLatency((prev) => {
        /* Damped random walk for organic feel — stays in 12-48ms range */
        const delta = Math.floor(Math.random() * 13) - 6;
        return Math.max(12, Math.min(48, prev + delta));
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [prefersReduced]);

  return (
    <footer
      style={{
        borderTop: "1px solid var(--v2-border)",
        padding: "var(--v2-space-lg) 0 80px",
      }}
    >
      <div
        className="max-w-7xl mx-auto px-6"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--v2-space-md)",
        }}
      >
        {/* Left: system identifier */}
        <p
          suppressHydrationWarning
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          SYSTEM.INT // {new Date().getFullYear()} LABS_CORE v{packageJson.version}
        </p>

        {/* Right: latency + status */}
        <div
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "var(--v2-space-lg)",
          }}
        >
          <span>LATENCY: {latency}ms</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            STATUS: NOMINAL
            {/* Pulsing chartreuse dot — disabled for reduced motion */}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--v2-accent)",
                display: "inline-block",
                animation: prefersReduced ? "none" : "footerPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
          </span>
        </div>
      </div>

      {/* Pulse keyframes for status dot — slow organic breathing */}
      <style>{`
        @keyframes footerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </footer>
  );
}
