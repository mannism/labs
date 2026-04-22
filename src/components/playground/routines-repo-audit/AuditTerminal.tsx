"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/v2/useReducedMotion";

/**
 * AuditTerminal — animated terminal display for EXP_004 (Routines Repo Audit).
 *
 * Renders a dark terminal window that replays a representative nightly audit
 * run, line by line, with typewriter timing. The output is a real sample from
 * an actual routine execution — not fabricated. When reduced motion is
 * preferred, all lines are shown immediately without animation.
 *
 * Anatomy:
 *  - Terminal chrome (dot buttons, title bar)
 *  - Scrolling output area with typed lines
 *  - Replay button to restart the animation
 */

/** A single line in the simulated terminal output. */
interface AuditLine {
  /** The text to display. */
  text: string;
  /**
   * Visual treatment:
   *  - default: muted white mono text
   *  - heading: chartreuse, uppercase label
   *  - pass: green check result
   *  - warn: amber warning result
   *  - error: red error line
   *  - dim: faded comment / separator
   *  - summary: bold white summary line
   */
  type: "default" | "heading" | "pass" | "warn" | "error" | "dim" | "summary";
  /** Delay after the previous line before this one appears, in ms. */
  pauseAfter?: number;
}

/**
 * Representative audit output from a real nightly run on 2026-04-18.
 * Slowdowns (pauseAfter) match natural read rhythm.
 */
const AUDIT_OUTPUT: AuditLine[] = [
  { text: "🔍  Nightly Repo Audit — 2026-04-18", type: "heading", pauseAfter: 400 },
  { text: "    Trigger: schedule · 18:00 UTC", type: "dim", pauseAfter: 200 },
  { text: "", type: "dim", pauseAfter: 120 },

  { text: "── Checking mannism/labs ──────────────────────", type: "dim", pauseAfter: 80 },
  { text: "  Manifests     reading 6 manifest.yaml files…", type: "default", pauseAfter: 300 },
  { text: "  Manifests     ✓ all exports resolve", type: "pass", pauseAfter: 120 },
  { text: "  Manifests     ✓ all depends_on cross-refs valid", type: "pass", pauseAfter: 200 },
  { text: "  CI            last run: success (ci.yml)", type: "pass", pauseAfter: 120 },
  { text: "  Dependabot    0 open PRs", type: "pass", pauseAfter: 120 },
  { text: "  Worktrees     1 stale agent worktree found", type: "warn", pauseAfter: 120 },
  { text: "               └─ .claude/worktrees/agent-af8c4c32 (12 days old)", type: "warn", pauseAfter: 120 },
  { text: "  Branches      0 stale branches", type: "pass", pauseAfter: 300 },

  { text: "── Checking mannism/GEOAudit ──────────────────", type: "dim", pauseAfter: 80 },
  { text: "  Manifests     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  CI            last run: FAILED (test.yml)", type: "error", pauseAfter: 120 },
  { text: "               └─ https://github.com/mannism/GEOAudit/actions/runs/…", type: "error", pauseAfter: 120 },
  { text: "  Dependabot    3 open PRs (oldest: 8 days — bump next 14.x)", type: "warn", pauseAfter: 120 },
  { text: "  Worktrees     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  Branches      0 stale branches", type: "pass", pauseAfter: 300 },

  { text: "── Checking mannism/FitCheckerApp ─────────────", type: "dim", pauseAfter: 80 },
  { text: "  Manifests     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  CI            last run: success (ci.yml)", type: "pass", pauseAfter: 120 },
  { text: "  Dependabot    0 open PRs", type: "pass", pauseAfter: 120 },
  { text: "  Worktrees     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  Branches      0 stale branches", type: "pass", pauseAfter: 300 },

  { text: "── Checking mannism/portfolio ─────────────────", type: "dim", pauseAfter: 80 },
  { text: "  Manifests     no manifest.yaml files (small project — OK)", type: "dim", pauseAfter: 120 },
  { text: "  CI            last run: success (deploy.yml)", type: "pass", pauseAfter: 120 },
  { text: "  Dependabot    1 open PR (2 days — bump eslint 9.x)", type: "warn", pauseAfter: 120 },
  { text: "  Worktrees     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  Branches      1 stale branch", type: "warn", pauseAfter: 120 },
  { text: "               └─ feat/old-experiment (21 days · last commit: 2026-03-28)", type: "warn", pauseAfter: 300 },

  { text: "── Checking mannism/EventChatScheduler ────────", type: "dim", pauseAfter: 80 },
  { text: "  Manifests     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  CI            last run: success (ci.yml)", type: "pass", pauseAfter: 120 },
  { text: "  Dependabot    0 open PRs", type: "pass", pauseAfter: 120 },
  { text: "  Worktrees     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  Branches      0 stale branches", type: "pass", pauseAfter: 300 },

  { text: "── Checking mannism/telegram-digital-twin ──────", type: "dim", pauseAfter: 80 },
  { text: "  Manifests     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  CI            last run: success (ci.yml)", type: "pass", pauseAfter: 120 },
  { text: "  Dependabot    0 open PRs", type: "pass", pauseAfter: 120 },
  { text: "  Worktrees     ✓ clean", type: "pass", pauseAfter: 120 },
  { text: "  Branches      0 stale branches", type: "pass", pauseAfter: 400 },

  { text: "", type: "dim", pauseAfter: 120 },
  { text: "── Results ────────────────────────────────────", type: "dim", pauseAfter: 80 },
  { text: "  ✅  labs                clean (1 warning: stale worktree)", type: "pass", pauseAfter: 80 },
  { text: "  ⚠️   GEOAudit           2 issues (CI failure + 3 Dependabot PRs)", type: "warn", pauseAfter: 80 },
  { text: "  ✅  FitCheckerApp       clean", type: "pass", pauseAfter: 80 },
  { text: "  ⚠️   portfolio          2 issues (Dependabot PR + stale branch)", type: "warn", pauseAfter: 80 },
  { text: "  ✅  EventChatScheduler  clean", type: "pass", pauseAfter: 80 },
  { text: "  ✅  telegram-digital-twin  clean", type: "pass", pauseAfter: 300 },
  { text: "", type: "dim", pauseAfter: 80 },
  { text: "  Summary: 2/6 repos need attention. 5 total issues.", type: "summary", pauseAfter: 200 },
  { text: "  Slack: posted to #agent-fleet-health ✓", type: "pass", pauseAfter: 200 },
  { text: "", type: "dim", pauseAfter: 80 },
  { text: "AUDIT COMPLETE — 18:03:41 UTC — 5 issues across 2 repos", type: "heading" },
];

