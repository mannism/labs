"use client";

/**
 * MemoryNode — represents shared session state (e.g. session.state in ADK).
 * Uses a cylinder-like visual treatment with a warm amber accent to make it
 * visually distinct from agents and tools — it is not an active executor but
 * a shared whiteboard that all specialists read from and write to.
 *
 * Used in: EXP_007 (ADK Visualizer), EXP_008 (Orchestration Map)
 */

import { type NodeProps, Handle, Position } from "@xyflow/react";

/** Data shape for a memory/state node. */
export interface MemoryNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  pattern: string;
}

export function MemoryNode({ data, selected }: NodeProps) {
  const nodeData = data as MemoryNodeData;

  return (
    <div
      role="button"
      aria-label={`Shared State: ${nodeData.label}`}
      aria-pressed={selected}
      style={{
        background: selected
          ? "rgba(245, 158, 11, 0.12)"
          : "rgba(26, 29, 35, 0.95)",
        border: selected
          ? "2px solid #F59E0B"
          : "2px solid rgba(245, 158, 11, 0.35)",
        borderRadius: "50px", // Pill/capsule — approximates cylinder from above
        padding: "10px 18px",
        minWidth: "130px",
        cursor: "pointer",
        boxShadow: selected
          ? "0 0 0 3px rgba(245, 158, 11, 0.15), 0 2px 10px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.2)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
        textAlign: "center",
      }}
    >
      {/* Cylinder icon (SVG) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          {/* Top ellipse */}
          <ellipse cx="7" cy="3.5" rx="5" ry="2" stroke="#F59E0B" strokeWidth="1.2" />
          {/* Body */}
          <line x1="2" y1="3.5" x2="2" y2="10.5" stroke="#F59E0B" strokeWidth="1.2" />
          <line x1="12" y1="3.5" x2="12" y2="10.5" stroke="#F59E0B" strokeWidth="1.2" />
          {/* Bottom ellipse */}
          <ellipse cx="7" cy="10.5" rx="5" ry="2" stroke="#F59E0B" strokeWidth="1.2" />
        </svg>

        {/* Type label */}
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "8px",
            letterSpacing: "0.12em",
            color: "#F59E0B",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          STATE
        </p>
      </div>

      {/* Node name */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "11px",
          fontWeight: 600,
          color: "#D1D5DB",
          margin: 0,
          lineHeight: 1.2,
          textAlign: "center",
        }}
      >
        {nodeData.label}
      </p>

      {/* Memory nodes have top+bottom handles for bidirectional read/write */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#F59E0B", border: "none", width: 7, height: 7 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "rgba(245, 158, 11, 0.5)", border: "none", width: 7, height: 7 }}
      />
    </div>
  );
}
