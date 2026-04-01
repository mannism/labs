"use client";

import packageJson from "../../../package.json";

/**
 * FooterV2 — minimal metadata footer for the Speculative Interface.
 * Single line: "LABS v{version} // {year}". Thin top border.
 * Extra bottom padding (80px) clears the floating chat widget.
 */
export function FooterV2() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--v2-border)",
        padding: "var(--v2-space-lg) var(--v2-space-lg) 80px",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            textAlign: "center",
            margin: 0,
          }}
        >
          LABS v{packageJson.version} // {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
