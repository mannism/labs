"use client";

/**
 * ExportControls — JSON and PNG export buttons for EXP_008.
 *
 * Renders two compact buttons:
 *   - Export JSON: serialises current React Flow state to a downloadable file
 *   - Export PNG: captures the canvas via html2canvas at 2x scale
 *
 * Disabled state shown when canvas is empty (no nodes present).
 * Loading state shown during PNG export (html2canvas is async).
 */

import { useState } from "react";

interface ExportControlsProps {
  onExportJSON: () => void;
  onExportPNG: () => Promise<void>;
  disabled: boolean;
}

export function ExportControls({ onExportJSON, onExportPNG, disabled }: ExportControlsProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportPNG = async () => {
    if (disabled || exporting) return;
    setExporting(true);
    try {
      await onExportPNG();
    } finally {
      setExporting(false);
    }
  };

  const buttonBase: React.CSSProperties = {
    background: "rgba(26, 29, 35, 0.9)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    padding: "7px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--v2-font-mono)",
    fontSize: "9px",
    letterSpacing: "0.1em",
    color: disabled ? "rgba(240,242,245,0.25)" : "rgba(240,242,245,0.65)",
    textTransform: "uppercase",
    transition: "border-color 0.15s ease, color 0.15s ease",
    minHeight: 32,
    minWidth: 44,
    display: "flex",
    alignItems: "center",
    gap: 5,
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        alignItems: "center",
      }}
    >
      {/* JSON export */}
      <button
        onClick={onExportJSON}
        disabled={disabled}
        aria-label="Export topology as JSON"
        style={buttonBase}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "rgba(200,255,0,0.3)";
            e.currentTarget.style.color = "var(--v2-accent)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.color = disabled
            ? "rgba(240,242,245,0.25)"
            : "rgba(240,242,245,0.65)";
        }}
      >
        {/* Download icon */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M5 1v5M3 4l2 2 2-2M1 8h8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        JSON
      </button>

      {/* PNG export */}
      <button
        onClick={handleExportPNG}
        disabled={disabled || exporting}
        aria-label="Export topology as PNG image"
        aria-busy={exporting}
        style={{
          ...buttonBase,
          cursor: disabled || exporting ? "not-allowed" : "pointer",
          color:
            exporting
              ? "rgba(200,255,0,0.5)"
              : disabled
              ? "rgba(240,242,245,0.25)"
              : "rgba(240,242,245,0.65)",
        }}
        onMouseEnter={(e) => {
          if (!disabled && !exporting) {
            e.currentTarget.style.borderColor = "rgba(200,255,0,0.3)";
            e.currentTarget.style.color = "var(--v2-accent)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.color =
            disabled || exporting
              ? "rgba(240,242,245,0.25)"
              : "rgba(240,242,245,0.65)";
        }}
      >
        {/* Image icon */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <rect
            x="1" y="1" width="8" height="8"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="3.5" cy="3.5" r="1" fill="currentColor" />
          <path
            d="M1 7l2.5-2.5L5 6l2-2L9 7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        {exporting ? "SAVING..." : "PNG"}
      </button>
    </div>
  );
}
