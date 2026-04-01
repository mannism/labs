"use client";

import packageJson from "../../../package.json";

/**
 * NavbarV2 — Speculative Interface top navigation.
 * "L A B S" letterspaced logo left, "Portfolio" link + version toggle slot right.
 * Chartreuse 2px top accent line. Clean, no glassmorphism.
 */
export function NavbarV2({ versionToggle }: { versionToggle?: React.ReactNode }) {
  return (
    <nav
      style={{
        borderTop: "2px solid var(--v2-accent)",
        borderBottom: "1px solid var(--v2-border)",
        background: "var(--v2-bg-surface)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo — letterspaced "LABS" */}
        <span
          style={{
            fontFamily: "var(--v2-font-display)",
            fontSize: "var(--v2-font-size-base)",
            fontWeight: 600,
            letterSpacing: "var(--v2-letter-spacing-wide)",
            color: "var(--v2-text-primary)",
            textTransform: "uppercase",
          }}
        >
          L A B S
        </span>

        {/* Right side: portfolio link, version toggle, subtle version display */}
        <div className="flex items-center gap-4">
          <a
            href="https://dianaismail.me"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "var(--v2-font-size-sm)",
              fontWeight: 500,
              color: "var(--v2-text-secondary)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--v2-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--v2-text-secondary)")}
          >
            Portfolio &rarr;
          </a>

          {/* Version toggle placeholder — populated by parent */}
          {versionToggle}

          {/* Package version — subtle monospace label */}
          <span
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
            }}
          >
            v{packageJson.version}
          </span>
        </div>
      </div>
    </nav>
  );
}
