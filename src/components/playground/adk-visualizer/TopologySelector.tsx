"use client";

/**
 * TopologySelector — toggle between Monolithic and Orchestrated topologies
 * in the ADK Visualizer (EXP_007).
 *
 * Renders two tab-style buttons. Active state uses chartreuse accent per
 * the Speculative Interface v2 design system. Accessible: uses role="tablist"
 * with proper aria-selected and aria-controls attributes.
 */

export type TopologyType = "monolithic" | "orchestrated";

interface TopologySelectorProps {
  active: TopologyType;
  onChange: (topology: TopologyType) => void;
}

const TABS: { value: TopologyType; label: string; sublabel: string }[] = [
  { value: "monolithic", label: "MONOLITHIC", sublabel: "Titanium · 1 agent · 4 tools" },
  { value: "orchestrated", label: "ORCHESTRATED", sublabel: "SequentialAgent · 5 specialists" },
];

export function TopologySelector({ active, onChange }: TopologySelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Topology selection"
      style={{
        display: "flex",
        gap: "4px",
        background: "rgba(26, 29, 35, 0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "6px",
        padding: "4px",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            role="tab"
            id={`topology-tab-${tab.value}`}
            aria-selected={isActive}
            aria-controls={`topology-panel-${tab.value}`}
            onClick={() => onChange(tab.value)}
            style={{
              background: isActive ? "rgba(200, 255, 0, 0.1)" : "transparent",
              border: isActive
                ? "1px solid rgba(200, 255, 0, 0.35)"
                : "1px solid transparent",
              borderRadius: "4px",
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 2,
              transition: "background 0.15s ease, border-color 0.15s ease",
              minWidth: 130,
              minHeight: 44,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                color: isActive ? "var(--v2-accent)" : "rgba(240, 242, 245, 0.55)",
                fontWeight: isActive ? 600 : 400,
                lineHeight: 1.2,
              }}
            >
              {tab.label}
            </span>
            <span
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "8.5px",
                color: isActive ? "rgba(200, 255, 0, 0.65)" : "rgba(240,242,245,0.3)",
                lineHeight: 1.2,
              }}
            >
              {tab.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
