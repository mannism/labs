"use client";

/**
 * GestureFluidControlPanel — dark glass overlay control panel for the
 * Gesture Fluid Wall experiment. Follows the Speculative Interface design
 * system: monospace labels, uppercase system text, chartreuse accent.
 *
 * Controls: viscosity, diffusion rate, density injection strength,
 * velocity scale, color palette dropdown, and clear button. Includes
 * FPS counter and grid resolution readout with idle/active indicator.
 */

import { useCallback } from "react";

/* -------------------------------------------------------------------------- */
/*                              Type definitions                              */
/* -------------------------------------------------------------------------- */

/** Color palette options for fluid rendering. */
type FluidPaletteId = "ink" | "fire" | "neon" | "mono";

/** All simulation parameters exposed to the user. */
interface FluidParams {
  viscosity: number;
  diffusion: number;
  densityInjection: number;
  velocityScale: number;
  palette: FluidPaletteId;
}

/** Props for the control panel component. */
interface GestureFluidControlPanelProps {
  /** Current parameter values. */
  params: FluidParams;
  /** Called when the user adjusts any parameter. */
  onParamChange: (key: keyof FluidParams, value: number | string) => void;
  /** Called when the user clicks clear to reset the simulation. */
  onClear: () => void;
  /** Current grid resolution (e.g. 256 or 128). */
  gridSize: number;
  /** Current frames per second. */
  fps: number;
  /** Whether the simulation is in active mode (pointer interacting). */
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/*                           Shared inline styles                             */
/* -------------------------------------------------------------------------- */

/** Monospace label style used across all controls. */
const LABEL_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontFamily: "var(--v2-font-mono)",
  fontSize: "var(--v2-font-size-xs)",
  color: "var(--exp-glass-text-muted)",
  letterSpacing: "var(--v2-letter-spacing-wide)",
  textTransform: "uppercase",
  marginBottom: "4px",
};

/** Slider input style. */
const SLIDER_STYLE: React.CSSProperties = {
  width: "100%",
  accentColor: "var(--v2-accent)",
  cursor: "pointer",
};

/** Control group wrapper margin. */
const CONTROL_GROUP_STYLE: React.CSSProperties = {
  marginBottom: "var(--v2-space-md)",
};

/** Divider between control sections. */
const DIVIDER_STYLE: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  margin: "var(--v2-space-sm) 0",
};

/* -------------------------------------------------------------------------- */
/*                             Component                                      */
/* -------------------------------------------------------------------------- */

export type { FluidPaletteId, FluidParams };

