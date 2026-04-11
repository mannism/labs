"use client";

import Link from "next/link";
import type { Experiment } from "@/types/experiment";
import { StatusIndicator } from "./StatusIndicator";

/**
 * ExperimentDetail — scaffold for individual experiment pages.
 * Renders breadcrumb navigation, concept header (system label, title,
 * description, input indicator badge), dark canvas placeholder area,
 * and a "coming soon" message where the WebGPU demo will go.
 *
 * The canvas area uses the pattern that will later accept a dynamically
 * imported Three.js component via next/dynamic with ssr: false.
 */

/** Map input types to their descriptive requirement text. */
const INPUT_LABELS: Record<string, string> = {
  Microphone: "REQUIRES MICROPHONE ACCESS",
  Camera: "REQUIRES CAMERA ACCESS",
  "Mouse / Touch": "MOUSE OR TOUCH INPUT",
};

export function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  /** Format experiment number for breadcrumb display, e.g. EXP_001 -> 001 */
  const expNum = experiment.experimentNumber.replace("EXP_", "");

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

      {/* Canvas placeholder area — will host WebGPU canvas via next/dynamic */}
      <section
        style={{
          width: "100%",
          height: "clamp(300px, 70vh, 800px)",
          background: "var(--exp-canvas-bg)",
          margin: "var(--v2-space-lg) 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--v2-space-md)",
          position: "relative",
        }}
      >
        {/* Placeholder content — replaced by live canvas when experiment is built */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "2px solid var(--v2-accent)",
            borderTopColor: "transparent",
            /* Static in scaffold — will animate when experiment loads */
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
      </section>

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
