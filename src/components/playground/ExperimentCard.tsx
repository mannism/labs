"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Experiment } from "@/types/experiment";
import { StatusIndicator } from "./StatusIndicator";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/**
 * ExperimentCard — landing page card for the experiments grid.
 * Anatomy: dark preview area (CSS-only gradient patterns) -> body with
 * system label (EXP_001), status indicator, title, description, tech tags.
 * Hover: lifts 2px with chartreuse left inset shadow.
 * Card entrance: stagger-fade controlled by parent motion container.
 */

/**
 * CSS-only preview patterns per experiment slug.
 * Each returns a CSS background value for the dark preview area.
 */
function getPreviewPattern(slug: string): string {
  switch (slug) {
    case "voice-particles":
      /* Scattered bright dots suggesting a particle field */
      return [
        "radial-gradient(1.5px 1.5px at 20% 30%, #C8FF00 100%, transparent)",
        "radial-gradient(1px 1px at 60% 15%, #22D3EE 100%, transparent)",
        "radial-gradient(1.5px 1.5px at 80% 60%, #FFFFFF 100%, transparent)",
        "radial-gradient(1px 1px at 35% 75%, #C8FF00 100%, transparent)",
        "radial-gradient(1px 1px at 90% 40%, #22D3EE 100%, transparent)",
        "radial-gradient(1.5px 1.5px at 10% 55%, #FFFFFF 100%, transparent)",
        "radial-gradient(1px 1px at 50% 85%, #C8FF00 100%, transparent)",
        "radial-gradient(1px 1px at 75% 25%, #FFFFFF 100%, transparent)",
        "radial-gradient(1.5px 1.5px at 45% 45%, #22D3EE 100%, transparent)",
        "radial-gradient(1px 1px at 15% 90%, #C8FF00 100%, transparent)",
        "radial-gradient(1px 1px at 65% 70%, #FFFFFF 100%, transparent)",
        "radial-gradient(1.5px 1.5px at 30% 10%, #22D3EE 100%, transparent)",
      ].join(", ");

    case "gesture-fluid":
      /* Swirling gradient suggesting fluid dynamics */
      return [
        "radial-gradient(ellipse 120px 80px at 30% 40%, rgba(99, 102, 241, 0.4), transparent)",
        "radial-gradient(ellipse 100px 120px at 70% 60%, rgba(139, 92, 246, 0.35), transparent)",
        "radial-gradient(ellipse 80px 60px at 50% 30%, rgba(59, 130, 246, 0.3), transparent)",
        "radial-gradient(ellipse 60px 90px at 80% 20%, rgba(168, 85, 247, 0.25), transparent)",
      ].join(", ");

    case "crowd-flow":
      /* Small dots in flow lanes suggesting crowd movement */
      return [
        /* Lane 1 — left-to-right flow */
        "radial-gradient(2px 2px at 10% 25%, #F59E0B 100%, transparent)",
        "radial-gradient(2px 2px at 25% 27%, #F59E0B 100%, transparent)",
        "radial-gradient(2px 2px at 40% 24%, #22C55E 100%, transparent)",
        "radial-gradient(2px 2px at 55% 26%, #F59E0B 100%, transparent)",
        "radial-gradient(2px 2px at 70% 25%, #22C55E 100%, transparent)",
        "radial-gradient(2px 2px at 85% 28%, #F59E0B 100%, transparent)",
        /* Lane 2 — offset */
        "radial-gradient(2px 2px at 15% 50%, #22C55E 100%, transparent)",
        "radial-gradient(2px 2px at 30% 52%, #22C55E 100%, transparent)",
        "radial-gradient(2px 2px at 45% 49%, #F59E0B 100%, transparent)",
        "radial-gradient(2px 2px at 60% 51%, #22C55E 100%, transparent)",
        "radial-gradient(2px 2px at 75% 50%, #F59E0B 100%, transparent)",
        /* Lane 3 */
        "radial-gradient(2px 2px at 20% 75%, #F59E0B 100%, transparent)",
        "radial-gradient(2px 2px at 35% 73%, #22C55E 100%, transparent)",
        "radial-gradient(2px 2px at 50% 76%, #22C55E 100%, transparent)",
        "radial-gradient(2px 2px at 65% 74%, #F59E0B 100%, transparent)",
        "radial-gradient(2px 2px at 80% 75%, #22C55E 100%, transparent)",
      ].join(", ");

    case "routines-repo-audit":
      /* Terminal-style pattern: horizontal lines of dots suggesting log output,
         chartreuse accent line at top to suggest a running process. */
      return [
        /* Chartreuse top accent stripe */
        "linear-gradient(to right, #C8FF00 0%, #C8FF00 100%) 0 0 / 100% 2px no-repeat",
        /* Dim log-line rows */
        "linear-gradient(to right, rgba(75,85,99,0.6) 0%, rgba(75,85,99,0.6) 45%, transparent 45%) 20px 24px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(34,197,94,0.5) 0%, rgba(34,197,94,0.5) 8%, transparent 8%) 20px 36px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(75,85,99,0.5) 0%, rgba(75,85,99,0.5) 60%, transparent 60%) 20px 48px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(245,158,11,0.5) 0%, rgba(245,158,11,0.5) 38%, transparent 38%) 20px 60px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(75,85,99,0.4) 0%, rgba(75,85,99,0.4) 52%, transparent 52%) 20px 72px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.4) 22%, transparent 22%) 20px 84px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(75,85,99,0.3) 0%, rgba(75,85,99,0.3) 70%, transparent 70%) 20px 96px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(248,113,113,0.4) 0%, rgba(248,113,113,0.4) 28%, transparent 28%) 20px 108px / 200px 1px no-repeat",
        "linear-gradient(to right, rgba(200,255,0,0.6) 0%, rgba(200,255,0,0.6) 55%, transparent 55%) 20px 144px / 200px 1px no-repeat",
      ].join(", ");

    default:
      return "none";
  }
}

