"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import experimentsData from "@/data/experiments.json";
import type { Experiment } from "@/types/experiment";
import { ExperimentCard } from "./ExperimentCard";
import { WebGPUBanner } from "./WebGPUCheck";
import { useTextScramble } from "@/components/v2/useTextScramble";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/**
 * ExperimentsLanding — hero section + filterable card grid for the experiments index.
 * Hero: system label, LIVE EXPERIMENTS headline with text scramble, subtitle.
 * Filter: "All" + one tab per unique collection slug. Active tab highlighted with
 *   underline (mirrors ProjectGridV2 category tabs exactly).
 * Grid: 3-col desktop, 2-col tablet, 1-col mobile with stagger-fade entrance.
 * Counter: mono/xs/tertiary "{n} experiment(s) loaded" line below the grid.
 * WebGPU browser support banner shown when navigator.gpu is unavailable.
 */

/**
 * Sorted experiment list — newest first.
 * Computed once at module level; filter operates on this pre-sorted array so
 * newest-first order is preserved within each filtered view.
 */
const experiments = (experimentsData as Experiment[])
  .slice()
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/**
 * Maps a collection slug to its display label.
 * "agent-ops" uses the dot-separator pattern matching the editorial mono style used
 * elsewhere on Labs (e.g. "PLAYGROUND // EXPERIMENTS"). All others are uppercased.
 */
function collectionLabel(slug: string): string {
  const overrides: Record<string, string> = {
    "agent-ops": "AGENT.OPS",
  };
  return overrides[slug] ?? slug.toUpperCase();
}

/** Stagger container for card entrance animation — re-triggered on filter change via `key` */
const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export function ExperimentsLanding() {
  const prefersReduced = useReducedMotion();

  /** Active filter — "all" shows every experiment, otherwise filters by collection slug */
  const [activeCollection, setActiveCollection] = useState<string>("all");

  /** Ghost Type scramble on the headline */
  const headline = useTextScramble("Live Experiments", {
    delay: 100,
    enabled: true,
    sessionKey: "ghost-type-exp-hero",
  });

  /**
   * Derive unique collection slugs from the full sorted list, preserving insertion
   * order so tabs appear in a stable, data-driven sequence.
   */
  const collections = useMemo(
    () => Array.from(new Set(experiments.map((e) => e.collection))),
    []
  );

  /** Filtered experiment list — operates on the pre-sorted `experiments` array */
  const filteredExperiments = useMemo(
    () =>
      activeCollection === "all"
        ? experiments
        : experiments.filter((e) => e.collection === activeCollection),
    [activeCollection]
  );

  return (
    <>
      {/* Hero section */}
      <section
        className="max-w-7xl mx-auto w-full px-6"
        style={{
          paddingTop: "var(--v2-space-4xl)",
          paddingBottom: "var(--v2-space-3xl)",
        }}
      >
        {/* System label */}
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            margin: 0,
            marginBottom: "var(--v2-space-xl)",
            textTransform: "uppercase",
          }}
        >
          PLAYGROUND // EXPERIMENTS
        </p>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--v2-font-display)",
            fontSize:
              "clamp(var(--v2-font-size-3xl), 5vw, var(--v2-font-size-4xl))",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "var(--v2-letter-spacing-tighter)",
            color: "var(--v2-text-primary)",
            margin: 0,
            marginBottom: "var(--v2-space-lg)",
            textTransform: "uppercase",
          }}
        >
          {headline.text}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--v2-font-body)",
            fontSize: "var(--v2-font-size-base)",
            lineHeight: 1.6,
            color: "var(--v2-text-secondary)",
            maxWidth: "640px",
            margin: 0,
          }}
        >
          WebGPU simulations, agentic systems, real-time interfaces. Built in
          public, shipped imperfect.
        </p>
      </section>

      {/* Filter tabs + grid section */}
      <section className="max-w-7xl mx-auto w-full px-6">
        {/* Collection filter tabs — horizontally scrollable on mobile, wrapping on desktop.
            Mirrors ProjectGridV2 category tab implementation exactly. */}
        <div
          className="flex gap-4 md:gap-6 md:flex-wrap overflow-x-auto"
          style={{
            marginBottom: "var(--v2-space-2xl)",
            borderBottom: "1px solid var(--v2-border)",
            paddingBottom: "var(--v2-space-sm)",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          role="tablist"
          aria-label="Filter experiments by collection"
        >
          {/* "All" tab */}
          {(["all", ...collections] as string[]).map((slug) => {
            const isTabActive = activeCollection === slug;
            const label = slug === "all" ? "ALL" : collectionLabel(slug);
            return (
              <button
                key={slug}
                role="tab"
                aria-selected={isTabActive}
                onClick={() => setActiveCollection(slug)}
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: isTabActive
                    ? "var(--v2-text-primary)"
                    : "var(--v2-text-tertiary)",
                  background: "none",
                  border: "none",
                  borderBottom: isTabActive
                    ? "2px solid var(--v2-text-primary)"
                    : "2px solid transparent",
                  padding: "var(--v2-space-md) 0",
                  cursor: "pointer",
                  transition: "color 0.2s ease, border-color 0.2s ease",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isTabActive)
                    e.currentTarget.style.color = "var(--v2-text-secondary)";
                }}
                onMouseLeave={(e) => {
                  if (!isTabActive)
                    e.currentTarget.style.color = "var(--v2-text-tertiary)";
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Card grid — re-triggers stagger entrance on collection change via `key` */}
        <motion.div
          key={activeCollection}
          variants={prefersReduced ? undefined : gridVariants}
          initial={prefersReduced ? undefined : "hidden"}
          animate={prefersReduced ? undefined : "visible"}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            /* align-items: stretch ensures every grid cell fills the row's implicit
               track height, giving cards equal height. */
            alignItems: "stretch",
            gap: "var(--v2-space-lg)",
            marginBottom: "var(--v2-space-lg)",
          }}
          className="exp-card-grid"
        >
          {filteredExperiments.length > 0 ? (
            filteredExperiments.map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} />
            ))
          ) : (
            /* Empty state — rendered when a collection filter returns no results */
            <p
              style={{
                gridColumn: "1 / -1",
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--v2-text-tertiary)",
                letterSpacing: "0.04em",
                margin: 0,
                paddingTop: "var(--v2-space-xl)",
                paddingBottom: "var(--v2-space-xl)",
              }}
            >
              no experiments in this collection yet
            </p>
          )}
        </motion.div>

        {/* Experiment counter — mono/xs/tertiary, mirrors ProjectGridV2 module counter */}
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            marginBottom: "var(--v2-space-3xl)",
            letterSpacing: "0.04em",
          }}
        >
          {filteredExperiments.length} experiment
          {filteredExperiments.length !== 1 ? "s" : ""} loaded
        </p>

        {/* Browser support banner — only shown when WebGPU unavailable */}
        <WebGPUBanner />
      </section>

      {/* Responsive grid overrides */}
      <style>{`
        @media (max-width: 639px) {
          .exp-card-grid {
            grid-template-columns: 1fr !important;
            gap: var(--v2-space-md) !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .exp-card-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 767px) {
          section[class*="px-6"] {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
        .exp-card-grid::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
