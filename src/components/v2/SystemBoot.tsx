"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";
import packageJson from "../../../package.json";
import projectsData from "../../data/projects.json";
import { Project } from "@/types/project";

/**
 * SystemBoot — full-page terminal initialization overlay.
 * Plays a character-by-character boot log sequence on first session visit,
 * then wipes upward to reveal the site. Gated by sessionStorage so it
 * only plays once per browser session. Click anywhere to skip.
 * Respects prefers-reduced-motion: skips entirely when enabled.
 */

/** Session storage key — prevents replay across page navigations */
const BOOT_STORAGE_KEY = "labs-boot-played";

/** Typing speed in characters per second */
const CHARS_PER_SECOND = 40;

/** Delay between dots appearing (ms) */
const DOT_INTERVAL = 50;

/** How many visible (non-hidden) projects exist */
const MODULE_COUNT = (projectsData as Project[]).filter(
  (p) => p.display !== false
).length;

/**
 * BootLine — a single line in the boot log.
 * `prefix`: the bracketed label, e.g. "[INIT]"
 * `body`: the main text content
 * `dots`: number of status dots to animate before the result
 * `result`: the status text rendered in chartreuse (e.g. "OK", "READY")
 */
interface BootLine {
  prefix: string;
  body: string;
  dots: number;
  result: string;
}

/** Build the boot log lines with live data */
function getBootLines(): BootLine[] {
  return [
    {
      prefix: "[INIT]",
      body: ` CORE_DIRECTORY v${packageJson.version}`,
      dots: 0,
      result: "",
    },
    {
      prefix: "[LOAD]",
      body: " system.user.diana_ismail ",
      dots: 11,
      result: "OK",
    },
    {
      prefix: "[SCAN]",
      body: ` modules detected: ${MODULE_COUNT}`,
      dots: 0,
      result: "",
    },
    {
      prefix: "[SYNC]",
      body: " github.status ",
      dots: 19,
      result: "CONNECTED",
    },
    {
      prefix: "[BOOT]",
      body: " interface.speculative ",
      dots: 9,
      result: "READY",
    },
  ];
}

