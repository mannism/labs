/**
 * StatBlock — metric display with label, value, and optional change indicator.
 * Change strings starting with '+' render in accent green; '-' in warning red.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { StatProps } from "@/lib/schemas/uiBlocks";

interface StatBlockProps {
  props: StatProps;
}

/** Determine change indicator colour from the change string prefix. */
function changeColor(change: string): string {
  if (change.startsWith("+")) return "var(--exp-status-live)";
  if (change.startsWith("-")) return "#F87171"; // soft red — no dedicated token
  return "var(--exp-glass-text-muted)";
}

export function StatBlock({ props }: StatBlockProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-xs)",
        padding: "var(--v2-space-md)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--exp-glass-border)",
        borderRadius: "4px",
      }}
    >
      {/* Label */}
      <span
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
        }}
      >
        {props.label}
      </span>

      {/* Value */}
      <span
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "var(--v2-font-size-xl)",
          fontWeight: 700,
          color: "var(--exp-glass-text)",
          lineHeight: 1,
          letterSpacing: "var(--v2-letter-spacing-tighter)",
        }}
      >
        {props.value}
      </span>

      {/* Change indicator — optional */}
      {props.change !== undefined && (
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: changeColor(props.change),
          }}
          aria-label={`Change: ${props.change}`}
        >
          {props.change}
        </span>
      )}
    </div>
  );
}