export function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const prefersReduced = useReducedMotion();

  /** Hover in — lift + chartreuse inset shadow (no layout shift) */
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transform = "translateY(-2px)";
    el.style.boxShadow = "inset 3px 0 0 0 var(--v2-accent), var(--v2-shadow-hover)";
    el.style.borderColor = "var(--v2-border-hover)";
  }, []);

  /** Hover out — restore resting state */
  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transform = "translateY(0)";
    el.style.boxShadow = "var(--v2-shadow)";
    el.style.borderColor = "var(--v2-border)";
  }, []);

  return (
    <motion.div
      /* Stagger-fade entrance — parent sets staggerChildren */
      variants={
        prefersReduced
          ? undefined
          : {
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }
      }
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Link
        href={`/playground/${experiment.slug}`}
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          background: "var(--v2-bg-surface)",
          border: "1px solid var(--v2-border)",
          borderRadius: "4px",
          boxShadow: "var(--v2-shadow)",
          overflow: "hidden",
          cursor: "pointer",
          transition:
            "box-shadow 0.25s ease, border-color 0.25s ease, transform 0.15s ease",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Dark preview area — CSS-only abstract pattern */}
        <div
          aria-hidden="true"
          style={{
            height: "180px",
            background: `var(--exp-canvas-bg)`,
            backgroundImage: getPreviewPattern(experiment.slug),
            borderRadius: "4px 4px 0 0",
            overflow: "hidden",
          }}
        />

        {/* Card body */}
        <div style={{ padding: "var(--v2-space-lg)" }}>
          {/* System label + status row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--v2-space-sm)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--v2-text-tertiary)",
                letterSpacing: "var(--v2-letter-spacing-wide)",
                textTransform: "uppercase",
              }}
            >
              {experiment.experimentNumber}
            </span>
            <StatusIndicator status={experiment.status} />
          </div>

          {/* Title */}
          <h3
            style={{
              fontFamily: "var(--v2-font-display)",
              fontSize: "var(--v2-font-size-lg)",
              fontWeight: 600,
              color: "var(--v2-text-primary)",
              textTransform: "uppercase",
              letterSpacing: "var(--v2-letter-spacing-tight)",
              lineHeight: 1.2,
              marginBottom: "var(--v2-space-sm)",
              margin: "0 0 var(--v2-space-sm) 0",
            }}
          >
            {experiment.title}
          </h3>

          {/* Description — 3-line clamp */}
          <p
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "var(--v2-font-size-sm)",
              color: "var(--v2-text-secondary)",
              lineHeight: 1.5,
              marginBottom: "var(--v2-space-md)",
              margin: "0 0 var(--v2-space-md) 0",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {experiment.description}
          </p>

          {/* Tech tags */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--v2-space-xs)",
            }}
          >
            {experiment.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--v2-tag-color)",
                  background: "var(--v2-tag-bg)",
                  border: "1px solid var(--v2-tag-border)",
                  borderRadius: "2px",
                  padding: "2px 8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Publication date — mirrors ProjectCardV2 bottom metadata line.
              experimentNumber is already shown as the top system label so
              this line shows date only (no double-up). Format: YYYY.MM.DD. */}
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.02em",
              marginTop: "var(--v2-space-sm)",
            }}
          >
            {(() => {
              const [yyyy, mm, dd] = experiment.createdAt.split("-");
              return `${yyyy}.${mm}.${dd}`;
            })()}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
