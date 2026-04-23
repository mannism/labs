"use client";

/**
 * OrchestrationCanvas — drag-and-drop React Flow canvas for EXP_008.
 *
 * Users drag nodes from NodePalette onto this canvas. Dropped nodes are
 * created at the drop position. Existing nodes are repositionable. Edges
 * are drawn by connecting handles. Double-click a node to rename it.
 * Select any node or edge to trigger Claude annotation in the side panel.
 *
 * Layout:
 *   [NodePalette] [ReactFlow canvas] [AnnotationPanel overlay on canvas right]
 *
 * The canvas accepts HTML5 drag events from NodePalette items:
 *   - onDragOver: allow drop
 *   - onDrop: read transfer data, compute canvas position, call addNodeFromPalette
 *
 * Double-click inline editing:
 *   When a node is double-clicked, a floating <input> is positioned at the
 *   node's rough screen position. On blur or Enter, renameNode is called.
 *   This is a simple implementation — not a custom inline node editor — to
 *   avoid duplicating React Flow's internal node position tracking.
 */

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NODE_TYPES } from "@/components/playground/shared/flow-nodes";
import { EDGE_TYPES } from "@/components/playground/shared/flow-edges";
import { AnnotationPanel } from "@/components/playground/shared/AnnotationPanel";
import { NodePalette } from "./NodePalette";
import { ExportControls } from "./ExportControls";
import { useOrchestrationState, type PaletteItem } from "./useOrchestrationState";
import { useAnnotationStream } from "@/hooks/useAnnotationStream";
import type { NodeElementData, EdgeElementData } from "@/lib/prompts/orchestrationAnnotation";

/** State for the floating rename input. */
interface RenameState {
  nodeId: string;
  value: string;
  x: number;
  y: number;
}

