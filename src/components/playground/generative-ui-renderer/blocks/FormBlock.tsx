/**
 * FormBlock — form container with optional title and recursive childBlocks (input_fields).
 * Children are rendered by the caller via `renderChildren` to break the
 * circular dependency between FormBlock → BlockRenderer → FormBlock.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { FormProps, UIBlock } from "@/lib/schemas/uiBlocks";

interface FormBlockProps {
  props: FormProps;
  childBlocks?: UIBlock[];
  /** Caller-provided renderer to avoid a circular import with BlockRenderer. */
  renderChildren: (blocks: UIBlock[]) => React.ReactNode;
}

export function FormBlock({ props, childBlocks, renderChildren }: FormBlockProps) {
  return (
    // role="group" conveys that this is a form container in a layout preview —
    // it is decorative, not a real form submission target.
    <div
      role="group"
      aria-label={props.title !== undefined ? props.title : "Form"}
      style={{
        padding: "var(--v2-space-md)",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--exp-glass-border)",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-md)",
      }}
    >
      {/* Optional form title */}
      {props.title !== undefined && (
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text-muted)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
          }}
        >
          {props.title}
        </span>
      )}

      {/* Recursive field childBlocks */}
      {childBlocks !== undefined && childBlocks.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--v2-space-md)",
          }}
        >
          {renderChildren(childBlocks)}
        </div>
      )}
    </div>
  );
}
