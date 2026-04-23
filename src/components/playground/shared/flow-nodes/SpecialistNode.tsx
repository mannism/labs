"use client";

/**
 * SpecialistNode — medium secondary node representing a specialist agent in the
 * orchestrated topology. Has a distinct teal/cyan accent to differentiate from
 * orchestrators and tools. Receives delegation from an orchestrator and writes
 * results to session.state.
 *
 * Used in: EXP_007 (ADK Visualizer), EXP_008 (Orchestration Map)
 */

import { type NodeProps, Handle, Position } from "@xyflow/react";

/** Data shape for a specialist node. */
export interface SpecialistNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  pattern: string;
}

export function SpecialistNode({ data, selected }: NodeProps) {
  const nodeData = data as SpecialistNodeData;

  return (
    <div
      role="button"
      aria-label={`Specialist Agent: ${nodeData.label}`}
      aria-pressed={selected}
      style={{
        background: selected
          ? "rgba(6, 182, 212, 0.12)"
          : "rgba(26, 29, 35, 0.95)",
        border: selected
          ? "2px solid #06B6D4"
          : "2px solid rgba(6, 182, 212, 0.35)",
        borderRadius: "5px",
        padding: "11px 16px",
        minWidth: "140px",
        cursor: "pointer",
        boxShadow: selected
          ? "0 0 0 3px rgba(6, 182, 212, 0.2), 0 4px 12px rgba(0,0,0,0.35)"
          : "0 2px 10px rgba(0,0,0,0.25)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      }}
    >
      {/* Type label */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "9px",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          color: "#06B6D4",
          textTransform: "uppercase",
          margin: "0 0 4px 0",
        }}
      >
        SPECIALIST
      </p>

      {/* Node name */}
      <p
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "12px",
          fontWeight: 600,
          color: "#F0F2F5",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {nodeData.label}
      </p>

      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#06B6D4", border: "none", width: 7, height: 7 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "rgba(6, 182, 212, 0.5)", border: "none", width: 7, height: 7 }}
      />
    </div>
  );
}
