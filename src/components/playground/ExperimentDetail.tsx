"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import type { Experiment } from "@/types/experiment";
import { StatusIndicator } from "./StatusIndicator";

/**
 * ExperimentDetail — renders individual experiment pages.
 * Displays breadcrumb navigation, header (system label, title,
 * description, input indicator badge), and either a live experiment
 * canvas or a "coming soon" placeholder depending on experiment status.
 *
 * Live experiments are loaded via next/dynamic with ssr: false to avoid
 * server-side rendering of Three.js / browser-only APIs.
 */

/**
 * Map of experiment slugs to their dynamically imported canvas components.
 * Each entry uses next/dynamic with ssr: false so Three.js and Web Audio API
 * are only loaded client-side. Add new experiments here as they are built.
 */
/** Loading placeholder shared across all experiment dynamic imports. */
const LOADING_PLACEHOLDER = () => (
  <div
    style={{
      width: "100%",
      height: "clamp(300px, 70vh, 800px)",
      background: "var(--exp-canvas-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <p
      style={{
        fontFamily: "var(--v2-font-mono)",
        fontSize: "var(--v2-font-size-xs)",
        color: "var(--exp-glass-text-muted)",
        letterSpacing: "var(--v2-letter-spacing-wide)",
        textTransform: "uppercase",
      }}
    >
      LOADING EXPERIMENT...
    </p>
  </div>
);

const EXPERIMENT_COMPONENTS: Record<
  string,
  ReturnType<typeof dynamic>
> = {
  "voice-particles": dynamic(
    () =>
      import("./voice-particles/VoiceParticleCanvas").then(
        (mod) => mod.VoiceParticleCanvas
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  "crowd-flow": dynamic(
    () =>
      import("./crowd-flow/CrowdFlowCanvas").then(
        (mod) => mod.CrowdFlowCanvas
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  "gesture-fluid": dynamic(
    () =>
      import("./gesture-fluid/GestureFluidCanvas").then(
        (mod) => mod.GestureFluidCanvas
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  /* EXP_004: Routines Repo Audit — terminal replay, no WebGPU/Three.js required */
  "routines-repo-audit": dynamic(
    () =>
      import("./routines-repo-audit/AuditTerminal").then(
        (mod) => mod.AuditTerminal
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  /* EXP_005: Autonomous Brand Pipeline — config form, SSE execution trace, result cards */
  "autonomous-brand-pipeline": dynamic(
    () =>
      import("./autonomous-brand-pipeline/BrandPipelineExperiment").then(
        (mod) => mod.BrandPipelineExperiment
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  /* EXP_006: Generative UI Renderer — SSE block stream, progressive canvas */
  "generative-ui-renderer": dynamic(
    () =>
      import("./generative-ui-renderer/GenerativeUIExperiment").then(
        (mod) => mod.GenerativeUIExperiment
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  /* EXP_007: ADK Visualizer — React Flow diagram, SSE annotation */
  "adk-visualizer": dynamic(
    () =>
      import("./adk-visualizer/ADKVisualizerExperiment").then(
        (mod) => mod.ADKVisualizerExperiment
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  /* EXP_008: Agent Orchestration Map — drag-and-drop builder, SSE annotation */
  "orchestration-map": dynamic(
    () =>
      import("./orchestration-map/OrchestrationMapExperiment").then(
        (mod) => mod.OrchestrationMapExperiment
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
  /* EXP_009: Agentic Reliability Dashboard — SSE benchmark runner, 3-column task grid.
     Imports DashboardClient (the thin next/dynamic wrapper) from the exp_009 component
     directory. DashboardClient itself loads Dashboard with ssr: false, satisfying
     Next.js 16+ Turbopack's requirement that ssr:false be declared inside a Client
     Component. Re-using the existing component — no duplication. */
  "agentic-reliability": dynamic(
    () =>
      import("../experiments/exp_009/DashboardClient").then(
        (mod) => mod.DashboardClient
      ),
    {
      ssr: false,
      loading: LOADING_PLACEHOLDER,
    }
  ),
};

/** Map input types to their descriptive requirement text. */
const INPUT_LABELS: Record<string, string> = {
  Microphone: "REQUIRES MICROPHONE ACCESS",
  Camera: "REQUIRES CAMERA ACCESS",
  "Mouse / Touch": "MOUSE OR TOUCH INPUT",
  "Text": "TEXT INPUT",
  None: "NO INPUT REQUIRED — READ ONLY",
};

/**
 * Run status for "Click to run" experiments.
 * Received via the `playground:experiment-status` custom event emitted by
 * the mounted experiment component (e.g. Dashboard). The pill button is
 * disabled while status is "running" so users cannot double-trigger a run.
 */
type RunStatus = "idle" | "running" | "done";

export function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  /** Format experiment number for breadcrumb display, e.g. EXP_001 -> 001 */
  const expNum = experiment.experimentNumber.replace("EXP_", "");

  /** Look up the live experiment component by slug — undefined means placeholder */
  const ExperimentComponent = EXPERIMENT_COMPONENTS[experiment.slug] ?? null;

  /**
   * Run status for "Click to run" pill — mirrors the mounted experiment's
   * own status, received via playground:experiment-status custom events.
   * Only relevant when inputType === "Click to run"; harmlessly idle otherwise.
   */
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");

  /**
   * Dispatch the run trigger event and update local status to "running".
   * The mounted experiment (e.g. Dashboard) listens for playground:experiment-run
   * and executes the actual POST + SSE flow. The pill is disabled while running
   * so duplicate dispatches are blocked at source.
   */
  const handleRunClick = useCallback(() => {
    if (runStatus === "running") return;
    setRunStatus("running");
    window.dispatchEvent(
      new CustomEvent("playground:experiment-run", {
        detail: { slug: experiment.slug },
      })
    );
  }, [runStatus, experiment.slug]);

  /**
   * Listen for status feedback from the mounted experiment component.
   * The experiment emits playground:experiment-status events on each transition
   * (idle → running → done). ExperimentDetail stays experiment-agnostic:
   * it only checks detail.slug so the pattern works for any future experiment
   * that adopts the "Click to run" inputType.
   */
  useEffect(() => {
    if (experiment.inputType !== "Click to run") return;

    function onStatus(e: Event) {
      const ev = e as CustomEvent<{ slug: string; status: RunStatus }>;
      if (ev.detail.slug !== experiment.slug) return;
      setRunStatus(ev.detail.status);
    }

    window.addEventListener("playground:experiment-status", onStatus);
    return () => {
      window.removeEventListener("playground:experiment-status", onStatus);
    };
  }, [experiment.slug, experiment.inputType]);

  return (
    <>
      {/* Breadcrumb navigation */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-7xl mx-auto w-full px-6"
        style={{
          padding: "var(--v2-space-md) 0",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <ol
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--v2-space-xs)",
            listStyle: "none",
            margin: 0,
            padding: 0,
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
          }}
        >
          <li>
            <Link
              href="/"
              style={{
                color: "var(--v2-text-tertiary)",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--v2-text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--v2-text-tertiary)")
              }
            >
              LABS
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/playground"
              style={{
                color: "var(--v2-text-tertiary)",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--v2-text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--v2-text-tertiary)")
              }
            >
              PLAYGROUND
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{experiment.experimentNumber}</li>
        </ol>
      </nav>

      {/* Concept header.
          paddingBottom: 0 so dark-background experiments (EXP_009) have no
          light-bg strip between the header's last element and the canvas edge.
          Internal content spacing is handled by each child element's own margins.
          paddingTop preserved for separation from the breadcrumb nav above. */}
      <section
        className="max-w-7xl mx-auto w-full px-6"
        style={{
          paddingTop: "var(--v2-space-lg)",
          paddingBottom: 0,
        }}
      >
        {/* System label */}
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
            margin: "0 0 var(--v2-space-sm) 0",
          }}
        >
          {"EXPERIMENT_"}
          {expNum}
          {" // "}
          {experiment.title.toUpperCase().replace(/ /g, ".")}
        </p>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--v2-font-display)",
            fontSize:
              "clamp(var(--v2-font-size-2xl), 4vw, var(--v2-font-size-3xl))",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "var(--v2-letter-spacing-tighter)",
            color: "var(--v2-text-primary)",
            textTransform: "uppercase",
            margin: "0 0 var(--v2-space-sm) 0",
          }}
        >
          {experiment.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontFamily: "var(--v2-font-body)",
            fontSize: "var(--v2-font-size-base)",
            color: "var(--v2-text-secondary)",
            lineHeight: 1.6,
            maxWidth: "720px",
            margin: "0 0 var(--v2-space-md) 0",
          }}
        >
          {experiment.description}
        </p>

        {/* Input indicator badge + status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--v2-space-md)",
            flexWrap: "wrap",
          }}
        >
          {experiment.inputType === "Click to run" ? (
            /*
             * Interactive pill for "Click to run" experiments.
             * Dispatches playground:experiment-run on click; disabled while
             * the experiment reports status "running" via playground:experiment-status.
             * Rendered as <button> so it is keyboard-focusable and screen-reader
             * announced as a control. Visual styling matches the passive <span>
             * so the pattern is visually consistent with other input-type badges.
             */
            <button
              type="button"
              onClick={handleRunClick}
              disabled={runStatus === "running"}
              aria-label={
                runStatus === "running"
                  ? "Benchmark run in progress"
                  : "Click to start the benchmark run"
              }
              style={{
                /*
                 * Solid chartreuse fill + near-black text — lifted from the
                 * old ControlsStrip "RUN SUITE" button for maximum contrast.
                 * Opacity dims to 0.6 while running so the busy state is clear
                 * without removing the chartreuse fill entirely.
                 */
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--v2-font-display)",
                fontSize: "var(--v2-font-size-xs)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                /* --v2-text-primary = #1A1D23 (near-black) — correct contrast on chartreuse fill.
                   --v2-bg-primary = #F0F2F5 (near-white) — wrong, was prior commit's mistake. */
                color: "var(--v2-text-primary)",
                background: "var(--v2-accent)",
                border: "none",
                padding: "6px 14px",
                borderRadius: "2px",
                cursor: runStatus === "running" ? "not-allowed" : "pointer",
                opacity: runStatus === "running" ? 0.6 : 1,
                transition: "opacity 0.2s ease, box-shadow 0.15s ease",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (runStatus !== "running") {
                  e.currentTarget.style.opacity = "0.85";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(200, 255, 0, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = runStatus === "running" ? "0.6" : "1";
                e.currentTarget.style.boxShadow = "none";
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--v2-accent), 0 0 0 4px var(--v2-bg-primary)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {runStatus === "running" ? "RUNNING…" : "CLICK TO RUN"}
            </button>
          ) : (
            /* Passive badge for all other input types */
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                textTransform: "uppercase",
                color: "var(--v2-text-tertiary)",
                background: "var(--v2-tag-bg)",
                border: "1px solid var(--v2-tag-border)",
                padding: "4px 12px",
                borderRadius: "2px",
              }}
            >
              {/* Input icon — simple unicode indicator */}
              {experiment.inputType === "Microphone" && "🎤"}
              {experiment.inputType === "Camera" && "📷"}
              {experiment.inputType === "Mouse / Touch" && "🖱"}
              {INPUT_LABELS[experiment.inputType] ?? experiment.inputType.toUpperCase()}
            </span>
          )}
          <StatusIndicator status={experiment.status} />
        </div>
      </section>

      {/* Experiment canvas area — renders live component or placeholder.
          margin-top: 0 so dark-background experiments (e.g. EXP_009 Dashboard)
          butt directly against the header section with no page-bg gap visible.
          margin-bottom preserved for breathing room below the canvas. */}
      <section
        style={{
          width: "100%",
          margin: "0 0 var(--v2-space-lg) 0",
          position: "relative",
        }}
      >
        {ExperimentComponent ? (
          <ExperimentComponent />
        ) : (
          /* Placeholder for experiments still in concept phase */
          <div
            style={{
              width: "100%",
              height: "clamp(300px, 70vh, 800px)",
              background: "var(--exp-canvas-bg)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--v2-space-md)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "2px solid var(--v2-accent)",
                borderTopColor: "transparent",
              }}
              aria-hidden="true"
            />
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
              EXPERIMENT COMING SOON
            </p>
            <p
              style={{
                fontFamily: "var(--v2-font-body)",
                fontSize: "var(--v2-font-size-sm)",
                color: "var(--exp-glass-text-muted)",
                margin: 0,
                maxWidth: "400px",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              This experiment is in the concept phase. The WebGPU canvas and
              interactive controls will appear here once development begins.
            </p>
          </div>
        )}
      </section>

      {/* Explanation section — concept, how it works, what it proves */}
      {(experiment.conceptStatement || experiment.howItWorks || experiment.whatItProves) && (
        <section
          className="max-w-7xl mx-auto w-full px-6"
          style={{ padding: "var(--v2-space-3xl) 1.5rem" }}
        >
          <div style={{ maxWidth: "720px" }}>
            {/* Concept statement */}
            {experiment.conceptStatement && (
              <p
                style={{
                  fontFamily: "var(--v2-font-body)",
                  fontSize: "var(--v2-font-size-base)",
                  color: "var(--v2-text-secondary)",
                  lineHeight: 1.7,
                  margin: "0 0 var(--v2-space-2xl) 0",
                }}
              >
                {experiment.conceptStatement}
              </p>
            )}

            {/* How It Works */}
            {experiment.howItWorks && experiment.howItWorks.length > 0 && (
              <>
                <p
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-text-tertiary)",
                    letterSpacing: "var(--v2-letter-spacing-wide)",
                    textTransform: "uppercase",
                    margin: "0 0 var(--v2-space-sm) 0",
                  }}
                >
                  HOW IT WORKS
                </p>
                {experiment.howItWorks.map((section) => (
                  <div key={section.title} style={{ marginBottom: "var(--v2-space-lg)" }}>
                    <h3
                      style={{
                        fontFamily: "var(--v2-font-display)",
                        fontSize: "var(--v2-font-size-base)",
                        fontWeight: 600,
                        color: "var(--v2-text-primary)",
                        margin: "0 0 var(--v2-space-xs) 0",
                      }}
                    >
                      {section.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "var(--v2-font-body)",
                        fontSize: "var(--v2-font-size-sm)",
                        color: "var(--v2-text-secondary)",
                        lineHeight: 1.7,
                        margin: 0,
                      }}
                    >
                      {section.body}
                    </p>
                  </div>
                ))}
              </>
            )}

            {/* What This Experiment Proves */}
            {experiment.whatItProves && experiment.whatItProves.length > 0 && (
              <>
                <p
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-text-tertiary)",
                    letterSpacing: "var(--v2-letter-spacing-wide)",
                    textTransform: "uppercase",
                    margin: "var(--v2-space-2xl) 0 var(--v2-space-sm) 0",
                  }}
                >
                  WHAT THIS PROVES
                </p>
                {experiment.whatItProves.map((paragraph, idx) => (
                  <p
                    key={idx}
                    style={{
                      fontFamily: "var(--v2-font-body)",
                      fontSize: "var(--v2-font-size-sm)",
                      color: "var(--v2-text-secondary)",
                      lineHeight: 1.7,
                      margin: `0 0 ${idx < experiment.whatItProves!.length - 1 ? "var(--v2-space-md)" : "0"} 0`,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {/* Back link */}
      <section
        className="max-w-7xl mx-auto w-full px-6"
        style={{
          paddingTop: "var(--v2-space-3xl)",
          paddingBottom: "var(--v2-space-3xl)",
        }}
      >
        <Link
          href="/playground"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--v2-space-xs)",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            textDecoration: "none",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--v2-text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--v2-text-tertiary)")
          }
        >
          &larr; BACK TO PLAYGROUND
        </Link>
      </section>
    </>
  );
}
