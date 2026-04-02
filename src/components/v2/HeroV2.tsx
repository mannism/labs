"use client";

import { useTextScramble } from "./useTextScramble";

/**
 * HeroV2 — display header for the Speculative Interface (v2).
 * Renders a system-label breadcrumb, dramatically large display headline
 * (Space Grotesk, uppercase), and a compact subtitle.
 * Typography hierarchy matches Stitch: breadcrumb is tiny monospace,
 * headline is 3.25rem+ bold, subtitle is body-sized muted text.
 * Clinical aesthetic — Ghost Type scramble on the headline at page load.
 */
export function HeroV2() {
  /** Ghost Type scramble on the two headline segments */
  const headlinePart1 = useTextScramble("Labs by Diana —", { delay: 200 });
  const headlinePart2 = useTextScramble("Experiments that ship.", {
    delay: 400,
  });
  return (
    <section
      className="max-w-7xl mx-auto w-full px-6 v2-hero"
      style={{
        paddingTop: "var(--v2-space-4xl)",
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
          marginBottom: "var(--v2-space-xl)",
          textTransform: "uppercase",
        }}
      >
        CORE DIRECTORY // SYSTEM.USER.DIANA_ISMAIL
      </p>

      {/* Display headline — large, bold, tight tracking, uppercase */}
      <h1
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "clamp(var(--v2-font-size-3xl), 5vw, var(--v2-font-size-4xl))",
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "var(--v2-letter-spacing-tighter)",
          color: "var(--v2-text-primary)",
          margin: 0,
          marginBottom: "var(--v2-space-lg)",
          textTransform: "uppercase",
        }}
      >
        {headlinePart1.text}{" "}
        <span style={{ color: "var(--v2-text-secondary)", fontWeight: 400 }}>
          {headlinePart2.text}
        </span>
      </h1>

      {/* Subtitle — brief description in body font */}
      <p
        style={{
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-base)",
          lineHeight: 1.6,
          color: "var(--v2-text-secondary)",
          maxWidth: "540px",
          margin: 0,
        }}
      >
        Side projects that got out of hand. AI tools built for problems I kept
        tripping over — now live, now yours.
      </p>
    </section>
  );
}
