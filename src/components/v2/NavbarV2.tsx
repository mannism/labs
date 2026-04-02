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
        /* WCAG: purely decorative accent line — no information conveyed. Exempt per 1.4.11. */
        borderTop: "2px solid var(--v2-accent)",
        borderBottom: "1px solid var(--v2-border)",
        background: "var(--v2-bg-surface)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: logo + version + breadcrumb */}
        <div className="flex items-center gap-2">
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
          {/* Version — part of the identity block, hidden on small mobile */}
          <span
            className="hidden sm:inline"
            suppressHydrationWarning
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.02em",
            }}
          >
            v{packageJson.version}
          </span>
          {/* Breadcrumb — hidden on mobile (redundant with HeroV2) */}
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

        {/* Right: portfolio link only */}
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
      </div>
    </nav>
  );
}
