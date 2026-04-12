"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
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
};

/** Map input types to their descriptive requirement text. */
const INPUT_LABELS: Record<string, string> = {
  Microphone: "REQUIRES MICROPHONE ACCESS",
  Camera: "REQUIRES CAMERA ACCESS",
  "Mouse / Touch": "MOUSE OR TOUCH INPUT",
};

export function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  /** Format experiment number for breadcrumb display, e.g. EXP_001 -> 001 */
  const expNum = experiment.experimentNumber.replace("EXP_", "");

  /** Look up the live experiment component by slug — undefined means placeholder */
  const ExperimentComponent = EXPERIMENT_COMPONENTS[experiment.slug] ?? null;

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
              href="/experiments"
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
              EXPERIMENTS
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{experiment.experimentNumber}</li>
        </ol>
      </nav>

      {/* Concept header */}
      <section
        className="max-w-7xl mx-auto w-full px-6"
        style={{
          paddingTop: "var(--v2-space-lg)",
          paddingBottom: "var(--v2-space-lg)",
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
          <StatusIndicator status={experiment.status} />
        </div>
      </section>

      {/* Experiment canvas area — renders live component or placeholder */}
      <section
        style={{
          width: "100%",
          margin: "var(--v2-space-lg) 0",
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
          href="/experiments"
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
          &larr; BACK TO EXPERIMENTS
        </Link>
      </section>
    </>
  );
}
