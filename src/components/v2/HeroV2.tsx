"use client";

/**
 * HeroV2 — display header for the Speculative Interface (v2).
 * Renders a system-label breadcrumb, large display headline (Space Grotesk),
 * and a short subtitle. Clinical aesthetic — no decorative effects.
 * All sizing and color via v2 design tokens.
 */
export function HeroV2() {
  return (
    <section
      className="max-w-7xl mx-auto w-full px-6"
      style={{
        paddingTop: "var(--v2-space-3xl)",
        paddingBottom: "var(--v2-space-3xl)",
      }}
    >
      {/* System label — monospace directory breadcrumb */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          margin: 0,
          marginBottom: "var(--v2-space-lg)",
        }}
      >
        CORE DIRECTORY // SYSTEM.USER.DIANA_ISMAIL
      </p>

      {/* Display headline — large, bold, tight tracking */}
      <h1
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: "var(--v2-letter-spacing-tight)",
          color: "var(--v2-text-primary)",
          margin: 0,
          marginBottom: "var(--v2-space-md)",
        }}
      >
        Labs by Diana —{" "}
        <span style={{ color: "var(--v2-text-secondary)" }}>
          Experiments that ship.
        </span>
      </h1>

      {/* Subtitle — brief description in body font */}
      <p
        style={{
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-lg)",
          lineHeight: 1.6,
          color: "var(--v2-text-secondary)",
          maxWidth: "600px",
          margin: 0,
        }}
      >
        Side projects that got out of hand. AI tools built for problems I kept
        tripping over — now live, now yours.
      </p>
    </section>
  );
}
