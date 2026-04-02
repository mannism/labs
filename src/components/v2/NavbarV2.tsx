"use client";

import packageJson from "../../../package.json";

/**
 * NavbarV2 — Speculative Interface top navigation.
 * "L A B S" letterspaced logo left, "PORTFOLIO" link right.
 * Chartreuse 2px top accent line. Clean white surface, no glassmorphism.
 * Version badge in monospace. All text is uppercase for clinical feel.
 */
export function NavbarV2() {
  return (
    <nav
      style={{
        borderTop: "2px solid var(--v2-accent)",
        borderBottom: "1px solid var(--v2-border)",
        background: "var(--v2-bg-surface)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo — letterspaced "LABS" with subtle weight */}
        <div className="flex items-center gap-3">
          <span
            style={{
              fontFamily: "var(--v2-font-display)",
              fontSize: "var(--v2-font-size-base)",
              fontWeight: 700,
              letterSpacing: "var(--v2-letter-spacing-wide)",
              color: "var(--v2-text-primary)",
              textTransform: "uppercase",
            }}
          >
            L A B S
          </span>
          {/* Breadcrumb-style subtitle — hidden on mobile (redundant with HeroV2) */}
          <span
            className="hidden md:inline"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.04em",
            }}
          >
            // SYSTEM.USER.DIANA_ISMAIL
          </span>
        </div>

        {/* Right side: portfolio link, version display */}
        <div className="flex items-center gap-3 md:gap-5">
          <a
            href="https://dianaismail.me"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              fontWeight: 500,
              color: "var(--v2-text-secondary)",
              textDecoration: "none",
              transition: "color 0.2s ease",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--v2-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--v2-text-secondary)")}
          >
            PORTFOLIO &rarr;
          </a>

          {/* Package version — hidden on mobile to save space */}
          <span
            className="hidden sm:inline"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.02em",
            }}
          >
            v{packageJson.version}
          </span>
        </div>
      </div>
    </nav>
  );
}
