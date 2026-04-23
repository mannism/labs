/**
 * BadgeBlock — inline status/label chip with semantic colour variants.
 * Variant colours map to existing Speculative Interface v2 status tokens.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { BadgeProps } from "@/lib/schemas/uiBlocks";

interface BadgeBlockProps {
  props: BadgeProps;
}

/** Per-variant colour token mapping. */
const VARIANT_STYLES: Record<
  "default" | "success" | "warning" | "error",
  { color: string; background: string; borderColor: string }
> = {
  default: {
    color: "var(--exp-glass-text-muted)",
    background: "rgba(255,255,255,0.06)",
    borderColor: "var(--exp-glass-border)",
  },
  success: {
    color: "var(--exp-status-live)",
    background: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.25)",
  },
  warning: {
    color: "var(--exp-status-beta)",
    background: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.25)",
  },
  error: {
    color: "#F87171",
    background: "rgba(248,113,113,0.1)",
    borderColor: "rgba(248,113,113,0.25)",
  },
};

export function BadgeBlock({ props }: BadgeBlockProps) {
  const variant = props.variant ?? "default";
  const styles = VARIANT_STYLES[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        fontFamily: "var(--v2-font-mono)",
        fontSize: "var(--v2-font-size-xs)",
        letterSpacing: "var(--v2-letter-spacing-wide)",
        textTransform: "uppercase",
        borderRadius: "2px",
        border: `1px solid ${styles.borderColor}`,
        color: styles.color,
        background: styles.background,
      }}
    >
      {props.text}
    </span>
  );
}
