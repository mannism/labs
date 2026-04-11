"use client";

/**
 * ControlPanel — dark glass overlay with microphone toggle, sensitivity slider,
 * particle count readout, and FPS counter. Follows the Speculative Interface
 * design system: monospace labels, uppercase system text, chartreuse accent.
 */

import { useCallback } from "react";

/** Props for the experiment control panel. */
interface ControlPanelProps {
  /** Whether the microphone is currently active. */
  isActive: boolean;
  /** Called when the user toggles the microphone on/off. */
  onToggle: () => void;
  /** Current microphone sensitivity (0-1). */
  sensitivity: number;
  /** Called when the user adjusts sensitivity. */
  onSensitivityChange: (value: number) => void;
  /** Current number of particles being rendered. */
  particleCount: number;
  /** Current frames per second. */
  fps: number;
  /** Whether microphone permission was denied. */
  permissionDenied: boolean;
  /** Whether WebGPU/WebGL is supported. */
  isSupported: boolean;
}

export function ControlPanel({
  isActive,
  onToggle,
  sensitivity,
  onSensitivityChange,
  particleCount,
  fps,
  permissionDenied,
  isSupported,
}: ControlPanelProps) {
  /** Handle range input changes, parsing the string value to a number. */
  const handleSensitivityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSensitivityChange(parseFloat(e.target.value));
    },
    [onSensitivityChange]
  );

  /** Format particle count with thousands separator for readability. */
  const formattedCount = particleCount.toLocaleString();

  return (
    <div
      style={{
        position: "absolute",
        bottom: "var(--v2-space-md)",
        left: "var(--v2-space-md)",
        zIndex: 10,
        background: "var(--exp-glass-bg)",
        border: "1px solid var(--exp-glass-border)",
        borderRadius: "4px",
        padding: "var(--v2-space-md)",
        minWidth: "220px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      role="region"
      aria-label="Experiment controls"
    >
      {/* Header label */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
          margin: "0 0 var(--v2-space-sm) 0",
        }}
      >
        CONTROLS
      </p>

      {/* Microphone toggle button */}
      <button
        onClick={onToggle}
        disabled={!isSupported}
        aria-label={isActive ? "Stop microphone" : "Start microphone"}
        style={{
          width: "100%",
          padding: "8px 12px",
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          color: isActive ? "var(--v2-text-primary)" : "var(--exp-glass-text)",
          background: isActive ? "var(--v2-accent)" : "transparent",
          border: `1px solid ${isActive ? "var(--v2-accent)" : "var(--exp-glass-border)"}`,
          borderRadius: "2px",
          cursor: isSupported ? "pointer" : "not-allowed",
          opacity: isSupported ? 1 : 0.5,
          transition: "all 0.2s ease",
          marginBottom: "var(--v2-space-sm)",
        }}
      >
        {isActive ? "STOP MIC" : "START MIC"}
      </button>

      {/* Permission denied warning */}
      {permissionDenied && (
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "#EF4444",
            margin: "0 0 var(--v2-space-sm) 0",
            lineHeight: 1.4,
          }}
          role="alert"
        >
          MICROPHONE ACCESS DENIED. CHECK BROWSER PERMISSIONS.
        </p>
      )}

      {/* Not supported warning */}
      {!isSupported && (
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "#EF4444",
            margin: "0 0 var(--v2-space-sm) 0",
            lineHeight: 1.4,
          }}
          role="alert"
        >
          WEBGL NOT SUPPORTED IN THIS BROWSER.
        </p>
      )}

      {/* Sensitivity slider */}
      <div style={{ marginBottom: "var(--v2-space-sm)" }}>
        <label
          htmlFor="sensitivity-slider"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text-muted)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          <span>SENSITIVITY</span>
          <span>{Math.round(sensitivity * 100)}%</span>
        </label>
        <input
          id="sensitivity-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={sensitivity}
          onChange={handleSensitivityChange}
          style={{
            width: "100%",
            accentColor: "var(--v2-accent)",
            cursor: "pointer",
          }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sensitivity * 100)}
          aria-valuetext={`${Math.round(sensitivity * 100)} percent`}
        />
      </div>

      {/* Stats row — particle count and FPS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
        }}
      >
        <span>PARTICLES: {formattedCount}</span>
        <span>FPS: {fps}</span>
      </div>
    </div>
  );
}
