"use client";

import { useState, useEffect } from "react";
import packageJson from "../../../package.json";

/**
 * FooterV2 — enriched metadata footer for the Speculative Interface.
 * Left: "SYSTEM.INT // {year} LABS_CORE v{version}"
 * Right: status nominal indicator + decorative latency readout.
 * Thin top border. Extra bottom padding (80px) clears the floating chat widget.
 */
export function FooterV2() {
  const [latency, setLatency] = useState(24);

  /* Decorative latency readout — cycles a random value every 3 seconds */
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(Math.floor(Math.random() * (48 - 12 + 1)) + 12);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer
      style={{
        borderTop: "1px solid var(--v2-border)",
        padding: "var(--v2-space-lg) var(--v2-space-lg) 80px",
      }}
    >
      <div
        className="max-w-7xl mx-auto px-6"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--v2-space-sm)",
        }}
      >
        {/* Left: system identifier */}
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            margin: 0,
          }}
        >
          SYSTEM.INT // {new Date().getFullYear()} LABS_CORE v{packageJson.version}
        </p>

        {/* Right: status + latency */}
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "var(--v2-space-md)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            STATUS: NOMINAL
            {/* Pulsing chartreuse dot */}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--v2-accent)",
                display: "inline-block",
                animation: "footerPulse 2s ease-in-out infinite",
              }}
            />
          </span>
          <span>LATENCY: {latency}ms</span>
        </p>
      </div>

      {/* Pulse keyframes for status dot */}
      <style>{`
        @keyframes footerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </footer>
  );
}
