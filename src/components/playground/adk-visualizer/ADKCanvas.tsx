"use client";

/**
 * ADKCanvas — React Flow canvas for EXP_007 (ADK Visualizer).
 *
 * Renders the active topology (monolithic or orchestrated) as an interactive
 * diagram. Node clicks trigger annotation streaming via AnnotationPanel.
 * Edge clicks also trigger annotation. Canvas state (zoom, pan) is preserved
 * across topology switches.
 *
 * Layout:
 *   - Canvas fills its container height (set by parent)
 *   - AnnotationPanel overlays the right ~28% of the canvas
 *   - TopologySelector is positioned top-left in the canvas overlay zone
 *
 * Accessibility:
 *   - Canvas container has role="application" with aria-label
 *   - Individual nodes have role="button" and aria-label
 *   - AnnotationPanel uses aria-live for streaming text
 */

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NODE_TYPES } from "@/components/playground/shared/flow-nodes";
import { EDGE_TYPES } from "@/components/playground/shared/flow-edges";
import { AnnotationPanel } from "@/components/playground/shared/AnnotationPanel";
import { TopologySelector, type TopologyType } from "./TopologySelector";
import { useAnnotationStream } from "@/hooks/useAnnotationStream";
import type { NodeElementData, EdgeElementData } from "@/lib/prompts/orchestrationAnnotation";

import {
  MONOLITHIC_NODES,
  MONOLITHIC_EDGES,
  ORCHESTRATED_NODES,
  ORCHESTRATED_EDGES,
} from "@/data/experiments/adkTopology";

/** Resolved topology for the active tab. */
function getTopology(
  type: TopologyType
): { nodes: Node[]; edges: Edge[] } {
  if (type === "monolithic") {
    return {
      nodes: MONOLITHIC_NODES as Node[],
      edges: MONOLITHIC_EDGES as Edge[],
    };
  }
  return {
    nodes: ORCHESTRATED_NODES as Node[],
    edges: ORCHESTRATED_EDGES as Edge[],
  };
}

export function ADKCanvas() {
  const [activeTopology, setActiveTopology] = useState<TopologyType>("monolithic");
  const [selectedElementLabel, setSelectedElementLabel] = useState<string | null>(null);
  const { state: annotationState, annotate, clear } = useAnnotationStream();

  const { nodes, edges } = getTopology(activeTopology);

  /** Handle node click — build annotation payload and trigger stream. */
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as NodeElementData & Record<string, unknown>;
      setSelectedElementLabel(data.label ?? node.id);
      annotate({
        elementType: "node",
        elementData: {
          label: data.label ?? node.id,
          description: data.description ?? "",
          pattern: data.pattern ?? "",
        },
      });
    },
    [annotate]
  );

  /** Handle edge click — build annotation payload and trigger stream. */
  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      const data = edge.data as EdgeElementData & Record<string, unknown>;
      const label =
        typeof data?.label === "string" ? data.label : edge.id;
      setSelectedElementLabel(label);
      annotate({
        elementType: "edge",
        elementData: {
          label: label,
          description: typeof data?.description === "string" ? data.description : "",
          pattern: typeof data?.pattern === "string" ? data.pattern : "",
          sourceLabel: typeof data?.sourceLabel === "string" ? data.sourceLabel : "",
          targetLabel: typeof data?.targetLabel === "string" ? data.targetLabel : "",
          relationshipType:
            typeof data?.relationshipType === "string" ? data.relationshipType : "",
        },
      });
    },
    [annotate]
  );

  /** Handle topology switch — clear annotation panel but preserve canvas state. */
  const handleTopologyChange = useCallback(
    (topology: TopologyType) => {
      setActiveTopology(topology);
      setSelectedElementLabel(null);
      clear();
    },
    [clear]
  );

  /** Handle panel close — clear selection and annotation. */
  const handlePanelClose = useCallback(() => {
    setSelectedElementLabel(null);
    clear();
  }, [clear]);

  return (
    <div
      role="application"
      aria-label={`ADK topology diagram — ${activeTopology} view`}
      style={{
        width: "100%",
        height: "clamp(420px, 72vh, 760px)",
        background: "var(--exp-canvas-bg)",
        position: "relative",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* React Flow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        // Prevent pane click from deselecting (we manage selection explicitly)
        onPaneClick={() => {
          /* intentionally empty — clicking blank canvas doesn't close panel */
        }}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        // Static diagram — nodes are not draggable in EXP_007
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.4}
        maxZoom={2}
        style={{ background: "transparent" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          showInteractive={false}
          style={{
            background: "rgba(26, 29, 35, 0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "6px",
          }}
        />
      </ReactFlow>

      {/* Topology selector — top-left overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 5,
        }}
      >
        <TopologySelector
          active={activeTopology}
          onChange={handleTopologyChange}
        />
      </div>

      {/* Click-to-annotate hint — bottom left, fades once panel opens */}
      {!selectedElementLabel && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            fontFamily: "var(--v2-font-mono)",
            fontSize: "9px",
            letterSpacing: "0.15em",
            color: "rgba(240,242,245,0.3)",
            textTransform: "uppercase",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          click any node or edge → claude annotation
        </div>
      )}

      {/* Annotation panel — right-side overlay */}
      <AnnotationPanel
        state={annotationState}
        selectedLabel={selectedElementLabel}
        onClose={handlePanelClose}
      />
    </div>
  );
}
