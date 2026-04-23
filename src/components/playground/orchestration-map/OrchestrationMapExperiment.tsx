"use client";

/**
 * OrchestrationMapExperiment — root component for EXP_008 (Agent Orchestration Map).
 *
 * Rendered via next/dynamic (ssr: false) from ExperimentDetail.
 *
 * Composition:
 *   OrchestrationMapExperiment
 *   └── OrchestrationCanvas
 *       ├── NodePalette (drag source)
 *       ├── ReactFlow (drag target, with NODE_TYPES, EDGE_TYPES)
 *       ├── ExportControls (JSON + PNG)
 *       └── AnnotationPanel (SSE streaming, topology-aware)
 */

import { OrchestrationCanvas } from "./OrchestrationCanvas";

export function OrchestrationMapExperiment() {
  return (
    <section
      aria-label="Agent Orchestration Map experiment"
      style={{ width: "100%" }}
    >
      <OrchestrationCanvas />
    </section>
  );
}
