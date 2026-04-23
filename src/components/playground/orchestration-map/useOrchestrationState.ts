"use client";

/**
 * useOrchestrationState — state management for EXP_008 (Agent Orchestration Map).
 *
 * Wraps React Flow's built-in useNodesState and useEdgesState hooks with:
 *   - Node palette drop handler (converts palette item to positioned canvas node)
 *   - Node label editing via double-click
 *   - Node and edge deletion
 *   - Context prompt builder (serialises current topology for annotation)
 *   - Export utilities (JSON download, PNG via html2canvas)
 *
 * No external state library. Session-scoped — nothing persists across reload.
 */

import { useCallback, useRef } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { NodeTypeName } from "@/components/playground/shared/flow-nodes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A palette node type with display metadata. */
export interface PaletteItem {
  type: NodeTypeName;
  label: string;
  description: string;
  pattern: string;
}

/** Available palette items for EXP_008. */
export const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: "orchestrator",
    label: "Orchestrator",
    description: "Top-level agent that delegates tasks to specialists.",
    pattern: "SequentialAgent or ParallelAgent — manages InvocationContext.",
  },
  {
    type: "specialist",
    label: "Specialist",
    description: "A focused agent with a single well-defined responsibility.",
    pattern: "LlmAgent with bounded scope — reads/writes session.state.",
  },
  {
    type: "tool",
    label: "Tool",
    description: "A callable function or API that an agent uses inline.",
    pattern: "Inline tool — no delegation, direct execution.",
  },
  {
    type: "memory",
    label: "Memory",
    description: "Shared state store (session.state or external memory).",
    pattern: "Key-value whiteboard — output_key handoff between specialists.",
  },
];

// ---------------------------------------------------------------------------
// ID counter — simple incrementing counter for unique node/edge IDs
// ---------------------------------------------------------------------------

let nodeCounter = 0;
let edgeCounter = 0;

function nextNodeId() {
  return `node-${++nodeCounter}`;
}

function nextEdgeId() {
  return `edge-${++edgeCounter}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrchestrationState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  /**
   * Adds a new node to the canvas from a palette drop.
   * Position is the canvas-space coordinate of the drop point.
   */
  const addNodeFromPalette = useCallback(
    (item: PaletteItem, position: { x: number; y: number }) => {
      const id = nextNodeId();
      const newNode: Node = {
        id,
        type: item.type,
        position,
        data: {
          label: item.label,
          description: item.description,
          pattern: item.pattern,
        },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [setNodes]
  );

  /**
   * Updates the label of an existing node (called from double-click rename).
   */
  const renameNode = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, label: newLabel } }
            : n
        )
      );
    },
    [setNodes]
  );

  /**
   * Creates a new DelegationEdge when two handles are connected.
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const sourceLabel =
        typeof sourceNode?.data?.label === "string" ? sourceNode.data.label : connection.source ?? "";
      const targetLabel =
        typeof targetNode?.data?.label === "string" ? targetNode.data.label : connection.target ?? "";

      const newEdge: Edge = {
        ...connection,
        id: nextEdgeId(),
        type: "delegation",
        markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.5)" },
        data: {
          label: "delegates",
          description: `${sourceLabel} delegates to ${targetLabel}.`,
          pattern: "Delegation — outbound task assignment.",
          sourceLabel,
          targetLabel,
          relationshipType: "delegation",
        },
      };
      setEdges((prev) => addEdge(newEdge, prev));
    },
    [nodes, setEdges]
  );

  /**
   * Deletes a node (and its connected edges) by ID.
   */
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  /**
   * Deletes an edge by ID.
   */
  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  /**
   * Builds a topology context string to pass as contextPrompt to the
   * annotation API. Summarises all current nodes and edges concisely.
   */
  const buildContextPrompt = useCallback((): string => {
    const nodeLines = nodes.map((n) => {
      const label = typeof n.data?.label === "string" ? n.data.label : n.id;
      return `- ${String(n.type ?? "node")}: ${label}`;
    });
    const edgeLines = edges.map((e) => {
      const srcLabel = nodes.find((n) => n.id === e.source)?.data?.label ?? e.source;
      const tgtLabel = nodes.find((n) => n.id === e.target)?.data?.label ?? e.target;
      return `- edge: ${String(srcLabel)} → ${String(tgtLabel)}`;
    });
    const parts: string[] = [];
    if (nodeLines.length > 0) {
      parts.push(`Nodes:\n${nodeLines.join("\n")}`);
    }
    if (edgeLines.length > 0) {
      parts.push(`Edges:\n${edgeLines.join("\n")}`);
    }
    return parts.join("\n\n");
  }, [nodes, edges]);

  /**
   * Exports the current topology as a JSON file download.
   * Serialises React Flow's node and edge arrays.
   */
  const exportJSON = useCallback(() => {
    const data = { nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "agent-topology.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  /**
   * Ref passed to the canvas wrapper div so html2canvas can capture it.
   * The canvas component assigns this ref to its container element.
   */
  const canvasRef = useRef<HTMLDivElement>(null);

  /**
   * Exports the canvas as a PNG using html2canvas.
   * Falls back gracefully if html2canvas throws.
   */
  const exportPNG = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: "#1A1D23",
        scale: 2, // 2x for retina-quality export
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = "agent-topology.png";
      link.click();
    } catch (err) {
      console.error("[useOrchestrationState] PNG export failed:", err);
    }
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNodeFromPalette,
    renameNode,
    deleteNode,
    deleteEdge,
    buildContextPrompt,
    exportJSON,
    exportPNG,
    canvasRef,
  };
}
