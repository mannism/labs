"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

    case "autonomous-brand-pipeline":
      /* Sequential connected nodes: three dots top-to-bottom joined by faint vertical lines.
         Chartreuse start → cyan mid → white terminus. */
      return [
        /* Connecting line — full vertical spine */
        "linear-gradient(to bottom, rgba(200,255,0,0.25) 0%, rgba(34,211,238,0.2) 50%, rgba(255,255,255,0.15) 100%) 50% 20% / 1px 60% no-repeat",
        /* Node 1 — chartreuse (top) */
        "radial-gradient(5px 5px at 50% 22%, #C8FF00 100%, transparent)",
        "radial-gradient(10px 10px at 50% 22%, rgba(200,255,0,0.15) 100%, transparent)",
        /* Node 2 — cyan (mid) */
        "radial-gradient(5px 5px at 50% 50%, #22D3EE 100%, transparent)",
        "radial-gradient(10px 10px at 50% 50%, rgba(34,211,238,0.15) 100%, transparent)",
        /* Node 3 — white (terminus) */
        "radial-gradient(4px 4px at 50% 78%, #FFFFFF 100%, transparent)",
        "radial-gradient(9px 9px at 50% 78%, rgba(255,255,255,0.12) 100%, transparent)",
      ].join(", ");

    case "adk-visualizer":
      /* Tree/graph: root node branching into two children below.
         Cyan root, chartreuse leaf nodes, thin gradient lines as branches. */
      return [
        /* Left branch line */
        "linear-gradient(to bottom right, rgba(34,211,238,0.3) 0%, rgba(200,255,0,0.2) 100%) 28% 42% / 1px 28% no-repeat",
        /* Right branch line */
        "linear-gradient(to bottom left, rgba(34,211,238,0.3) 0%, rgba(200,255,0,0.2) 100%) 72% 42% / 1px 28% no-repeat",
        /* Root node — cyan */
        "radial-gradient(6px 6px at 50% 30%, #22D3EE 100%, transparent)",
        "radial-gradient(12px 12px at 50% 30%, rgba(34,211,238,0.18) 100%, transparent)",
        /* Child left — chartreuse */
        "radial-gradient(5px 5px at 28% 72%, #C8FF00 100%, transparent)",
        "radial-gradient(10px 10px at 28% 72%, rgba(200,255,0,0.15) 100%, transparent)",
        /* Child right — chartreuse */
        "radial-gradient(5px 5px at 72% 72%, #C8FF00 100%, transparent)",
        "radial-gradient(10px 10px at 72% 72%, rgba(200,255,0,0.15) 100%, transparent)",
      ].join(", ");

    case "orchestration-map":
      /* Sparse constellation: five nodes at irregular positions with connecting lines.
         Mixed accents — chartreuse, cyan, white, amber — non-linear layout. */
      return [
        /* Edge lines between nodes */
        "linear-gradient(to bottom right, rgba(34,211,238,0.2) 0%, rgba(200,255,0,0.15) 100%) 30% 22% / 28% 1px no-repeat",
        "linear-gradient(to right, rgba(255,255,255,0.15) 0%, rgba(245,158,11,0.2) 100%) 50% 55% / 30% 1px no-repeat",
        "linear-gradient(to bottom, rgba(200,255,0,0.2) 0%, rgba(34,211,238,0.15) 100%) 65% 30% / 1px 32% no-repeat",
        "linear-gradient(to bottom left, rgba(245,158,11,0.2) 0%, rgba(255,255,255,0.1) 100%) 42% 40% / 1px 25% no-repeat",
        /* Node A — chartreuse (upper left) */
        "radial-gradient(4px 4px at 22% 25%, #C8FF00 100%, transparent)",
        "radial-gradient(9px 9px at 22% 25%, rgba(200,255,0,0.15) 100%, transparent)",
        /* Node B — cyan (upper right) */
        "radial-gradient(5px 5px at 72% 20%, #22D3EE 100%, transparent)",
        "radial-gradient(10px 10px at 72% 20%, rgba(34,211,238,0.15) 100%, transparent)",
        /* Node C — white (centre) */
        "radial-gradient(4px 4px at 48% 52%, #FFFFFF 100%, transparent)",
        "radial-gradient(8px 8px at 48% 52%, rgba(255,255,255,0.12) 100%, transparent)",
        /* Node D — amber (lower left) */
        "radial-gradient(4px 4px at 30% 75%, #F59E0B 100%, transparent)",
        "radial-gradient(9px 9px at 30% 75%, rgba(245,158,11,0.15) 100%, transparent)",
        /* Node E — chartreuse (lower right) */
        "radial-gradient(3px 3px at 70% 78%, #C8FF00 100%, transparent)",
        "radial-gradient(7px 7px at 70% 78%, rgba(200,255,0,0.12) 100%, transparent)",
      ].join(", ");

    case "generative-ui-renderer":
      /* Faint grid of small rectangles in varying sizes — UI blocks being assembled.
         Low contrast, chartreuse accent on one block, others in white/dim. */
      return [
        /* Row 1 — wide header block */
        "linear-gradient(rgba(200,255,0,0.18), rgba(200,255,0,0.18)) 12% 15% / 76% 10% no-repeat",
        /* Row 2 — two smaller blocks side by side */
        "linear-gradient(rgba(255,255,255,0.08), rgba(255,255,255,0.08)) 12% 32% / 36% 9% no-repeat",
        "linear-gradient(rgba(255,255,255,0.06), rgba(255,255,255,0.06)) 52% 32% / 36% 9% no-repeat",
        /* Row 3 — three narrow blocks */
        "linear-gradient(rgba(255,255,255,0.07), rgba(255,255,255,0.07)) 12% 48% / 22% 8% no-repeat",
        "linear-gradient(rgba(34,211,238,0.1), rgba(34,211,238,0.1)) 37% 48% / 22% 8% no-repeat",
        "linear-gradient(rgba(255,255,255,0.06), rgba(255,255,255,0.06)) 62% 48% / 26% 8% no-repeat",
        /* Row 4 — medium block */
        "linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05)) 12% 63% / 54% 9% no-repeat",
        /* Row 5 — thin footer strip */
        "linear-gradient(rgba(200,255,0,0.08), rgba(200,255,0,0.08)) 12% 78% / 76% 5% no-repeat",
      ].join(", ");

    case "agentic-reliability":
      /* Three parallel vertical columns of small dots: chartreuse / cyan / amber.
         Abstract cue for three-model dashboard — OpenAI / Anthropic / Google. */
      return [
        /* Column 1 — chartreuse dots (left) */
        "radial-gradient(3px 3px at 28% 20%, #C8FF00 100%, transparent)",
        "radial-gradient(3px 3px at 28% 35%, #C8FF00 100%, transparent)",
        "radial-gradient(3px 3px at 28% 50%, rgba(200,255,0,0.6) 100%, transparent)",
        "radial-gradient(3px 3px at 28% 65%, rgba(200,255,0,0.4) 100%, transparent)",
        "radial-gradient(3px 3px at 28% 80%, rgba(200,255,0,0.2) 100%, transparent)",
        /* Column 2 — cyan dots (centre) */
        "radial-gradient(3px 3px at 50% 20%, #22D3EE 100%, transparent)",
        "radial-gradient(3px 3px at 50% 35%, #22D3EE 100%, transparent)",
        "radial-gradient(3px 3px at 50% 50%, rgba(34,211,238,0.7) 100%, transparent)",
        "radial-gradient(3px 3px at 50% 65%, rgba(34,211,238,0.4) 100%, transparent)",
        "radial-gradient(3px 3px at 50% 80%, rgba(34,211,238,0.2) 100%, transparent)",
        /* Column 3 — amber dots (right) */
        "radial-gradient(3px 3px at 72% 20%, #F59E0B 100%, transparent)",
        "radial-gradient(3px 3px at 72% 35%, #F59E0B 100%, transparent)",
        "radial-gradient(3px 3px at 72% 50%, rgba(245,158,11,0.6) 100%, transparent)",
        "radial-gradient(3px 3px at 72% 65%, rgba(245,158,11,0.4) 100%, transparent)",
        "radial-gradient(3px 3px at 72% 80%, rgba(245,158,11,0.2) 100%, transparent)",
        /* Faint vertical guide lines for each column */
        "linear-gradient(to bottom, rgba(200,255,0,0.08) 0%, transparent 100%) 28% 0 / 1px 100% no-repeat",
        "linear-gradient(to bottom, rgba(34,211,238,0.08) 0%, transparent 100%) 50% 0 / 1px 100% no-repeat",
        "linear-gradient(to bottom, rgba(245,158,11,0.08) 0%, transparent 100%) 72% 0 / 1px 100% no-repeat",
      ].join(", ");

    default:
      return "none";
  }
}

