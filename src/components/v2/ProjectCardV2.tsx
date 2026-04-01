"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Project } from "../ProjectCard";
import { useReducedMotion } from "./useReducedMotion";

/**
 * ProjectCardV2 — Speculative Interface project card with selective motion.
 * Displays a module number (MODULE_001), title in Space Grotesk,
 * truncated description, status label (ACTIVE/ARCHIVED),
 * tech tags as dark filled chips, and version/date metadata.
 * Hover: subtle lift + chartreuse left accent border.
 *
 * Supports a `size` prop for bento layout: "large" cards get bigger
 * typography, more padding, and 3-line descriptions.
 *
 * Motion features (disabled when prefers-reduced-motion is set):
 * - Module number counter: counts up from 000 to actual number on scroll-in
 * - Status pulse: slow chartreuse brightness oscillation on active dots
 * - Card entrance: stagger-fade with upward drift (controlled by parent variants)
 */
export function ProjectCardV2({
  project,
  index,
  size = "default",
  onClick,
}: {
  project: Project;
  index: number;
  size?: "large" | "default";
  onClick?: () => void;
}) {
  const moduleNumber = String(index + 1).padStart(3, "0");
  const isActive = project.status.toLowerCase() === "active";
  const isLarge = size === "large";
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      role="button"
      tabIndex={0}
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
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }
      }
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        background: "var(--v2-bg-surface)",
        border: "1px solid var(--v2-border)",
        borderRadius: "0.5rem",
        padding: isLarge ? "var(--v2-space-xl)" : "var(--v2-space-lg)",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        position: "relative",
        height: "100%",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "var(--v2-shadow-hover)";
        el.style.borderLeftColor = "var(--v2-accent)";
        el.style.borderLeftWidth = "3px";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
        el.style.borderLeftColor = "var(--v2-border)";
        el.style.borderLeftWidth = "1px";
      }}
    >
      {/* Module number (animated counter) + status label */}
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--v2-space-sm)" }}>
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
          }}
        >
          MODULE_<ModuleCounter target={moduleNumber} disabled={prefersReduced} />
        </span>
        {/* Status label: dot/square + ACTIVE/ARCHIVED text */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: isActive ? "var(--v2-accent)" : "var(--v2-text-tertiary)",
          }}
        >
          <motion.span
            animate={
              isActive && !prefersReduced
                ? { opacity: [1, 0.5, 1] }
                : undefined
            }
            transition={
              isActive && !prefersReduced
                ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            style={{
              fontSize: "10px",
              lineHeight: 1,
            }}
          >
            {isActive ? "●" : "■"}
          </motion.span>
          {isActive ? "ACTIVE" : "ARCHIVED"}
        </span>
      </div>

      {/* Title — Space Grotesk, larger for featured cards */}
      <h3
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: isLarge ? "var(--v2-font-size-2xl)" : "var(--v2-font-size-lg)",
          fontWeight: isLarge ? 700 : 600,
          color: "var(--v2-text-primary)",
          margin: `0 0 ${isLarge ? "var(--v2-space-md)" : "var(--v2-space-sm)"} 0`,
          letterSpacing: "var(--v2-letter-spacing-tight)",
        }}
      >
        {project.title}
      </h3>

      {/* Description — truncated to 3 lines for large, 2 for default */}
      <p
        style={{
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-sm)",
          color: "var(--v2-text-secondary)",
          lineHeight: 1.6,
          margin: "0 0 var(--v2-space-md) 0",
          display: "-webkit-box",
          WebkitLineClamp: isLarge ? 3 : 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {project.shortDescription}
      </p>

      {/* Tech tags — dark filled chips */}
      <div className="flex flex-wrap gap-1.5" style={{ marginBottom: "var(--v2-space-md)" }}>
        {project.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-bg-primary)",
              background: "var(--v2-text-primary)",
              borderRadius: "4px",
              padding: "3px 10px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {tag}
          </span>
        ))}
        {project.tags.length > 4 && (
          <span
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
            }}
          >
            +{project.tags.length - 4}
          </span>
        )}
      </div>

      {/* Version + date metadata line */}
      <div
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
        }}
      >
        {[
          project.version && `v${project.version}`,
          project.lastUpdated &&
            new Date(project.lastUpdated).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
        ]
          .filter(Boolean)
          .join(" // ")}
      </div>
    </motion.div>
  );
}

/**
 * ModuleCounter — animates a 3-digit number counting up from "000" to the target.
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
          const duration = 600; // ms
          const steps = 20;
          const interval = duration / steps;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            const current = Math.round((step / steps) * targetNum);
            setDisplay(String(current).padStart(3, "0"));
            if (step >= steps) clearInterval(timer);
          }, interval);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, disabled]);

  return <span ref={ref}>{display}</span>;
}