export function GestureFluidControlPanel({
  params,
  onParamChange,
  onClear,
  gridSize,
  fps,
  isActive,
}: GestureFluidControlPanelProps) {
  /** Create a handler factory for numeric sliders to avoid inline arrow fns. */
  const makeSliderHandler = useCallback(
    (key: keyof FluidParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onParamChange(key, parseFloat(e.target.value));
    },
    [onParamChange]
  );

  /** Palette dropdown handler. */
  const handlePaletteChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onParamChange("palette", e.target.value);
    },
    [onParamChange]
  );

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
        minWidth: "240px",
        maxWidth: "280px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      role="region"
      aria-label="Gesture Fluid experiment controls"
    >
      {/* Header with clear button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--v2-space-md)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text-muted)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          PARAMETERS
        </p>
        <button
          onClick={onClear}
          aria-label="Clear fluid simulation"
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-accent)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            padding: 0,
          }}
        >
          CLEAR
        </button>
      </div>

      {/* Viscosity slider */}
      <div style={CONTROL_GROUP_STYLE}>
        <label htmlFor="gf-viscosity" style={LABEL_STYLE}>
          <span>VISCOSITY</span>
          <span style={{ color: "var(--exp-glass-text)" }}>
            {params.viscosity.toFixed(4)}
          </span>
        </label>
        <input
          id="gf-viscosity"
          type="range"
          min="0.0001"
          max="0.001"
          step="0.0001"
          value={params.viscosity}
          onChange={makeSliderHandler("viscosity")}
          style={SLIDER_STYLE}
          aria-valuemin={0.0001}
          aria-valuemax={0.001}
          aria-valuenow={params.viscosity}
          aria-valuetext={`Viscosity ${params.viscosity.toFixed(4)}`}
        />
      </div>

      {/* Diffusion slider */}
      <div style={CONTROL_GROUP_STYLE}>
        <label htmlFor="gf-diffusion" style={LABEL_STYLE}>
          <span>DIFFUSION</span>
          <span style={{ color: "var(--exp-glass-text)" }}>
            {params.diffusion.toFixed(4)}
          </span>
        </label>
        <input
          id="gf-diffusion"
          type="range"
          min="0.0001"
          max="0.001"
          step="0.0001"
          value={params.diffusion}
          onChange={makeSliderHandler("diffusion")}
          style={SLIDER_STYLE}
          aria-valuemin={0.0001}
          aria-valuemax={0.001}
          aria-valuenow={params.diffusion}
          aria-valuetext={`Diffusion ${params.diffusion.toFixed(4)}`}
        />
      </div>

      <hr style={DIVIDER_STYLE} />

      {/* Density Injection slider */}
      <div style={CONTROL_GROUP_STYLE}>
        <label htmlFor="gf-density" style={LABEL_STYLE}>
          <span>DENSITY</span>
          <span style={{ color: "var(--exp-glass-text)" }}>
            {params.densityInjection.toFixed(0)}
          </span>
        </label>
        <input
          id="gf-density"
          type="range"
          min="50"
          max="500"
          step="10"
          value={params.densityInjection}
          onChange={makeSliderHandler("densityInjection")}
          style={SLIDER_STYLE}
          aria-valuemin={50}
          aria-valuemax={500}
          aria-valuenow={params.densityInjection}
          aria-valuetext={`Density injection ${params.densityInjection.toFixed(0)}`}
        />
      </div>

      {/* Velocity Scale slider */}
      <div style={CONTROL_GROUP_STYLE}>
        <label htmlFor="gf-velocity" style={LABEL_STYLE}>
          <span>VELOCITY</span>
          <span style={{ color: "var(--exp-glass-text)" }}>
            {params.velocityScale.toFixed(0)}
          </span>
        </label>
        <input
          id="gf-velocity"
          type="range"
          min="1"
          max="20"
          step="1"
          value={params.velocityScale}
          onChange={makeSliderHandler("velocityScale")}
          style={SLIDER_STYLE}
          aria-valuemin={1}
          aria-valuemax={20}
          aria-valuenow={params.velocityScale}
          aria-valuetext={`Velocity scale ${params.velocityScale.toFixed(0)}x`}
        />
      </div>

      <hr style={DIVIDER_STYLE} />

      {/* Color Palette dropdown */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--v2-space-md)",
        }}
      >
        <label
          htmlFor="gf-palette"
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text-muted)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
          }}
        >
          PALETTE
        </label>
        <select
          id="gf-palette"
          value={params.palette}
          onChange={handlePaletteChange}
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text)",
            background: "var(--exp-glass-bg)",
            border: "1px solid var(--exp-glass-border)",
            borderRadius: "2px",
            padding: "4px 8px",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          <option value="ink">INK</option>
          <option value="fire">FIRE</option>
          <option value="neon">NEON</option>
          <option value="mono">MONO</option>
        </select>
      </div>

      <hr style={DIVIDER_STYLE} />

      {/* Stats row — grid size, FPS, and mode indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
          marginBottom: "var(--v2-space-xs)",
        }}
      >
        <span>GRID: {gridSize}x{gridSize}</span>
        <span>FPS: {fps}</span>
      </div>

      {/* Mode indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: isActive ? "var(--v2-accent)" : "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: isActive ? "var(--v2-accent)" : "var(--exp-glass-text-muted)",
          }}
        />
        {isActive ? "ACTIVE" : "IDLE"}
      </div>

      {/* Interaction hint */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "10px",
          color: "var(--exp-glass-text-muted)",
          margin: "var(--v2-space-sm) 0 0 0",
          lineHeight: 1.4,
          opacity: 0.7,
        }}
      >
        MOVE POINTER OVER CANVAS TO INJECT FLUID.
      </p>
    </div>
  );
}
