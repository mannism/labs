"use client";

import { useCallback, useState } from "react";

type FluidPaletteId = "ink" | "fire" | "neon" | "mono";

interface FluidParams {
  viscosity: number;
  diffusion: number;
  densityInjection: number;
  velocityScale: number;
  palette: FluidPaletteId;
}

interface GestureFluidControlPanelProps {
  params: FluidParams;
  onParamChange: (key: keyof FluidParams, value: number | string) => void;
  onClear: () => void;
  gridSize: number;
  fps: number;
  isActive: boolean;
}

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

const SLIDER_STYLE: React.CSSProperties = {
  width: "100%",
  accentColor: "var(--v2-accent)",
  cursor: "pointer",
};

const CONTROL_GROUP_STYLE: React.CSSProperties = {
  marginBottom: "var(--v2-space-md)",
};

const DIVIDER_STYLE: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  margin: "var(--v2-space-sm) 0",
};

export type { FluidPaletteId, FluidParams };

export function GestureFluidControlPanel({
  params,
  onParamChange,
  onClear,
  gridSize,
  fps,
  isActive,
}: GestureFluidControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  const makeSliderHandler = useCallback(
    (key: keyof FluidParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onParamChange(key, parseFloat(e.target.value));
    },
    [onParamChange]
  );

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
      className="exp-control-panel"
      role="region"
      aria-label="Gesture Fluid experiment controls"
    >
      <style>{`
        @media (max-width: 767px) {
          .exp-control-panel {
            left: var(--v2-space-sm) !important;
            right: var(--v2-space-sm) !important;
            min-width: unset !important;
            max-width: unset !important;
            padding: var(--v2-space-sm) !important;
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: isCollapsed ? 0 : "var(--v2-space-md)",
          paddingBottom: isCollapsed ? "var(--v2-space-sm)" : 0,
          borderBottom: isCollapsed
            ? "1px solid rgba(255, 255, 255, 0.06)"
            : "none",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--v2-space-sm)",
          }}
        >
          {isCollapsed && (
            <span
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--exp-glass-text-muted)",
                letterSpacing: "var(--v2-letter-spacing-wide)",
                textTransform: "uppercase",
              }}
            >
              FPS: {fps} | {gridSize}x{gridSize}
            </span>
          )}
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
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? "Expand controls" : "Collapse controls"}
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              transition: "transform 0.2s ease",
              transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            &#9650;
          </button>
        </div>
      </div>

      <div
        style={{
          maxHeight: isCollapsed ? 0 : "500px",
          opacity: isCollapsed ? 0 : 1,
          overflow: "hidden",
          transition: "max-height 0.2s ease, opacity 0.2s ease",
        }}
      >
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
    </div>
  );
}