/**
 * ExperimentVideoPreview — renders a looping WebM preview clip inside the
 * 180px-tall card preview area when `src` is provided.
 *
 * Behaviour matrix:
 *   • `src` absent               → CSS pattern (getPreviewPattern)
 *   • `src` present + reduced    → CSS pattern (no video fetched — avoids bandwidth
 *                                   waste for users who have opted out of motion)
 *   • `src` present + no reduced → <video> autoplay loop; onError → CSS pattern
 *   • below viewport             → preload="none" until card enters viewport,
 *                                   then preload="metadata" + play() (lazy-load)
 *
 * The video element is aria-hidden="true" — it is a decorative preview,
 * not meaningful content. All meaningful content is in the card body below.
 */
function ExperimentVideoPreview({
  src,
  slug,
  prefersReduced,
}: {
  src: string;
  slug: string;
  prefersReduced: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Falls back to CSS pattern when video errors out at runtime. */
  const [hasError, setHasError] = useState(false);
  /** Tracks whether the card has entered the viewport (lazy-load gate). */
  const [inView, setInView] = useState(false);

  /** IntersectionObserver — set inView when card is within 200px of viewport. */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * Once in view, promote preload to "metadata" and trigger play.
   * Play returns a Promise — catch is required to silence AbortError
   * when the component unmounts before play resolves (React StrictMode
   * double-invoke, fast navigation, etc).
   */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !inView) return;

    el.preload = "metadata";
    el.play().catch(() => {
      /* AbortError on unmount — not a failure, no fallback needed. */
    });
  }, [inView]);

  /** Runtime error handler — swap to CSS pattern. */
  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  /* Reduced-motion or runtime error → CSS-only pattern. */
  if (prefersReduced || hasError) {
    return (
      <div
        aria-hidden="true"
        style={{
          height: "180px",
          background: "var(--exp-canvas-bg)",
          backgroundImage: getPreviewPattern(slug),
          borderRadius: "4px 4px 0 0",
          overflow: "hidden",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        height: "180px",
        background: "var(--exp-canvas-bg)",
        borderRadius: "4px 4px 0 0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        autoPlay
        loop
        playsInline
        /**
         * preload="none" on mount — do not fetch until IntersectionObserver
         * fires (set inView → true → useEffect upgrades to "metadata" + play).
         * First-row cards will be in view on mount, so the upgrade fires
         * immediately; below-fold cards wait until they scroll close.
         */
        preload="none"
        aria-hidden="true"
        onError={handleError}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
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
      /* Stagger-fade entrance — parent sets staggerChildren.
         height: 100% propagates the grid cell's stretch to the Link below. */
      variants={
        prefersReduced
          ? undefined
          : {
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }
      }
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ height: "100%" }}
    >
      <Link
        href={`/playground/${experiment.slug}`}
        style={{
          /* flex column so the body section can grow to fill card height,
             pinning the date line to the bottom via margin-top: auto */
          display: "flex",
          flexDirection: "column",
          height: "100%",
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
        {/* Preview area — video clip when available, CSS pattern as fallback */}
        {experiment.previewVideo ? (
          <ExperimentVideoPreview
            src={experiment.previewVideo}
            slug={experiment.slug}
            prefersReduced={prefersReduced}
          />
        ) : (
          /* No previewVideo field → CSS-only pattern (all cards in current main) */
          <div
            aria-hidden="true"
            style={{
              height: "180px",
              background: "var(--exp-canvas-bg)",
              backgroundImage: getPreviewPattern(experiment.slug),
              borderRadius: "4px 4px 0 0",
              overflow: "hidden",
            }}
          />
        )}

        {/* Card body — flex column, grows to fill remaining card height */}
        <div
          style={{
            padding: "var(--v2-space-lg)",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
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
              this line shows date only (no double-up). Format: YYYY.MM.DD.
              margin-top: auto pins this to the card bottom regardless of description length. */}
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.02em",
              marginTop: "auto",
              paddingTop: "var(--v2-space-sm)",
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
