"use client";

/**
 * NodePalette — draggable node palette for EXP_008 (Agent Orchestration Map).
 *
 * Shows four node type cards (Orchestrator, Specialist, Tool, Memory).
 * Each card is draggable via HTML5 drag API — drag data is transferred as
 * a JSON string identifying the palette item type.
 *
 * On touch devices (no drag API support), falls back to tap-to-add at the
 * canvas centre so the experiment remains usable on mobile.
 *
 * Accessibility:
 *   - Each item has role="button" with aria-label for keyboard/screen reader
 *   - Tab-navigable via the button's default focus handling
 *   - Tooltip-style sublabel communicates node purpose
 */

import type { PaletteItem } from "./useOrchestrationState";
import { PALETTE_ITEMS } from "./useOrchestrationState";

/** Accent colours by node type — mirrors the node components. */
const TYPE_COLORS: Record<string, string> = {
  orchestrator: "#C8FF00",
  specialist: "#06B6D4",
  tool: "#8B5CF6",
  memory: "#F59E0B",
};

interface NodePaletteProps {
  /** Called when a palette item is tapped (mobile fallback). */
  onTapAdd: (item: PaletteItem) => void;
}

export function NodePalette({ onTapAdd }: NodePaletteProps) {
  /** Set drag transfer data when dragging starts. */
  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    item: PaletteItem
  ) => {
    event.dataTransfer.setData(
      "application/nix-palette-item",
      JSON.stringify(item)
    );
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      role="toolbar"
      aria-label="Node palette — drag to canvas or tap to add"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "12px 10px",
        background: "rgba(20, 22, 28, 0.94)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "6px",
        width: "140px",
        flexShrink: 0,
      }}
    >
      {/* Section label */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "8px",
          letterSpacing: "0.2em",
          color: "rgba(240,242,245,0.3)",
          textTransform: "uppercase",
          margin: "0 0 4px 0",
        }}
      >
        NODE PALETTE
      </p>

      {PALETTE_ITEMS.map((item) => {
        const accent = TYPE_COLORS[item.type] ?? "#C8FF00";
        return (
          <div
            key={item.type}
            role="button"
            tabIndex={0}
            aria-label={`Add ${item.label} node — ${item.description}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onClick={() => onTapAdd(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTapAdd(item);
              }
            }}
            style={{
              background: "rgba(26,29,35,0.95)",
              border: `1px solid ${accent}40`,
              borderRadius: "4px",
              padding: "8px 10px",
              cursor: "grab",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              transition: "border-color 0.15s ease, background 0.15s ease",
              userSelect: "none",
              // Drag handle visual cue
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = accent + "80";
              e.currentTarget.style.background = `${accent}0a`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = accent + "40";
              e.currentTarget.style.background = "rgba(26,29,35,0.95)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${accent}`;
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            {/* Drag dots indicator */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                display: "grid",
                gridTemplateColumns: "repeat(2, 3px)",
                gap: 2,
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 2,
                    height: 2,
                    borderRadius: "50%",
                    background: `${accent}50`,
                  }}
                />
              ))}
            </div>

            <span
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                color: accent,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontFamily: "var(--v2-font-body)",
                fontSize: "10px",
                color: "rgba(240,242,245,0.45)",
                lineHeight: 1.35,
              }}
            >
              {item.description.split(" ").slice(0, 6).join(" ")}...
            </span>
          </div>
        );
      })}
    </div>
  );
}
