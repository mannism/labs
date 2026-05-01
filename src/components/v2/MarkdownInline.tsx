"use client";

import React from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";

/**
 * MarkdownInline — renders a single paragraph of markdown as inline JSX nodes.
 *
 * Purpose: replaces the custom regex-based renderWithCodeHighlights function which
 * could only handle backticks and ALL_CAPS bracket patterns. This component adds
 * proper support for **bold**, *italic*, [links](url), and `code` chips.
 *
 * Design constraints:
 * - All call sites are already inside a <p> element; the wrapping <p> that
 *   react-markdown emits by default is stripped via a custom `p` component that
 *   returns a React Fragment. Nesting <p> inside <p> is invalid HTML and causes
 *   React hydration warnings.
 * - Only inline-safe elements are allowed (strong, em, a, code, p which is unwrapped).
 *   Block elements (headings, lists, blockquotes, hr, etc.) are excluded — article
 *   bodies are authored as flowing prose with double-newline paragraph breaks handled
 *   upstream by the split("\n\n") in the caller.
 * - Internal links (starting with "/") are rendered without target="_blank".
 *   External links get target="_blank" + rel="noopener noreferrer" for security.
 * - Code chip styles mirror the previous renderWithCodeHighlights output exactly,
 *   using the same CSS custom properties (--v2-font-mono, --v2-tag-bg, etc.).
 * - prefers-reduced-motion is not relevant here (no animation).
 */

/** CSS custom property tokens used in chip + link styles */
const CODE_CHIP_STYLE: React.CSSProperties = {
  fontFamily: "var(--v2-font-mono)",
  fontSize: "0.88em",
  background: "var(--v2-tag-bg)",
  border: "1px solid var(--v2-tag-border)",
  borderRadius: "3px",
  padding: "1px 5px",
};

const LINK_STYLE: React.CSSProperties = {
  color: "var(--v2-accent)",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

/**
 * react-markdown component overrides.
 * Only p, strong, em, a, and code are in allowedElements — all other elements
 * are silently dropped. If the authored markdown ever includes a heading or list,
 * it will be stripped rather than rendered as raw syntax or block elements.
 */
const MARKDOWN_COMPONENTS: Components = {
  /**
   * p — strip the wrapping block element.
   * react-markdown always wraps inline content in <p>; since our call sites are
   * already inside <p>, we return a Fragment to avoid invalid nested <p> tags.
   */
  p: ({ children }) => <>{children}</>,

  /**
   * strong — bold with inherited font, no extra weight override needed
   * since the body font is already normal-weight; the browser's default bold
   * (700) is appropriate here.
   */
  strong: ({ children }) => <strong>{children}</strong>,

  /**
   * em — italic, inherits font-family from parent <p>
   */
  em: ({ children }) => <em>{children}</em>,

  /**
   * a — inline link.
   * Internal paths ("/labs/...", "/playground/...", etc.) stay same-tab.
   * External URLs open in a new tab with noopener noreferrer.
   * defaultUrlTransform from react-markdown sanitises URLs before they reach here,
   * so javascript: URLs are already blocked upstream.
   */
  a: ({ href, children }) => {
    const isInternal = href?.startsWith("/") ?? false;
    return (
      <a
        href={href}
        style={LINK_STYLE}
        {...(!isInternal && {
          target: "_blank",
          rel: "noopener noreferrer",
        })}
      >
        {children}
      </a>
    );
  },

  /**
   * code — inline code chip.
   * Styles are identical to the previous renderWithCodeHighlights output so
   * existing articles that use backtick chips show no visual change.
   * Note: react-markdown passes pre+code for fenced code blocks, but since
   * "pre" is not in allowedElements, fenced blocks are stripped. Only inline
   * `code` reaches this renderer.
   */
  code: ({ children }) => (
    <code style={CODE_CHIP_STYLE}>{children}</code>
  ),
};

/** Inline elements that are safe to render inside a <p> */
const ALLOWED_ELEMENTS = ["p", "strong", "em", "a", "code"] as const;

/**
 * MarkdownInline component.
 *
 * Usage (inside a parent <p> element):
 *   <p style={...}><MarkdownInline>{text}</MarkdownInline></p>
 *
 * The text prop is a single paragraph string — the caller is responsible for
 * splitting multi-paragraph content on "\n\n" and rendering each paragraph
 * as a separate MarkdownInline instance.
 */
export function MarkdownInline({ children }: { children: string }) {
  return (
    <Markdown
      allowedElements={ALLOWED_ELEMENTS as unknown as string[]}
      unwrapDisallowed
      components={MARKDOWN_COMPONENTS}
    >
      {children}
    </Markdown>
  );
}
