/**
 * BlockRenderer — maps UIBlock type to the corresponding block component.
 *
 * Handles all 9 block types defined in the UIBlock discriminated union.
 * Unknown types (defensive guard against future schema additions or malformed
 * payloads that pass Zod) render an error placeholder — never throw.
 *
 * Recursive rendering: card and form blocks pass `renderChildren` back into
 * BlockRenderer, enabling arbitrarily nested layouts without circular imports
 * (the container components accept a function, not a direct import).
 */

import type { UIBlock } from "@/lib/schemas/uiBlocks";
import { HeadingBlock }    from "./blocks/HeadingBlock";
import { ParagraphBlock }  from "./blocks/ParagraphBlock";
import { ButtonBlock }     from "./blocks/ButtonBlock";
import { CardBlock }       from "./blocks/CardBlock";
import { StatBlock }       from "./blocks/StatBlock";
import { FormBlock }       from "./blocks/FormBlock";
import { InputFieldBlock } from "./blocks/InputFieldBlock";
import { DividerBlock }    from "./blocks/DividerBlock";
import { BadgeBlock }      from "./blocks/BadgeBlock";

interface BlockRendererProps {
  block: UIBlock;
}

/**
 * Render a list of UIBlocks recursively.
 * Passed as `renderChildren` to container blocks so they can render their
 * nested children without importing BlockRenderer directly (breaks circularity).
 */
function renderChildBlocks(blocks: UIBlock[]): React.ReactNode {
  return blocks.map((child) => (
    <BlockRenderer key={child.id} block={child} />
  ));
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock props={block.props} />;

    case "paragraph":
      return <ParagraphBlock props={block.props} />;

    case "button":
      return <ButtonBlock props={block.props} />;

    case "card":
      return (
        <CardBlock
          props={block.props}
          children={block.children}
          renderChildren={renderChildBlocks}
        />
      );

    case "stat":
      return <StatBlock props={block.props} />;

    case "form":
      return (
        <FormBlock
          props={block.props}
          children={block.children}
          renderChildren={renderChildBlocks}
        />
      );

    case "input_field":
      return <InputFieldBlock props={block.props} id={block.id} />;

    case "divider":
      return <DividerBlock />;

    case "badge":
      return <BadgeBlock props={block.props} />;

    default: {
      // Defensive fallback: the discriminated union is exhaustive per the schema,
      // but this guard handles any runtime block type that bypasses TypeScript.
      const unknownBlock = block as { type: string; id: string };
      console.warn(
        `[BlockRenderer] unknown block type "${unknownBlock.type}" (id: ${unknownBlock.id}) — rendering placeholder`
      );
      return (
        <div
          role="alert"
          aria-label={`Unknown block type: ${unknownBlock.type}`}
          style={{
            padding: "8px 12px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: "2px",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "#F87171",
          }}
        >
          Unknown block: {unknownBlock.type}
        </div>
      );
    }
  }
}
