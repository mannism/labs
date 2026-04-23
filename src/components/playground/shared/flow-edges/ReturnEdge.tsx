"use client";

/**
 * ReturnEdge — solid line representing a return path.
 * Communicates that a result is flowing back: specialist → orchestrator,
 * or read from session.state back to a specialist.
 *
 * Structurally distinct from DelegationEdge (solid vs dashed, different colour)
 * so the viewer can read delegation direction without reading labels.
 *
 * Used in: EXP_007 (ADK Visualizer), EXP_008 (Orchestration Map)
 */

import {
  type EdgeProps,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from "@xyflow/react";

/** Data payload for a return edge. */
export interface ReturnEdgeData extends Record<string, unknown> {
  label?: string;
  description: string;
  pattern: string;
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
}

export function ReturnEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as ReturnEdgeData | undefined;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const strokeColor = selected ? "#06B6D4" : "rgba(6, 182, 212, 0.4)";

  return (
    <>
      {/* Solid path — no dash, no animation */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2 : 1.5,
          filter: selected ? "drop-shadow(0 0 4px rgba(6, 182, 212, 0.45))" : "none",
          transition: "stroke 0.15s ease",
        }}
      />

      {/* Label */}
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              fontFamily: "var(--v2-font-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              color: selected ? "#06B6D4" : "rgba(6, 182, 212, 0.65)",
              background: "rgba(26, 29, 35, 0.85)",
              padding: "2px 6px",
              borderRadius: "3px",
              border: `1px solid ${selected ? "rgba(6,182,212,0.4)" : "rgba(6,182,212,0.15)"}`,
              cursor: "pointer",
              userSelect: "none",
            }}
            className="nodrag nopan"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
