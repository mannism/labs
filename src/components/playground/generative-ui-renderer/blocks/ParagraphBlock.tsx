/**
 * ParagraphBlock — prose text with comfortable reading line-height.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { ParagraphProps } from "@/lib/schemas/uiBlocks";

interface ParagraphBlockProps {
  props: ParagraphProps;
}

export function ParagraphBlock({ props }: ParagraphBlockProps) {
  return (
    <p
      style={{
        fontFamily: "var(--v2-font-body)",
        fontSize: "var(--v2-font-size-sm)",
        color: "var(--exp-glass-text-muted)",
        lineHeight: 1.7,
        margin: 0,
      }}
    >
      {props.text}
    </p>
  );
}
