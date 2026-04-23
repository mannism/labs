/**
 * DividerBlock — horizontal separator rule.
 * Props are empty per schema — no data needed.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

export function DividerBlock() {
  return (
    <hr
      aria-hidden="true"
      style={{
        border: "none",
        borderTop: "1px solid var(--exp-glass-border)",
        margin: 0,
        width: "100%",
      }}
    />
  );
}
