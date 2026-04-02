import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * useTextScramble — procedural text scramble (Ghost Type) effect.
 * Each character position resolves left-to-right with an independent
 * frame counter. Characters cycle through curated Unicode/ASCII glyphs
 * until their resolve frame is reached, then lock to the final value.
 * Spaces and em dashes are never scrambled.
 *
 * Returns the current display string and an `isComplete` flag.
 * Respects prefers-reduced-motion: returns final text immediately.
 */

/** Curated glyph pool — legible in Space Grotesk */
const GLYPH_POOL = "ΣΔπ□■≡≠≈?#&_|$@%∞∂∇∴⊕⊗⌬◊";

/** Characters that should never be scrambled */
const PASSTHROUGH = new Set([" ", "\u00A0", "—", "\u2014", "\n", "\r", "\t"]);

interface TextScrambleOptions {
  /** Milliseconds between glyph cycles (lower = faster). Default: 30 */
  speed?: number;
  /** Milliseconds to wait before starting the scramble. Default: 0 */
  delay?: number;
  /** Whether the scramble is enabled (trigger control). Default: true */
  enabled?: boolean;
  /**
   * SessionStorage key for once-per-session gating. When provided, the
   * scramble only fires once per session for this key. Subsequent mounts
   * within the same session show the final text immediately.
   */
  sessionKey?: string;
}

interface TextScrambleResult {
  /** The current display string (scrambled or resolved) */
  text: string;
  /** True once every character has resolved to its final value */
  isComplete: boolean;
}

export function useTextScramble(
  text: string,
  options: TextScrambleOptions = {}
): TextScrambleResult {
  const { speed = 30, delay = 0, enabled = true, sessionKey } = options;
  const prefersReduced = useReducedMotion();

  /**
   * Check sessionStorage to determine if this scramble has already played.
   * Deferred to useEffect to avoid hydration mismatch (sessionStorage is
   * unavailable on the server, so reading it during render would cause the
   * client initial state to diverge from the server-rendered state).
   */
  const alreadyPlayed = useRef(false);

  const [displayText, setDisplayText] = useState(text);
  const [isComplete, setIsComplete] = useState(false);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const delayedRef = useRef(false);

  /** Pick a random glyph from the pool */
  const randomGlyph = useCallback((): string => {
    return GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)];
  }, []);

  useEffect(() => {
    /* Check sessionStorage for session gating (safe — runs only on client) */
    if (sessionKey) {
      try {
        alreadyPlayed.current =
          sessionStorage.getItem(sessionKey) === "done";
      } catch {
        /* sessionStorage unavailable — fall through */
      }
    }

    /* Reduced motion — show final text immediately */
    if (prefersReduced) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    /* Already played this session — show final text immediately */
    if (alreadyPlayed.current) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    /* Not yet enabled — hold on scrambled placeholder until triggered */
    if (!enabled) {
      setDisplayText(
        text
          .split("")
          .map((ch) => (PASSTHROUGH.has(ch) ? ch : randomGlyph()))
          .join("")
      );
      setIsComplete(false);
      return;
    }

    setIsComplete(false);
    delayedRef.current = false;
    startTimeRef.current = null;

    /**
     * Each character gets a "resolve frame" — the frame number at which
     * it locks to its final value. Char 0 resolves at frame 0,
     * char 1 at frame 2, char 2 at frame 4, etc.
     * Total frames ≈ text.length * 2, so at ~30ms/frame a 40-char
     * headline takes ~2.4s * (30/50) ≈ 1.2s.
     */
    const resolveFrames = Array.from({ length: text.length }, (_, i) => i * 2);
    const totalFrames = resolveFrames.length > 0
      ? resolveFrames[resolveFrames.length - 1] + 6
      : 0;

    const animate = (timestamp: number) => {
      /* Handle initial delay */
      if (!delayedRef.current) {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp;
        }
        if (timestamp - startTimeRef.current < delay) {
          rafRef.current = requestAnimationFrame(animate);
          return;
        }
        delayedRef.current = true;
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - (startTimeRef.current ?? timestamp);
      const currentFrame = Math.floor(elapsed / speed);

      if (currentFrame >= totalFrames) {
        /* Animation complete — lock to final text */
        setDisplayText(text);
        setIsComplete(true);
        /* Mark this scramble as played for the session */
        if (sessionKey) {
          try {
            sessionStorage.setItem(sessionKey, "done");
          } catch {
            /* sessionStorage unavailable — no-op */
          }
        }
        return;
      }

      /* Build the current display string character by character */
      const chars: string[] = [];
      for (let i = 0; i < text.length; i++) {
        if (PASSTHROUGH.has(text[i])) {
          /* Never scramble spaces, em dashes, or whitespace */
          chars.push(text[i]);
        } else if (currentFrame >= resolveFrames[i] + 6) {
          /* Character has resolved — lock it */
          chars.push(text[i]);
        } else if (currentFrame >= resolveFrames[i]) {
          /* Character is in its resolve window — cycle glyphs */
          chars.push(randomGlyph());
        } else {
          /* Character hasn't started resolving yet — show glyph */
          chars.push(randomGlyph());
        }
      }

      setDisplayText(chars.join(""));
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [text, speed, delay, enabled, prefersReduced, randomGlyph, sessionKey]);

  return { text: displayText, isComplete };
}
