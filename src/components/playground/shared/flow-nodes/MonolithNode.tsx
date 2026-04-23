"use client";

/**
 * MonolithNode — large node representing a monolithic LlmAgent that handles
 * all tasks inline. Visually distinct from OrchestratorNode: uses a red/rose
 * accent to signal the architectural hazard — a monolith is a valid starting
 * point but has known failure modes (silent cascade, tight coupling).
 *
 * Used in: EXP_007 (ADK Visualizer)
 */

import { type NodeProps, Handle, Position } from "@xyflow/react";

/** Data shape for a monolith node. */
export interface MonolithNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  pattern: string;
}

export function MonolithNode({ data, selected }: NodeProps) {
  const nodeData = data as MonolithNodeData;

  return (
    <div
      role="button"
      aria-label={`Monolith Agent: ${nodeData.label}`}
      aria-pressed={selected}
      style={{
        background: selected
          ? "rgba(244, 63, 94, 0.12)"
          : "rgba(26, 29, 35, 0.95)",
        border: selected
          ? "2px solid #F43F5E"
          : "2px solid rgba(244, 63, 94, 0.4)",
        borderRadius: "6px",
        padding: "14px 20px",
        minWidth: "160px",
        cursor: "pointer",
        boxShadow: selected
          ? "0 0 0 3px rgba(244, 63, 94, 0.15), 0 4px 16px rgba(0,0,0,0.4)"
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
          color: "#F43F5E",
          textTransform: "uppercase",
          margin: "0 0 4px 0",
        }}
      >
        MONOLITH
      </p>

      {/* Node name */}
      <p
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "13px",
          fontWeight: 700,
          color: "#F0F2F5",
          margin: "0 0 4px 0",
          lineHeight: 1.2,
        }}
      >
        {nodeData.label}
      </p>

      {/* Sub-label */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "9px",
          color: "rgba(240, 242, 245, 0.45)",
          margin: 0,
        }}
      >
        LlmAgent · for loop
      </p>

      {/* Only source handle — tools attach below */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#F43F5E", border: "none", width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "rgba(244, 63, 94, 0.4)", border: "none", width: 8, height: 8 }}
      />
    </div>
  );
}
