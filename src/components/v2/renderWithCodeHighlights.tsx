import React from "react";

/**
 * renderWithCodeHighlights — parses text for bracket patterns like [skip ci],
 * [ALL_CAPS_TEXT], and backtick-wrapped `code` spans, rendering them as
 * inline <code> elements with monospace styling and subtle background.
 */
export function renderWithCodeHighlights(text: string): React.ReactNode[] {
  /* Match [BRACKET_PATTERNS] or `backtick-wrapped` text */
  const pattern = /(\[[\w\s]+\]|`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    /* Push preceding plain text */
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    /* Strip backticks for display, keep brackets as-is */
    const raw = match[1];
    const display = raw.startsWith("`") ? raw.slice(1, -1) : raw;

    parts.push(
      <code
        key={`${match.index}-${raw}`}
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "0.88em",
          background: "var(--v2-tag-bg)",
          border: "1px solid var(--v2-tag-border)",
          borderRadius: "3px",
          padding: "1px 5px",
        }}
      >
        {display}
      </code>
    );

    lastIndex = match.index + match[0].length;
  }

  /* Push any remaining plain text */
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
