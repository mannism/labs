"use client";

/**
 * OrchestratorNode — large primary node representing a SequentialAgent or
 * top-level orchestration agent in the topology. Visually prominent to
 * communicate hierarchy: orchestrators sit at the top of the delegation chain.
 *
 * Used in: EXP_007 (ADK Visualizer), EXP_008 (Orchestration Map)
 */

import { type NodeProps, Handle, Position } from "@xyflow/react";

/** Data shape for an orchestrator node. */
export interface OrchestratorNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  pattern: string;
}

export function OrchestratorNode({ data, selected }: NodeProps) {
  const nodeData = data as OrchestratorNodeData;

  return (
    <div
      role="button"
      aria-label={`Orchestrator: ${nodeData.label}`}
      aria-pressed={selected}
      style={{
        background: selected
          ? "rgba(200, 255, 0, 0.12)"
          : "rgba(26, 29, 35, 0.95)",
        border: selected
          ? "2px solid var(--v2-accent)"
          : "2px solid rgba(200, 255, 0, 0.4)",
        borderRadius: "6px",
        padding: "14px 20px",
        minWidth: "160px",
        cursor: "pointer",
        boxShadow: selected
          ? "0 0 0 3px rgba(200, 255, 0, 0.2), 0 4px 16px rgba(0,0,0,0.4)"
          : "0 4px 16px rgba(0,0,0,0.3)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      }}
    >
      {/* Type label */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "9px",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          color: "var(--v2-accent)",
          textTransform: "uppercase",
          margin: "0 0 4px 0",
        }}
      >
        ORCHESTRATOR
      </p>

      {/* Node name */}
      <p
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "13px",
          fontWeight: 700,
          color: "#F0F2F5",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {nodeData.label}
      </p>

      {/* Source handle — delegates to children */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "var(--v2-accent)",
          border: "none",
          width: 8,
          height: 8,
        }}
      />
      {/* Target handle — receives from nothing in orchestrated topology */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "rgba(200, 255, 0, 0.4)",
          border: "none",
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
}
