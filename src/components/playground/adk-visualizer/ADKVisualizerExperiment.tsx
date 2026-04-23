"use client";

/**
 * ADKVisualizerExperiment — root component for EXP_007 (ADK Visualizer).
 *
 * Rendered via next/dynamic (ssr: false) from ExperimentDetail so React Flow
 * and browser-only APIs never run on the server.
 *
 * Composition:
 *   ADKVisualizerExperiment
 *   └── ADKCanvas
 *       ├── ReactFlow (with NODE_TYPES, EDGE_TYPES)
 *       ├── TopologySelector (monolithic / orchestrated toggle)
 *       └── AnnotationPanel (SSE streaming)
 */

import { ADKCanvas } from "./ADKCanvas";

export function ADKVisualizerExperiment() {
  return (
    <section
      aria-label="ADK Visualizer experiment"
      style={{ width: "100%" }}
    >
      <ADKCanvas />
    </section>
  );
}
