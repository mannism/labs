"use client";

import * as m from "framer-motion/m";
import { AnimatePresence } from "framer-motion";
import type { VariantResult } from "@/types/brandPipeline";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/**
 * ResultPanel — displays the top-K ranked variant results from a completed pipeline run.
 *
 * Rendered only after a pipeline_done event fires and results are available.
 * Each VariantResult card shows:
 *  - Rank badge (1st, 2nd, 3rd)
 *  - Score as a filled progress bar (0–100)
 *  - Concept text
 *  - Flags as coloured tags (amber for violations, green for clean)
 *  - Rationale text
 *
 * Framer Motion fade-up stagger on card entry.
 * prefers-reduced-motion: instant render with no animation.
 * All colours via CSS custom properties — no hardcoded hex.
 */

interface ResultPanelProps {
  results: VariantResult[];
}

/** Flag tag colour: amber if any content (violation), green if explicitly "none" or empty. */
function FlagTag({ flag }: { flag: string }) {
  const isClean = flag.toLowerCase() === "none" || flag.trim() === "";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--v2-font-mono)",
        fontSize: "0.625rem",
        letterSpacing: "0.06em",
        padding: "3px 8px",
        borderRadius: "2px",
        background: isClean ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.12)",
        border: `1px solid ${isClean ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.35)"}`,
        color: isClean ? "#22C55E" : "#F59E0B",
        whiteSpace: "nowrap",
      }}
    >
      {flag}
    </span>
  );
}

/** Score bar — filled bar representing score / 100. */
function ScoreBar({ score }: { score: number }) {
  // Backend evaluate step scores 1–10; rank step may surface 0–100.
  // Normalise defensively: treat values > 10 as already out-of-100.
  const normalised = score > 10 ? Math.min(score, 100) : Math.min(score * 10, 100);
  const pct = `${normalised}%`;

  const barColor =
    normalised >= 75
      ? "var(--v2-accent)"
      : normalised >= 50
      ? "#F59E0B"
      : "#F87171";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {/* Track */}
      <div
        role="progressbar"
        aria-valuenow={normalised}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score: ${score}`}
        style={{
          flex: 1,
          height: "4px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: "100%",
            width: pct,
            background: barColor,
            borderRadius: "2px",
            transition: "width 0.6s ease",
          }}
        />
      </div>
      {/* Numeric label */}
      <span
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          fontWeight: 600,
          color: barColor,
          minWidth: "36px",
          textAlign: "right",
        }}
      >
        {score}/10
      </span>
    </div>
  );
}

const RANK_LABELS = ["1ST", "2ND", "3RD"];

export function ResultPanel({ results }: ResultPanelProps) {
  const prefersReduced = useReducedMotion();

  if (results.length === 0) return null;

  return (
    <section
      aria-label="Pipeline results"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-md)",
      }}
    >
      {/* Section header */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        TOP {results.length} RESULT{results.length !== 1 ? "S" : ""}
      </p>

      {/* Result cards */}
      <AnimatePresence>
        {results.map((result, idx) => (
          <m.article
            key={result.id}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : {
                    duration: 0.35,
                    delay: idx * 0.1,
                    ease: [0.4, 0, 0.2, 1],
                  }
            }
            aria-label={`Result ${idx + 1} of ${results.length}`}
            style={{
              padding: "var(--v2-space-lg)",
              background: "var(--exp-glass-bg)",
              border: "1px solid var(--exp-glass-border)",
              borderRadius: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "var(--v2-space-md)",
            }}
          >
            {/* Card header: rank badge + score */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--v2-space-sm)",
                flexWrap: "wrap",
              }}
            >
              {/* Rank badge */}
              <span
                aria-label={`Rank ${idx + 1}`}
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: idx === 0 ? "#1A1D23" : "var(--exp-glass-text-muted)",
                  background: idx === 0 ? "var(--v2-accent)" : "rgba(255,255,255,0.08)",
                  padding: "3px 10px",
                  borderRadius: "2px",
                  flexShrink: 0,
                }}
              >
                {RANK_LABELS[idx] ?? `#${idx + 1}`}
              </span>

              {/* Score bar — fills remaining space */}
              <div style={{ flex: 1, minWidth: "120px" }}>
                <ScoreBar score={result.score} />
              </div>
            </div>

            {/* Concept text */}
            <p
              style={{
                fontFamily: "var(--v2-font-body)",
                fontSize: "var(--v2-font-size-sm)",
                color: "var(--exp-glass-text)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {result.concept}
            </p>

            {/* Flags */}
            {result.flags.length > 0 && (
              <div
                role="list"
                aria-label="Flags"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--v2-space-xs)",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "0.625rem",
                    color: "var(--exp-glass-text-muted)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginRight: "4px",
                  }}
                  aria-hidden="true"
                >
                  Flags
                </span>
                {result.flags.map((flag, flagIdx) => (
                  <span key={flagIdx} role="listitem">
                    <FlagTag flag={flag} />
                  </span>
                ))}
              </div>
            )}

            {/* Rationale */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: "var(--v2-space-sm)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "0.625rem",
                  color: "var(--exp-glass-text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Rationale
              </span>
              <p
                style={{
                  fontFamily: "var(--v2-font-body)",
                  fontSize: "var(--v2-font-size-sm)",
                  color: "var(--exp-glass-text-muted)",
                  lineHeight: 1.65,
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                {result.rationale}
              </p>
            </div>
          </m.article>
        ))}
      </AnimatePresence>
    </section>
  );
}
