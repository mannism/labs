/**
 * CardBlock — container with title, optional subtitle, and recursive childBlocks.
 * Children are rendered by the caller via `renderChildren` to break the
 * circular dependency between CardBlock → BlockRenderer → CardBlock.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { CardProps, UIBlock } from "@/lib/schemas/uiBlocks";

interface CardBlockProps {
  props: CardProps;
  childBlocks?: UIBlock[];
  /** Caller-provided renderer to avoid a circular import with BlockRenderer. */
  renderChildren: (blocks: UIBlock[]) => React.ReactNode;
}

export function CardBlock({ props, childBlocks, renderChildren }: CardBlockProps) {
  return (
    <div
      style={{
        padding: "var(--v2-space-md)",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--exp-glass-border)",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-sm)",
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span
          style={{
            fontFamily: "var(--v2-font-display)",
            fontSize: "var(--v2-font-size-base)",
            fontWeight: 600,
            color: "var(--exp-glass-text)",
            lineHeight: 1.2,
          }}
        >
          {props.title}
        </span>

        {props.subtitle !== undefined && (
          <span
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text-muted)",
              lineHeight: 1.4,
            }}
          >
            {props.subtitle}
          </span>
        )}
      </div>

      {/* Recursive childBlocks */}
      {childBlocks !== undefined && childBlocks.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--v2-space-sm)",
          }}
        >
          {renderChildren(childBlocks)}
        </div>
      )}
    </div>
  );
}
