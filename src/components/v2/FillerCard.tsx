"use client";

import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * FillerCard — decorative placeholder inserted between adjacent highlighted
 * cards in the v2 bento grid. Randomly picks between a glitch style
 * (corrupted data block) and a system diagnostic style (fake telemetry).
 * Non-interactive (pointer-events: none). Respects prefers-reduced-motion.
 */
export function FillerCard() {
  const prefersReduced = useReducedMotion();
  const [cardStyle, setCardStyle] = useState<"glitch" | "diagnostic" | null>(
    null
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe random initialization
    setCardStyle(Math.random() > 0.5 ? "glitch" : "diagnostic");
  }, []);

  /* Render an empty dark placeholder on server to avoid hydration mismatch */
  if (!cardStyle) {
    return (
      <div
        style={{
          ...wrapperStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden="true"
      />
    );
  }

  return cardStyle === "glitch" ? (
    <GlitchCard reduced={prefersReduced} />
  ) : (
    <DiagnosticCard reduced={prefersReduced} />
  );
}

/* --- Shared wrapper styles --- */

const wrapperStyle: React.CSSProperties = {
  background: "var(--v2-bg-invert)",
  border: "1px solid var(--v2-border)",
  borderRadius: "0.5rem",
  padding: "var(--v2-space-xl)",
  height: "100%",
  boxSizing: "border-box",
  pointerEvents: "none",
  cursor: "default",
  overflow: "hidden",
  position: "relative",
  fontFamily: "var(--v2-font-mono)",
  color: "var(--v2-accent)",
};

/* --- Utility helpers --- */

/** Generate a random hex string of `len` characters */
function randomHex(len: number): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/** Generate a corrupted-looking line */
function corruptedLine(): string {
  const templates = [
    () => `0x${randomHex(8)}  ERR_${randomHex(4).toUpperCase()}`,
    () => `MODULE_${String(Math.floor(Math.random() * 999)).padStart(3, "0")} ██▓▒░`,
    () => `[${randomHex(6).toUpperCase()}] ▒▒▒ NULL_REF`,
    () => `>> ${randomHex(4)}:${randomHex(4)}:${randomHex(4)}`,
    () => `FATAL 0x${randomHex(6).toUpperCase()} ░░░░`,
    () => `̷̢̛ ${randomHex(8)} ̶̧̡ CORRUPTED`,
  ];
  return templates[Math.floor(Math.random() * templates.length)]();
}

/* --- Style A: Glitch Card --- */

function GlitchCard({ reduced }: { reduced: boolean }) {
  const [lines, setLines] = useState<string[]>(() =>
    Array.from({ length: 8 }, corruptedLine)
  );

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(
      () => setLines(Array.from({ length: 8 }, corruptedLine)),
      2000 + Math.random() * 1000
    );
    return () => clearInterval(interval);
  }, [reduced]);

  return (
    <div
      style={wrapperStyle}
      aria-hidden="true"
      className={reduced ? undefined : "filler-glitch"}
    >
      {/* Scan-line overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(200,255,0,0.03) 2px, rgba(200,255,0,0.03) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Corrupted text lines */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: "var(--v2-font-size-xs)",
              lineHeight: 2,
              letterSpacing: "0.05em",
              opacity: 0.7,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Glitch animation keyframes */}
      <style>{`
        @keyframes fillerGlitch {
          0%, 90%, 100% { transform: translate(0, 0); }
          92% { transform: translate(-2px, 1px); }
          94% { transform: translate(1px, -1px); }
          96% { transform: translate(-1px, 0); }
          98% { transform: translate(2px, 1px); }
        }
        .filler-glitch {
          animation: fillerGlitch 3s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .filler-glitch { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* --- Style B: System Diagnostic Card --- */

function DiagnosticCard({ reduced }: { reduced: boolean }) {
  const [uptime, setUptime] = useState(() => Math.floor(Math.random() * 50000));
  const [memAlloc, setMemAlloc] = useState(randomMem());
  const [procLoad, setProcLoad] = useState(randomLoad());
  const [hexLines, setHexLines] = useState<string[]>(() =>
    Array.from({ length: 6 }, () => randomHex(32))
  );
  const hexRef = useRef<HTMLDivElement>(null);

  function randomMem() {
    return Math.floor(128 + Math.random() * 350);
  }
  function randomLoad() {
    return (10 + Math.random() * 80).toFixed(2);
  }

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setUptime((u) => u + 1);
      setMemAlloc(randomMem());
      setProcLoad(randomLoad());
      setHexLines(Array.from({ length: 6 }, () => randomHex(32)));
    }, 1500);
    return () => clearInterval(interval);
  }, [reduced]);

  /* Auto-scroll hex dump */
  useEffect(() => {
    if (reduced || !hexRef.current) return;
    const el = hexRef.current;
    el.scrollTop = el.scrollHeight;
  }, [hexLines, reduced]);

  const memPct = Math.min((memAlloc / 512) * 100, 100);

  return (
    <div style={wrapperStyle} aria-hidden="true">
      {/* Scan-line overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(200,255,0,0.03) 2px, rgba(200,255,0,0.03) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div style={{ position: "relative", zIndex: 2, fontSize: "var(--v2-font-size-xs)", letterSpacing: "0.05em" }}>
        {/* Header */}
        <div style={{ opacity: 0.5, marginBottom: "var(--v2-space-md)", fontSize: "0.6rem" }}>
          SYS_DIAGNOSTIC v0.1.3
        </div>

        {/* Uptime */}
        <div style={{ marginBottom: "var(--v2-space-sm)", opacity: 0.8 }}>
          UPTIME: {uptime}s
        </div>

        {/* Memory allocation with progress bar */}
        <div style={{ marginBottom: "var(--v2-space-xs)", opacity: 0.8 }}>
          MEM_ALLOC: {memAlloc}MB / 512MB
        </div>
        <div
          style={{
            width: "100%",
            height: "4px",
            background: "rgba(200,255,0,0.1)",
            borderRadius: "2px",
            marginBottom: "var(--v2-space-md)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${memPct}%`,
              height: "100%",
              background: "var(--v2-accent)",
              opacity: 0.6,
              borderRadius: "2px",
              transition: reduced ? "none" : "width 0.5s ease",
            }}
          />
        </div>

        {/* Process load */}
        <div style={{ marginBottom: "var(--v2-space-lg)", opacity: 0.8 }}>
          PROC_LOAD: {procLoad}%
        </div>

        {/* Hex dump — scrolling */}
        <div
          ref={hexRef}
          style={{
            maxHeight: "72px",
            overflow: "hidden",
            opacity: 0.35,
            fontSize: "0.55rem",
            lineHeight: 1.6,
            wordBreak: "break-all",
          }}
        >
          {hexLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
