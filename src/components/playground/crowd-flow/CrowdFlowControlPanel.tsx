"use client";

import { useCallback, useEffect, useState } from "react";

type PaletteId = "coral" | "ocean" | "acid" | "mono";

interface SimParams {
  agentCount: number;
  agentSpeed: number;
  rdFeedRate: number;
  rdKillRate: number;
  trailPersistence: number;
  showAgents: boolean;
  palette: PaletteId;
}

interface CrowdFlowControlPanelProps {
  params: SimParams;
  onParamChange: (key: keyof SimParams, value: number | boolean | string) => void;
  onReset: () => void;
  agentCount: number;
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

export function CrowdFlowControlPanel({
  params,
  onParamChange,
  onReset,
  agentCount,
  fps,
  isActive,
}: CrowdFlowControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  }, []);

  const makeSliderHandler = useCallback(
    (key: keyof SimParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onParamChange(key, parseFloat(e.target.value));
    },
    [onParamChange]
  );

  const handleToggleAgents = useCallback(() => {
    onParamChange("showAgents", !params.showAgents);
  }, [onParamChange, params.showAgents]);

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
      aria-label="Crowd Flow experiment controls"
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
              FPS: {fps} | A: {agentCount.toLocaleString()}
            </span>
          )}
          <button
            onClick={onReset}
            aria-label="Reset simulation parameters"
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
            RESET
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
          <label htmlFor="cf-agent-count" style={LABEL_STYLE}>
            <span>AGENT COUNT</span>
            <span style={{ color: "var(--exp-glass-text)" }}>
              {params.agentCount.toLocaleString()}
            </span>
          </label>
          <input
            id="cf-agent-count"
            type="range"
            min="500"
            max="10000"
            step="500"
            value={params.agentCount}
            onChange={makeSliderHandler("agentCount")}
            style={SLIDER_STYLE}
            aria-valuemin={500}
            aria-valuemax={10000}
            aria-valuenow={params.agentCount}
            aria-valuetext={`${params.agentCount.toLocaleString()} agents`}
          />
        </div>

        <div style={CONTROL_GROUP_STYLE}>
          <label htmlFor="cf-agent-speed" style={LABEL_STYLE}>
            <span>AGENT SPEED</span>
            <span style={{ color: "var(--exp-glass-text)" }}>
              {params.agentSpeed.toFixed(1)}
            </span>
          </label>
          <input
            id="cf-agent-speed"
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={params.agentSpeed}
            onChange={makeSliderHandler("agentSpeed")}
            style={SLIDER_STYLE}
            aria-valuemin={0.5}
            aria-valuemax={3.0}
            aria-valuenow={params.agentSpeed}
            aria-valuetext={`${params.agentSpeed.toFixed(1)}x speed`}
          />
        </div>

        <hr style={DIVIDER_STYLE} />

        <div style={CONTROL_GROUP_STYLE}>
          <label htmlFor="cf-feed-rate" style={LABEL_STYLE}>
            <span>RD FEED RATE</span>
            <span style={{ color: "var(--exp-glass-text)" }}>
              {params.rdFeedRate.toFixed(3)}
            </span>
          </label>
          <input
            id="cf-feed-rate"
            type="range"
            min="0.01"
            max="0.08"
            step="0.001"
            value={params.rdFeedRate}
            onChange={makeSliderHandler("rdFeedRate")}
            style={SLIDER_STYLE}
            aria-valuemin={0.01}
            aria-valuemax={0.08}
            aria-valuenow={params.rdFeedRate}
            aria-valuetext={`Feed rate ${params.rdFeedRate.toFixed(3)}`}
          />
        </div>

        <div style={CONTROL_GROUP_STYLE}>
          <label htmlFor="cf-kill-rate" style={LABEL_STYLE}>
            <span>RD KILL RATE</span>
            <span style={{ color: "var(--exp-glass-text)" }}>
              {params.rdKillRate.toFixed(3)}
            </span>
          </label>
          <input
            id="cf-kill-rate"
            type="range"
            min="0.04"
            max="0.07"
            step="0.001"
            value={params.rdKillRate}
            onChange={makeSliderHandler("rdKillRate")}
            style={SLIDER_STYLE}
            aria-valuemin={0.04}
            aria-valuemax={0.07}
            aria-valuenow={params.rdKillRate}
            aria-valuetext={`Kill rate ${params.rdKillRate.toFixed(3)}`}
          />
        </div>

        <div style={CONTROL_GROUP_STYLE}>
          <label htmlFor="cf-trail-persist" style={LABEL_STYLE}>
            <span>TRAIL PERSIST</span>
            <span style={{ color: "var(--exp-glass-text)" }}>
              {params.trailPersistence.toFixed(2)}
            </span>
          </label>
          <input
            id="cf-trail-persist"
            type="range"
            min="0.90"
            max="1.0"
            step="0.01"
            value={params.trailPersistence}
            onChange={makeSliderHandler("trailPersistence")}
            style={SLIDER_STYLE}
            aria-valuemin={0.9}
            aria-valuemax={1.0}
            aria-valuenow={params.trailPersistence}
            aria-valuetext={`${Math.round(params.trailPersistence * 100)}% persistence`}
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
          <span
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text-muted)",
              letterSpacing: "var(--v2-letter-spacing-wide)",
              textTransform: "uppercase",
            }}
          >
            SHOW AGENTS
          </span>
          <button
            role="switch"
            aria-checked={params.showAgents}
            aria-label="Show agent dots"
            onClick={handleToggleAgents}
            style={{
              width: "36px",
              height: "20px",
              borderRadius: "10px",
              border: "none",
              background: params.showAgents
                ? "var(--v2-accent)"
                : "rgba(255, 255, 255, 0.1)",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s ease",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "2px",
                left: params.showAgents ? "18px" : "2px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--v2-space-md)",
          }}
        >
          <label
            htmlFor="cf-palette"
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
            id="cf-palette"
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
            <option value="coral">CORAL</option>
            <option value="ocean">OCEAN</option>
            <option value="acid">ACID</option>
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
          <span>AGENTS: {agentCount.toLocaleString()}</span>
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
          CLICK TO PLACE OBSTACLES. RIGHT-CLICK TO REMOVE.
        </p>
      </div>
    </div>
  );
}
