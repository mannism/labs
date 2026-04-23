"use client";

/**
 * ToolNode — small tertiary node representing an inline tool available to an
 * agent. Visually smallest in the hierarchy; uses a muted violet/purple accent
 * to distinguish from agents. In the monolithic topology these attach directly
 * to the monolith; in orchestrated topologies specialists delegate to them.
 *
 * Used in: EXP_007 (ADK Visualizer), EXP_008 (Orchestration Map)
 */

import { type NodeProps, Handle, Position } from "@xyflow/react";

/** Data shape for a tool node. */
export interface ToolNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  pattern: string;
}

export function ToolNode({ data, selected }: NodeProps) {
  const nodeData = data as ToolNodeData;

  return (
    <div
      role="button"
      aria-label={`Tool: ${nodeData.label}`}
      aria-pressed={selected}
      style={{
        background: selected
          ? "rgba(139, 92, 246, 0.12)"
          : "rgba(26, 29, 35, 0.95)",
        border: selected
          ? "2px solid #8B5CF6"
          : "2px solid rgba(139, 92, 246, 0.3)",
        borderRadius: "4px",
        padding: "9px 13px",
        minWidth: "110px",
        cursor: "pointer",
        boxShadow: selected
          ? "0 0 0 2px rgba(139, 92, 246, 0.2), 0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 6px rgba(0,0,0,0.2)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      }}
    >
      {/* Type label */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "8px",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          color: "#8B5CF6",
          textTransform: "uppercase",
          margin: "0 0 3px 0",
        }}
      >
        TOOL
      </p>

      {/* Node name */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "11px",
          fontWeight: 600,
          color: "#D1D5DB",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {nodeData.label}
      </p>

      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#8B5CF6", border: "none", width: 6, height: 6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "rgba(139, 92, 246, 0.4)", border: "none", width: 6, height: 6 }}
      />
    </div>
  );
}