export function SystemBoot() {
  const prefersReduced = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(false);
  const [phase, setPhase] = useState<"cursor" | "typing" | "wipe" | "done">(
    "cursor"
  );
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [cursorBlinks, setCursorBlinks] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef(false);

  /** Check session gate on mount */
  useEffect(() => {
    if (prefersReduced) return;
    const played = sessionStorage.getItem(BOOT_STORAGE_KEY);
    if (!played) {
      setShouldRender(true);
    }
  }, [prefersReduced]);

  /** Skip handler — immediately wipe out */
  const handleSkip = useCallback(() => {
    if (skipRef.current) return;
    skipRef.current = true;
    setPhase("wipe");
  }, []);

  /** Phase 1: cursor blink (2 blinks = 4 state changes at 200ms each = 800ms) */
  useEffect(() => {
    if (!shouldRender || phase !== "cursor") return;

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setCursorBlinks(count);
      if (count >= 4) {
        clearInterval(interval);
        setPhase("typing");
      }
    }, 200);

    return () => clearInterval(interval);
  }, [shouldRender, phase]);

  /** Phase 2: typing — character-by-character rendering of boot lines */
  useEffect(() => {
    if (!shouldRender || phase !== "typing") return;

    const lines = getBootLines();
    let currentLineIdx = 0;
    let charIdx = 0;
    let dotIdx = 0;
    let subPhase: "text" | "dots" | "result" = "text";
    const renderedLines: string[] = [];
    let currentLineText = "";

    const interval = setInterval(() => {
      if (skipRef.current) {
        clearInterval(interval);
        return;
      }

      const line = lines[currentLineIdx];
      if (!line) {
        clearInterval(interval);
        /* Brief pause before wipe */
        setTimeout(() => {
          if (!skipRef.current) setPhase("wipe");
        }, 300);
        return;
      }

      if (subPhase === "text") {
        /* Build the full prefix + body text character by character */
        const fullText = line.prefix + line.body;
        if (charIdx < fullText.length) {
          currentLineText += fullText[charIdx];
          charIdx++;
          /* Update the current line in the display */
          const updated = [...renderedLines, currentLineText];
          setVisibleLines(updated);
        } else {
          /* Text done — move to dots or result */
          if (line.dots > 0) {
            subPhase = "dots";
            dotIdx = 0;
          } else if (line.result) {
            subPhase = "result";
          } else {
            /* No dots or result — finish line, move to next */
            renderedLines.push(currentLineText);
            currentLineIdx++;
            charIdx = 0;
            currentLineText = "";
            subPhase = "text";
            setVisibleLines([...renderedLines]);
          }
        }
      } else if (subPhase === "dots") {
        if (dotIdx < line.dots) {
          dotIdx++;
          const dotsStr = ".".repeat(dotIdx);
          const updated = [...renderedLines, currentLineText + dotsStr];
          setVisibleLines(updated);
        } else {
          /* Dots done — move to result */
          if (line.result) {
            subPhase = "result";
          } else {
            const dotsStr = ".".repeat(line.dots);
            renderedLines.push(currentLineText + dotsStr);
            currentLineIdx++;
            charIdx = 0;
            dotIdx = 0;
            currentLineText = "";
            subPhase = "text";
            setVisibleLines([...renderedLines]);
          }
        }
      } else if (subPhase === "result") {
        /* Render the result and finalize the line */
        const dotsStr = line.dots > 0 ? ".".repeat(line.dots) : "";
        const finalLine = currentLineText + dotsStr;
        renderedLines.push(finalLine + " " + line.result);
        currentLineIdx++;
        charIdx = 0;
        dotIdx = 0;
        currentLineText = "";
        subPhase = "text";
        setVisibleLines([...renderedLines]);
      }
    }, 1000 / CHARS_PER_SECOND);

    return () => clearInterval(interval);
  }, [shouldRender, phase]);

  /** Phase 3: wipe complete — mark as played and remove */
  const handleWipeComplete = useCallback(() => {
    sessionStorage.setItem(BOOT_STORAGE_KEY, "true");
    setPhase("done");
    setShouldRender(false);
  }, []);

  if (!shouldRender || phase === "done") return null;

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          ref={containerRef}
          onClick={handleSkip}
          role="presentation"
          aria-label="System boot sequence — click to skip"
          initial={{ clipPath: "inset(0 0 0 0)" }}
          animate={
            phase === "wipe"
              ? { clipPath: "inset(100% 0 0 0)" }
              : { clipPath: "inset(0 0 0 0)" }
          }
          transition={
            phase === "wipe"
              ? { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }
              : undefined
          }
          onAnimationComplete={() => {
            if (phase === "wipe") handleWipeComplete();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "var(--v2-bg-primary)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: phase === "cursor" ? "center" : "flex-start",
            alignItems: phase === "cursor" ? "center" : "flex-start",
            padding: phase === "cursor" ? 0 : "var(--v2-space-3xl)",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-sm)",
            lineHeight: 1.8,
            overflow: "hidden",
          }}
        >
          {/* Phase 1: blinking cursor */}
          {phase === "cursor" && (
            <span
              style={{
                color: "var(--v2-text-secondary)",
                fontSize: "var(--v2-font-size-xl)",
                opacity: cursorBlinks % 2 === 0 ? 1 : 0,
                transition: "opacity 0.05s",
              }}
            >
              _
            </span>
          )}

          {/* Phase 2: typing log stream */}
          {(phase === "typing" || phase === "wipe") && (
            <div style={{ maxWidth: "600px" }}>
              {visibleLines.map((line, i) => (
                <BootLogLine key={i} text={line} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * BootLogLine — renders a single line of the boot log.
 * Brackets are rendered in secondary text color.
 * Status results (OK, CONNECTED, READY) are rendered in chartreuse.
 */
function BootLogLine({ text }: { text: string }) {
  /* Split the line to colorize brackets and status results */
  const statusWords = ["OK", "CONNECTED", "READY"];
  const parts: { text: string; color: string }[] = [];

  /* Extract bracket prefix if present */
  const bracketMatch = text.match(/^(\[[A-Z]+\])(.*)/);
  if (bracketMatch) {
    parts.push({
      text: bracketMatch[1],
      color: "var(--v2-text-secondary)",
    });
    const rest = bracketMatch[2];

    /* Check if the line ends with a status word */
    const statusMatch = statusWords.find((s) => rest.endsWith(s));
    if (statusMatch) {
      parts.push({
        text: rest.slice(0, -statusMatch.length),
        color: "var(--v2-text-tertiary)",
      });
      parts.push({
        text: statusMatch,
        color: "var(--v2-accent)",
      });
    } else {
      parts.push({
        text: rest,
        color: "var(--v2-text-tertiary)",
      });
    }
  } else {
    parts.push({ text, color: "var(--v2-text-tertiary)" });
  }

  return (
    <div style={{ whiteSpace: "pre" }}>
      {parts.map((part, i) => (
        <span key={i} style={{ color: part.color }}>
          {part.text}
        </span>
      ))}
    </div>
  );
}
