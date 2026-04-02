import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useProximityField — calculates cursor proximity data for each card in a grid.
 * Attaches a single mousemove listener on the grid container (not per-card)
 * and returns per-card transform values (rotateX, rotateY, translateZ, glowX, glowY).
 * Card bounding rects are cached and recalculated on window resize.
 *
 * Desktop only — returns empty data when no cursor is available.
 * All transforms are GPU-composited (translateZ, rotate) to avoid layout/paint.
 */

/** Transform values computed for a single card */
export interface CardProximityData {
  /** Tilt around X axis in degrees (based on cursor Y relative to card center) */
  rotateX: number;
  /** Tilt around Y axis in degrees (based on cursor X relative to card center) */
  rotateY: number;
  /** Depth offset — positive for nearest card, negative for adjacent */
  translateZ: number;
  /** Cursor X position relative to the card (0-1), for glow positioning */
  glowX: number;
  /** Cursor Y position relative to the card (0-1), for glow positioning */
  glowY: number;
  /** Whether the cursor is close enough to affect this card */
  isActive: boolean;
}

/** Default (neutral) proximity data — no effect applied */
const DEFAULT_DATA: CardProximityData = {
  rotateX: 0,
  rotateY: 0,
  translateZ: 0,
  glowX: 0.5,
  glowY: 0.5,
  isActive: false,
};

/** Maximum tilt angle in degrees */
const MAX_TILT = 5;
/** Radius within which cards are affected by the cursor */
const EFFECT_RADIUS = 250;
/** Depth lift for the nearest card */
const LIFT_Z = 12;
/** Depth compression for adjacent cards */
const COMPRESS_Z = -3;

interface UseProximityFieldOptions {
  /** Number of cards in the grid */
  cardCount: number;
  /** Whether the effect is disabled (e.g. reduced motion, mobile) */
  disabled?: boolean;
}

interface UseProximityFieldResult {
  /** Ref to attach to the grid container element */
  gridRef: React.RefObject<HTMLDivElement | null>;
  /** Per-card proximity data array, indexed by card position */
  cardData: CardProximityData[];
}

export function useProximityField({
  cardCount,
  disabled = false,
}: UseProximityFieldOptions): UseProximityFieldResult {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [cardData, setCardData] = useState<CardProximityData[]>(() =>
    Array.from({ length: cardCount }, () => ({ ...DEFAULT_DATA }))
  );

  /** Cached bounding rects for all card elements */
  const rectsRef = useRef<DOMRect[]>([]);

  /** Recalculate card bounding rects from the grid's children */
  const updateRects = useCallback(() => {
    if (!gridRef.current) return;
    const cells = gridRef.current.querySelectorAll(".bento-cell");
    rectsRef.current = Array.from(cells).map((el) =>
      el.getBoundingClientRect()
    );
  }, []);

  useEffect(() => {
    if (disabled || !gridRef.current) return;

    /* Initial rect calculation */
    updateRects();

    /** Debounced resize handler */
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateRects, 150);
    };

    window.addEventListener("resize", onResize);

    /** Recalculate rects on scroll — positions shift in viewport coords */
    const onScroll = () => updateRects();
    window.addEventListener("scroll", onScroll, { passive: true });

    /** Mousemove handler on the grid container */
    const onMouseMove = (e: MouseEvent) => {
      /* Refresh rects each move to account for any layout shifts */
      updateRects();
      const rects = rectsRef.current;
      if (rects.length === 0) return;

      const mx = e.clientX;
      const my = e.clientY;

      let nearestIdx = -1;
      let nearestDist = Infinity;

      const newData: CardProximityData[] = rects.map((rect, i) => {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = mx - centerX;
        const dy = my - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }

        if (dist > EFFECT_RADIUS) {
          return { ...DEFAULT_DATA };
        }

        /* Normalized proximity (0 at edge, 1 at center) */
        const t = 1 - dist / EFFECT_RADIUS;

        /* Tilt based on cursor offset from card center */
        const relX = dx / (rect.width / 2);
        const relY = dy / (rect.height / 2);
        const rotateY = relX * MAX_TILT * t;
        const rotateX = -relY * MAX_TILT * t;

        /* Glow position relative to card (0..1) */
        const glowX = Math.max(0, Math.min(1, (mx - rect.left) / rect.width));
        const glowY = Math.max(0, Math.min(1, (my - rect.top) / rect.height));

        return {
          rotateX,
          rotateY,
          translateZ: COMPRESS_Z * t,
          glowX,
          glowY,
          isActive: true,
        };
      });

      /* The nearest card gets the full lift instead of compression */
      if (nearestIdx >= 0 && nearestDist < EFFECT_RADIUS) {
        const t = 1 - nearestDist / EFFECT_RADIUS;
        newData[nearestIdx] = {
          ...newData[nearestIdx],
          translateZ: LIFT_Z * t,
        };
      }

      setCardData(newData);
    };

    /** Mouse leave — reset all cards to neutral */
    const onMouseLeave = () => {
      setCardData(Array.from({ length: cardCount }, () => ({ ...DEFAULT_DATA })));
    };

    const grid = gridRef.current;
    grid.addEventListener("mousemove", onMouseMove);
    grid.addEventListener("mouseleave", onMouseLeave);

    return () => {
      grid.removeEventListener("mousemove", onMouseMove);
      grid.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(resizeTimer);
    };
  }, [disabled, cardCount, updateRects]);

  /* Ensure cardData length stays in sync with cardCount */
  useEffect(() => {
    setCardData((prev) => {
      if (prev.length === cardCount) return prev;
      return Array.from({ length: cardCount }, (_, i) =>
        prev[i] ?? { ...DEFAULT_DATA }
      );
    });
  }, [cardCount]);

  return { gridRef, cardData };
}
