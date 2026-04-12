"use client";

import { motion } from "framer-motion";
import experimentsData from "@/data/experiments.json";
import type { Experiment } from "@/types/experiment";
import { ExperimentCard } from "./ExperimentCard";
import { WebGPUBanner } from "./WebGPUCheck";
import { useTextScramble } from "@/components/v2/useTextScramble";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/**
 * ExperimentsLanding — hero section + card grid for the experiments index.
 * Hero: system label, GPU PLAYGROUND headline with text scramble, subtitle.
 * Grid: 3-col desktop, 2-col tablet, 1-col mobile with stagger-fade entrance.
 * WebGPU browser support banner shown when navigator.gpu is unavailable.
 */

const experiments = experimentsData as Experiment[];

/** Stagger container for card entrance animation */
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

  /** Ghost Type scramble on the headline */
  const headline = useTextScramble("GPU Playground", {
    delay: 100,
    enabled: true,
    sessionKey: "ghost-type-exp-hero",
  });

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
          PLAYGROUND // WEBGPU.COMPUTE
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
          Technical experiments exploring emerging browser capabilities. WebGPU
          compute shaders, real-time simulations, and interactive
          visualizations.
        </p>
      </section>

      {/* Card grid */}
      <section className="max-w-7xl mx-auto w-full px-6">
        <motion.div
          variants={prefersReduced ? undefined : gridVariants}
          initial={prefersReduced ? undefined : "hidden"}
          animate={prefersReduced ? undefined : "visible"}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--v2-space-lg)",
            marginBottom: "var(--v2-space-3xl)",
          }}
          className="exp-card-grid"
        >
          {experiments.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </motion.div>

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
      `}</style>
    </>
  );
}