export function OrchestrationCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNodeFromPalette,
    renameNode,
    exportJSON,
    exportPNG,
    buildContextPrompt,
    canvasRef,
  } = useOrchestrationState();

  const { state: annotationState, annotate, clear } = useAnnotationStream();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);

  /** Ref to the ReactFlow wrapper div for drop coordinate calculations. */
  const flowRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------------------

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const raw = event.dataTransfer.getData("application/nix-palette-item");
      if (!raw) return;

      let item: PaletteItem;
      try {
        item = JSON.parse(raw) as PaletteItem;
      } catch {
        return;
      }

      // Convert screen drop coordinates to React Flow canvas space.
      // ReactFlow renders in a transform that we need to account for.
      // Using the bounding rect of the flow container is sufficient for
      // the default fitView transform.
      const rect = flowRef.current?.getBoundingClientRect();
      if (!rect) return;

      const position = {
        x: event.clientX - rect.left - 70, // centre the node on cursor
        y: event.clientY - rect.top - 25,
      };

      addNodeFromPalette(item, position);
    },
    [addNodeFromPalette]
  );

  /** Tap-to-add mobile fallback — places node at canvas centre. */
  const handleTapAdd = useCallback(
    (item: PaletteItem) => {
      const rect = flowRef.current?.getBoundingClientRect();
      const centreX = rect ? rect.width / 2 - 70 : 200;
      const centreY = rect ? rect.height / 2 - 25 : 200;
      addNodeFromPalette(item, { x: centreX, y: centreY });
    },
    [addNodeFromPalette, flowRef]
  );

  // ---------------------------------------------------------------------------
  // Selection and annotation
  // ---------------------------------------------------------------------------

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (renameState) return; // Don't trigger annotation while renaming
      const data = node.data as NodeElementData & Record<string, unknown>;
      const label = typeof data.label === "string" ? data.label : node.id;
      setSelectedLabel(label);
      annotate({
        elementType: "node",
        elementData: {
          label,
          description: typeof data.description === "string" ? data.description : "",
          pattern: typeof data.pattern === "string" ? data.pattern : "",
        },
        contextPrompt: buildContextPrompt(),
      });
    },
    [annotate, buildContextPrompt, renameState]
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      const data = edge.data as EdgeElementData & Record<string, unknown>;
      const label = typeof data?.label === "string" ? data.label : edge.id;
      setSelectedLabel(label);
      annotate({
        elementType: "edge",
        elementData: {
          label,
          description: typeof data?.description === "string" ? data.description : "",
          pattern: typeof data?.pattern === "string" ? data.pattern : "",
          sourceLabel: typeof data?.sourceLabel === "string" ? data.sourceLabel : "",
          targetLabel: typeof data?.targetLabel === "string" ? data.targetLabel : "",
          relationshipType:
            typeof data?.relationshipType === "string" ? data.relationshipType : "",
        },
        contextPrompt: buildContextPrompt(),
      });
    },
    [annotate, buildContextPrompt]
  );

  const handlePanelClose = useCallback(() => {
    setSelectedLabel(null);
    clear();
  }, [clear]);

  // ---------------------------------------------------------------------------
  // Inline rename on double-click
  // ---------------------------------------------------------------------------

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const data = node.data as Record<string, unknown>;
      const currentLabel = typeof data.label === "string" ? data.label : "";

      // Position the input near the event target
      const rect = (event.target as HTMLElement)
        .closest(".react-flow__node")
        ?.getBoundingClientRect();
      const containerRect = flowRef.current?.getBoundingClientRect();

      if (rect && containerRect) {
        setRenameState({
          nodeId: node.id,
          value: currentLabel,
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
        });
      }
    },
    []
  );

  const commitRename = useCallback(() => {
    if (!renameState) return;
    const trimmed = renameState.value.trim();
    if (trimmed) {
      renameNode(renameState.nodeId, trimmed);
    }
    setRenameState(null);
  }, [renameState, renameNode]);

  return (
    <div
      style={{ width: "100%", display: "flex", flexDirection: "column", gap: 0 }}
    >
      {/* Toolbar — palette + export */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "rgba(20,22,28,0.96)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            color: "rgba(240,242,245,0.35)",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Agent Orchestration Map
        </p>
        <ExportControls
          onExportJSON={exportJSON}
          onExportPNG={exportPNG}
          disabled={nodes.length === 0}
        />
      </div>

      {/* Main area — palette + canvas */}
      <div
        style={{
          display: "flex",
          height: "clamp(420px, 68vh, 720px)",
        }}
      >
        {/* Node Palette */}
        <div
          style={{
            padding: "10px 8px",
            background: "rgba(18, 20, 26, 0.98)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            overflowY: "auto",
          }}
        >
          <NodePalette onTapAdd={handleTapAdd} />
        </div>

        {/* Canvas wrapper */}
        <div
          ref={flowRef}
          role="application"
          aria-label="Agent topology canvas — drag nodes from the palette and connect them"
          style={{
            flex: 1,
            position: "relative",
            background: "var(--exp-canvas-bg)",
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Capture ref for html2canvas PNG export */}
          <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              fitView={nodes.length > 0}
              minZoom={0.3}
              maxZoom={2.5}
              style={{ background: "transparent" }}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1}
                color="rgba(255,255,255,0.04)"
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
          </div>

          {/* Empty state hint */}
          {nodes.length === 0 && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--v2-space-sm)",
                pointerEvents: "none",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  color: "rgba(240,242,245,0.2)",
                  textTransform: "uppercase",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                drag nodes from palette to build your topology
              </p>
              <p
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "9px",
                  color: "rgba(240,242,245,0.12)",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                connect handles · double-click to rename · select to annotate
              </p>
            </div>
          )}

          {/* Floating rename input */}
          {renameState && (
            <input
              autoFocus
              value={renameState.value}
              onChange={(e) =>
                setRenameState((prev) =>
                  prev ? { ...prev, value: e.target.value } : null
                )
              }
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenameState(null);
              }}
              aria-label="Rename node"
              style={{
                position: "absolute",
                left: renameState.x,
                top: renameState.y,
                zIndex: 20,
                background: "rgba(26, 29, 35, 0.98)",
                border: "1px solid var(--v2-accent)",
                borderRadius: "4px",
                color: "#F0F2F5",
                fontFamily: "var(--v2-font-display)",
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 10px",
                outline: "none",
                minWidth: "120px",
                maxWidth: "200px",
                boxShadow: "0 0 0 3px rgba(200,255,0,0.15)",
              }}
            />
          )}

          {/* Annotation panel */}
          <AnnotationPanel
            state={annotationState}
            selectedLabel={selectedLabel}
            onClose={handlePanelClose}
          />
        </div>
      </div>
    </div>
  );
}
