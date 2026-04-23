"use client";

/**
 * DelegationEdge — animated dashed line with a direction arrow.
 * Represents outbound delegation: orchestrator → specialist, specialist → tool.
 * The animation communicates active flow — delegation is dynamic, not static.
 *
 * Animation is disabled when prefers-reduced-motion is set.
 *
 * Used in: EXP_007 (ADK Visualizer), EXP_008 (Orchestration Map)
 */

import {
  type EdgeProps,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/** Data payload for a delegation edge. */
export interface DelegationEdgeData extends Record<string, unknown> {
  label?: string;
  description: string;
  pattern: string;
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
}

export function DelegationEdge({
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
  const prefersReducedMotion = useReducedMotion();
  const edgeData = data as DelegationEdgeData | undefined;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const strokeColor = selected ? "var(--v2-accent)" : "rgba(200, 255, 0, 0.45)";
  const strokeWidth = selected ? 2 : 1.5;

  return (
    <>
      {/* Dashed animated path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: "6 4",
          // Animate only when reduced motion is not preferred
          animation: prefersReducedMotion
            ? "none"
            : "delegation-flow 1.5s linear infinite",
          filter: selected ? "drop-shadow(0 0 4px rgba(200, 255, 0, 0.5))" : "none",
        }}
      />

      {/* Edge label — rendered in HTML layer for crisp text */}
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
              color: selected ? "var(--v2-accent)" : "rgba(200, 255, 0, 0.6)",
              background: "rgba(26, 29, 35, 0.85)",
              padding: "2px 6px",
              borderRadius: "3px",
              border: `1px solid ${selected ? "rgba(200,255,0,0.4)" : "rgba(200,255,0,0.15)"}`,
              cursor: "pointer",
              userSelect: "none",
            }}
            className="nodrag nopan"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}

      {/*
       * CSS animation for the dashed stroke offset.
       * injected as a style tag; kept local to this component.
       */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes delegation-flow {
            from { stroke-dashoffset: 0; }
            to   { stroke-dashoffset: -20; }
          }
        }
      `}</style>
    </>
  );
}
