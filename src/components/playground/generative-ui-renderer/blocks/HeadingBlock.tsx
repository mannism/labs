/**
 * HeadingBlock — renders h1/h2/h3 based on the level prop.
 * Defaults to h2 when level is absent.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { HeadingProps } from "@/lib/schemas/uiBlocks";

interface HeadingBlockProps {
  props: HeadingProps;
}

/** Font-size and weight per heading level. */
const LEVEL_STYLES: Record<
  1 | 2 | 3,
  { fontSize: string; fontWeight: number; letterSpacing: string }
> = {
  1: {
    fontSize: "var(--v2-font-size-xl)",
    fontWeight: 700,
    letterSpacing: "var(--v2-letter-spacing-tighter)",
  },
  2: {
    fontSize: "var(--v2-font-size-lg)",
    fontWeight: 600,
    letterSpacing: "var(--v2-letter-spacing-tight)",
  },
  3: {
    fontSize: "var(--v2-font-size-base)",
    fontWeight: 600,
    letterSpacing: "0",
  },
};

export function HeadingBlock({ props }: HeadingBlockProps) {
  const level = props.level ?? 2;
  const styles = LEVEL_STYLES[level];
  const Tag = `h${level}` as "h1" | "h2" | "h3";

  return (
    <Tag
      style={{
        fontFamily: "var(--v2-font-display)",
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        letterSpacing: styles.letterSpacing,
        color: "var(--exp-glass-text)",
        margin: 0,
        lineHeight: 1.15,
        textTransform: "uppercase",
      }}
    >
      {props.text}
    </Tag>
  );
}
