/**
 * ButtonBlock — primary / secondary / outline variants.
 * Non-interactive in the renderer — the LLM generates layout previews,
 * not functional UIs, so buttons are rendered as visual elements only.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { ButtonProps } from "@/lib/schemas/uiBlocks";

interface ButtonBlockProps {
  props: ButtonProps;
}

/** Per-variant style overrides. */
const VARIANT_STYLES: Record<
  "primary" | "secondary" | "outline",
  React.CSSProperties
> = {
  primary: {
    background: "var(--v2-accent)",
    color: "var(--v2-text-primary)",
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--exp-glass-border)",
    color: "var(--exp-glass-text)",
    border: "1px solid var(--exp-glass-border)",
  },
  outline: {
    background: "transparent",
    color: "var(--exp-glass-text)",
    border: "1px solid var(--exp-glass-border)",
  },
};

export function ButtonBlock({ props }: ButtonBlockProps) {
  const variant = props.variant ?? "primary";
  const variantStyle = VARIANT_STYLES[variant];

  return (
    // role="img" + aria-label: this button is decorative — it represents a UI
    // element in a layout preview, not a real interactive control.
    <div
      role="img"
      aria-label={`Button: ${props.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 20px",
        borderRadius: "2px",
        fontFamily: "var(--v2-font-body)",
        fontSize: "var(--v2-font-size-sm)",
        fontWeight: 500,
        cursor: "default",
        userSelect: "none",
        ...variantStyle,
      }}
    >
      {props.label}
    </div>
  );
}
