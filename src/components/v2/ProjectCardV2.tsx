"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Project } from "@/types/project";
import { useReducedMotion } from "./useReducedMotion";
import { renderWithCodeHighlights } from "./renderWithCodeHighlights";
import { CardProximityData } from "./useProximityField";
import projectsData from "@/lib/projects";
import { formatRelativeUpdated } from "@/lib/relativeTime";

/**
 * ProjectCardV2 — Speculative Interface project card with selective motion.
 * Displays a module number (MODULE_001), title in Space Grotesk,
 * truncated description, status label (ACTIVE/ARCHIVED),
 * tech tags as outlined chips (matching Stitch designs), and version/date metadata.
 * Hover: subtle lift + chartreuse left accent via inset box-shadow (no layout shift).
 *
 * Supports a `size` prop for bento layout: "large" cards get dramatically
 * larger typography, more padding, and 3-line descriptions.
 *
 * Motion features (disabled when prefers-reduced-motion is set):
 * - Module number counter: eased count-up from 000 to actual number on scroll-in
 * - Status pulse: slow organic breathing on active dots
 * - Card entrance: stagger-fade with upward drift (controlled by parent variants)
 */
export function ProjectCardV2({
  project,
  stableNumber,
  size = "default",
  onClick,
  proximity,
}: {
  project: Project;
  /** Pre-computed stable number (e.g. "001") — articles by createdDate, modules by id */
  stableNumber: string;
  size?: "large" | "default";
  onClick?: () => void;
  /** Proximity Pulse data from useProximityField — desktop only */
  proximity?: CardProximityData;
}) {
  const moduleNumber = stableNumber;
  const isActive = project.status.toLowerCase() === "active";
  const isLarge = size === "large";
  const isArticle = project.type === "article";
  const prefersReduced = useReducedMotion();

  /**
   * Series label for article cards — derived from projectsData, not stored.
   * Format: SERIES_TITLE // N_OF_T  e.g. AGENTIC_WORKFLOW // 2_OF_4
   * Only populated when the article has both seriesTitle and sequenceNumber.
   */
  const seriesLabel = (() => {
    if (!isArticle || !project.seriesTitle || project.sequenceNumber === undefined) {
      return undefined;
    }
    const all = (projectsData as Project[]).filter((p) => p.display !== false);
    const seriesMembers = all.filter(
      (p) => p.type === "article" && p.seriesTitle === project.seriesTitle
    );
    const total = seriesMembers.length;
    const slug = project.seriesTitle.toUpperCase().replace(/\s+/g, "_");
    return `${slug} // ${project.sequenceNumber}_OF_${total}`;
  })();

  /** Whether proximity field is actively affecting this card */
  const hasProximity = proximity?.isActive && !prefersReduced;

  /**
   * Build the CSS transform string.
   * Proximity tilt takes precedence when active, otherwise standard hover lift applies.
   */
  const proximityTransform = hasProximity
    ? `perspective(800px) rotateX(${proximity.rotateX.toFixed(2)}deg) rotateY(${proximity.rotateY.toFixed(2)}deg) translateZ(${proximity.translateZ.toFixed(1)}px)`
    : undefined;

  /** Enhanced shadow when the card is lifted by proximity */
  const proximityShadow =
    hasProximity && proximity.translateZ > 2
      ? "0 8px 24px rgba(0, 0, 0, 0.12)"
      : undefined;

  /** Handle hover in — inset box-shadow instead of borderLeftWidth to avoid layout shift */
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasProximity) {
      el.style.transform = "translateY(-2px)";
    }
    el.style.boxShadow = "inset 3px 0 0 0 var(--v2-accent), var(--v2-shadow-hover)";
    el.style.borderColor = "var(--v2-border-hover)";
  }, [hasProximity]);

  /** Handle hover out — restore default state */
  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasProximity) {
      el.style.transform = "translateY(0)";
    }
    el.style.boxShadow = "var(--v2-shadow)";
    el.style.borderColor = "var(--v2-border)";
  }, [hasProximity]);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${project.title}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      /* Stagger-fade entrance — parent ProjectGridV2 sets staggerChildren */
      variants={
        prefersReduced
          ? undefined
          : {
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }
      }
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: "var(--v2-bg-surface)",
        border: "1px solid var(--v2-border)",
        borderTop: isArticle ? "2px dashed var(--v2-accent)" : undefined,
        borderRadius: "0.5rem",
        padding: isLarge ? "var(--v2-space-2xl)" : "var(--v2-space-xl)",
        cursor: "pointer",
        transition: "transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), border-color 0.25s ease",
        position: "relative",
        height: "100%",
        boxSizing: "border-box",
        boxShadow: proximityShadow ?? "var(--v2-shadow)",
        display: "flex",
        flexDirection: "column",
        transform: proximityTransform,
        willChange: hasProximity ? "transform" : undefined,
        overflow: "hidden",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Proximity Pulse — directional chartreuse glow overlay */}
      {hasProximity && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            background: `radial-gradient(circle 120px at ${(proximity.glowX * 100).toFixed(0)}% ${(proximity.glowY * 100).toFixed(0)}%, rgba(200, 255, 0, 0.25), transparent)`,
            zIndex: 0,
            transition: "background 0.15s ease",
          }}
        />
      )}

      {/* Module number (animated counter) + status label */}
      <div className="flex items-center justify-between" style={{ marginBottom: isLarge ? "var(--v2-space-lg)" : "var(--v2-space-md)" }}>
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
          }}
        >
          {isArticle ? "ARTICLE" : "MODULE"}_<ModuleCounter target={moduleNumber} disabled={prefersReduced} />
        </span>
        {/* Status label: dot + ACTIVE/ARCHIVED text */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: isActive ? "var(--v2-text-primary)" : "var(--v2-text-tertiary)",
          }}
        >
          {/* WCAG: decorative indicator — status communicated via adjacent text label. aria-hidden applied. */}
          <motion.span
            aria-hidden="true"
            animate={
              isActive && !prefersReduced
                ? { opacity: [1, 0.3, 1] }
                : undefined
            }
            transition={
              isActive && !prefersReduced
                ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isActive ? "var(--v2-accent)" : "var(--v2-text-tertiary)",
              display: "inline-block",
            }}
          />
          {isActive ? "ACTIVE" : "ARCHIVED"}
        </span>
      </div>

      {/* Title — Space Grotesk, dramatically larger for featured cards */}
      <h3
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: isLarge ? "var(--v2-font-size-3xl)" : "var(--v2-font-size-xl)",
          fontWeight: 700,
          color: "var(--v2-text-primary)",
          margin: `0 0 ${isLarge ? "var(--v2-space-lg)" : "var(--v2-space-sm)"} 0`,
          letterSpacing: isLarge ? "var(--v2-letter-spacing-tighter)" : "var(--v2-letter-spacing-tight)",
          lineHeight: 1.1,
          textTransform: "uppercase",
        }}
      >
        {project.title}
      </h3>

      {/* Series label — shown below title for articles in a named arc */}
      {seriesLabel && (
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin: `0 0 ${isLarge ? "var(--v2-space-lg)" : "var(--v2-space-sm)"} 0`,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {seriesLabel}
        </p>
      )}

      {/* Description — full text, no truncation */}
      <p
        style={{
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-sm)",
          color: "var(--v2-text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 var(--v2-space-lg) 0",
          flex: 1,
        }}
      >
        {renderWithCodeHighlights(project.shortDescription)}
      </p>

      {/* Tech tags — all tags shown, outlined chips matching Stitch treatment */}
      <div className="flex flex-wrap gap-1.5" style={{ marginBottom: "var(--v2-space-md)" }}>
        {project.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-tag-color)",
              background: "var(--v2-tag-bg)",
              border: "1px solid var(--v2-tag-border)",
              borderRadius: "4px",
              padding: "3px 10px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/*
       * Metadata footer — version + primary created date.
       * All cards (project and article) show createdDate as the primary date for
       * uniform index semantics. suppressHydrationWarning for nightly sync version drift.
       */}
      <div suppressHydrationWarning>
        {/* Primary line: version // created date */}
        <div
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "0.02em",
          }}
        >
          {[
            project.version && `v${project.version}`,
            (() => {
              /* All card types use createdDate for uniform index date semantics */
              const dateStr = project.createdDate;
              if (!dateStr) return null;
              const d = new Date(dateStr);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              return `${yyyy}.${mm}.${dd}`;
            })(),
          ]
            .filter(Boolean)
            .join(" // ")}
        </div>

        {/*
         * Secondary relative-time line — projects only.
         * Shows "updated 3d ago" to signal active maintenance without breaking
         * primary date semantics. Suppressed for articles (their date IS the update),
         * when lastUpdated === createdDate (no real edit), and past ~6 months
         * (stale "updated 14mo ago" undermines the active signal it's meant to provide).
         */}
        {!isArticle && (() => {
          const rel = formatRelativeUpdated(project.createdDate, project.lastUpdated);
          if (!rel) return null;
          return (
            <div
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "10px",
                color: "var(--v2-text-tertiary)",
                letterSpacing: "0.02em",
                opacity: 0.65,
                marginTop: "2px",
              }}
            >
              {rel}
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}

/**
 * ModuleCounter — animates a 3-digit number counting up from "000" to the target.
 * Uses eased interpolation (cubic ease-out) for smooth, non-jerky counting.
 * Fires once when the element scrolls into view via IntersectionObserver.
 */
function ModuleCounter({ target, disabled }: { target: string; disabled: boolean }) {
  const [display, setDisplay] = useState(disabled ? target : "000");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (disabled || hasAnimated.current || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const targetNum = parseInt(target, 10);
          const duration = 800;
          const startTime = performance.now();

          /** Cubic ease-out for smooth deceleration */
          const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOut(progress);
            const current = Math.round(easedProgress * targetNum);
            setDisplay(String(current).padStart(3, "0"));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, disabled]);

  return <span ref={ref}>{display}</span>;
}
