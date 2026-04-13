"use client";

import { useCallback, useState } from "react";

const THRESHOLD_PRESETS = [
  { label: "LOW", value: 0.02 },
  { label: "DEFAULT", value: 0.04 },
  { label: "HIGH", value: 0.07 },
] as const;

interface ControlPanelProps {
  isActive: boolean;
  onToggle: () => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  particleCount: number;
  fps: number;
  permissionDenied: boolean;
  isSupported: boolean;
}

export function ControlPanel({
  isActive,
  onToggle,
  sensitivity,
  onSensitivityChange,
  threshold,
  onThresholdChange,
  particleCount,
  fps,
  permissionDenied,
  isSupported,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  const handleSensitivityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSensitivityChange(parseFloat(e.target.value));
    },
    [onSensitivityChange]
  );

  const formattedCount = particleCount.toLocaleString();

  return (
    <div
      style={{
        position: "absolute",
        bottom: "var(--v2-space-md)",
        left: "var(--v2-space-md)",
        right: undefined,
        zIndex: 10,
        background: "var(--exp-glass-bg)",
        border: "1px solid var(--exp-glass-border)",
        borderRadius: "4px",
        padding: "var(--v2-space-md)",
        minWidth: "220px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      className="exp-control-panel"
      role="region"
      aria-label="Experiment controls"
    >
      <style>{`
        @media (max-width: 767px) {
          .exp-control-panel {
            left: var(--v2-space-sm) !important;
            right: var(--v2-space-sm) !important;
            min-width: unset !important;
            padding: var(--v2-space-sm) !important;
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: isCollapsed ? 0 : "var(--v2-space-sm)",
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
          CONTROLS
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
              FPS: {fps} | P: {formattedCount}
            </span>
          )}
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
            MICROPHONE ACCESS FAILED. ALLOW MIC IN BROWSER SETTINGS OR
            CHECK THAT THE PAGE IS SERVED OVER HTTPS / LOCALHOST.
          </p>
        )}

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

        <div style={{ marginBottom: "var(--v2-space-sm)" }}>
          <p
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text-muted)",
              letterSpacing: "var(--v2-letter-spacing-wide)",
              textTransform: "uppercase",
              margin: "0 0 4px 0",
            }}
          >
            THRESHOLD
          </p>
          <div
            style={{
              display: "flex",
              gap: "4px",
            }}
            role="radiogroup"
            aria-label="Audio activation threshold"
          >
            {THRESHOLD_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onThresholdChange(preset.value)}
                role="radio"
                aria-checked={threshold === preset.value}
                style={{
                  flex: 1,
                  padding: "4px 0",
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color:
                    threshold === preset.value
                      ? "var(--v2-text-primary)"
                      : "var(--exp-glass-text-muted)",
                  background:
                    threshold === preset.value
                      ? "var(--v2-accent)"
                      : "transparent",
                  border: `1px solid ${
                    threshold === preset.value
                      ? "var(--v2-accent)"
                      : "var(--exp-glass-border)"
                  }`,
                  borderRadius: "2px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

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
    </div>
  );
}