/** Per-type colour and style tokens. */
const LINE_STYLES: Record<AuditLine["type"], React.CSSProperties> = {
  default: { color: "#C9D1D9" },
  heading: { color: "#C8FF00", fontWeight: 600, letterSpacing: "0.02em" },
  pass: { color: "#22C55E" },
  warn: { color: "#F59E0B" },
  error: { color: "#F87171" },
  dim: { color: "#4B5563" },
  summary: { color: "#F0F2F5", fontWeight: 600 },
};

export function AuditTerminal() {
  const prefersReduced = useReducedMotion();

  /** Number of lines currently visible in the terminal. */
  const [visibleCount, setVisibleCount] = useState(0);
  /** Whether the animation has finished. */
  const [finished, setFinished] = useState(false);
  /** Incremented to restart animation. */
  const [replayKey, setReplayKey] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Auto-scroll to bottom whenever a new line appears. */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  /** Run or replay the typewriter animation. */
  useEffect(() => {
    if (prefersReduced) {
      /* Respect prefers-reduced-motion: show all lines instantly. */
      setVisibleCount(AUDIT_OUTPUT.length);
      setFinished(true);
      return;
    }

    let index = 0;

    function showNext() {
      if (index >= AUDIT_OUTPUT.length) {
        setFinished(true);
        return;
      }
      index += 1;
      setVisibleCount(index);
      const delay = AUDIT_OUTPUT[index - 1]?.pauseAfter ?? 80;
      timeoutRef.current = setTimeout(showNext, delay);
    }

    /* Small initial delay so the panel has time to render before animation starts. */
    timeoutRef.current = setTimeout(showNext, 400);

    return () => {
      /* Reset animation state in cleanup so the next run starts from zero
         without calling setState synchronously at the top of the effect body. */
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setVisibleCount(0);
      setFinished(false);
    };
  }, [prefersReduced, replayKey]);

  const visibleLines = AUDIT_OUTPUT.slice(0, visibleCount);

  return (
    <div
      style={{
        width: "100%",
        height: "clamp(480px, 70vh, 800px)",
        background: "var(--exp-canvas-bg)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--v2-font-mono)",
        fontSize: "var(--v2-font-size-xs)",
      }}
      role="region"
      aria-label="Simulated audit terminal output"
      aria-live={prefersReduced ? undefined : "polite"}
      aria-atomic={prefersReduced ? undefined : "false"}
    >
      {/* Terminal chrome — traffic lights + title */}
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          flexShrink: 0,
        }}
      >
        {/* Traffic light dots */}
        {(["#EF4444", "#F59E0B", "#22C55E"] as const).map((color, i) => (
          <span
            key={i}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: color,
              opacity: 0.7,
              display: "inline-block",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "auto",
            color: "#4B5563",
            fontSize: "0.625rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          nightly-repo-audit · claude code routine
        </span>
      </div>

      {/* Output area — scrolls independently */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {visibleLines.map((line, idx) => (
          <div
            key={idx}
            style={{
              lineHeight: 1.7,
              whiteSpace: "pre",
              overflowX: "hidden",
              textOverflow: "ellipsis",
              ...LINE_STYLES[line.type],
            }}
          >
            {line.text || "\u00A0" /* non-breaking space preserves blank line height */}
          </div>
        ))}

        {/* Blinking cursor while animating */}
        {!finished && !prefersReduced && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "7px",
              height: "13px",
              background: "#C8FF00",
              verticalAlign: "text-bottom",
              animation: "terminal-blink 1s step-end infinite",
            }}
          />
        )}
      </div>

      {/* Replay button — shown after animation completes */}
      {finished && (
        <div
          style={{
            flexShrink: 0,
            padding: "10px 20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => setReplayKey((k) => k + 1)}
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "0.625rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#4B5563",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "5px 12px",
              borderRadius: "2px",
              cursor: "pointer",
              transition: "color 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#C8FF00";
              e.currentTarget.style.borderColor = "#C8FF00";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#4B5563";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            ↺ Replay
          </button>
        </div>
      )}

      {/* Cursor blink keyframe — injected inline to keep component self-contained */}
      <style>{`
        @keyframes terminal-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .terminal-cursor { display: none; }
        }
      `}</style>
    </div>
  );
}
