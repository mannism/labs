"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ProjectCardV2 } from "./ProjectCardV2";
import { FillerCard } from "./FillerCard";
import { Project } from "@/types/project";
import { useReducedMotion } from "./useReducedMotion";
import { useProximityField, CardProximityData } from "./useProximityField";
import projectsData from "../../data/projects.json";

/**
 * ProjectGridV2 — Speculative Interface project grid with stagger entrance.
 * Maps project data to ProjectCardV2 components with category filtering.
 * Category tabs use an underline-active style with monospace labels.
 * 3-column desktop grid with highlight support: highlighted projects span 2 cols.
 * Filler cards are inserted between adjacent highlighted projects.
 * Cards animate in with a stagger-fade simulating a system boot sequence.
 */

/** Parent stagger container — sequential boot-up timing */
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/**
 * buildGridItems — produces an array of grid items with filler cards inserted
 * to fill gaps in the 3-column grid. Tracks column position to ensure:
 * - Highlighted (span-2) cards always fit without leaving gaps
 * - Incomplete rows before a highlight get padded with filler cards
 * - Adjacent highlights get separated by a filler card
 *
 * Accepts per-cell proximity data for the Proximity Pulse magnetic field effect.
 * Returns both the rendered items and the total cell count (for hook sizing).
 */
function buildGridItems(
  projects: Project[],
  onSelect: (p: Project) => void,
  proximityData: CardProximityData[]
): { items: React.ReactNode[]; cellCount: number } {
  const items: React.ReactNode[] = [];
  const COLS = 3;
  let col = 0; // current column position (0-indexed)
  let fillerCount = 0;
  let cellIndex = 0;

  projects.forEach((project, idx) => {
    const isHighlighted = project.highlight === true;
    const span = isHighlighted ? 2 : 1;

    /* If this card won't fit in the remaining columns, pad with fillers */
    if (col + span > COLS) {
      while (col < COLS) {
        items.push(
          <div
            key={`filler-pad-${fillerCount++}`}
            style={{ gridColumn: "span 1" }}
            className="bento-cell"
          >
            <FillerCard />
          </div>
        );
        cellIndex++;
        col++;
      }
      col = 0;
    }

    const prox = proximityData[cellIndex] ?? undefined;

    items.push(
      <div
        key={project.id}
        style={{ gridColumn: `span ${span}` }}
        className="bento-cell"
      >
        <ProjectCardV2
          project={project}
          index={idx}
          size={isHighlighted ? "large" : "default"}
          onClick={() => onSelect(project)}
          proximity={prox}
        />
      </div>
    );

    cellIndex++;
    col += span;
    if (col >= COLS) col = 0;
  });

  /* Pad the final row if incomplete */
  if (col > 0) {
    while (col < COLS) {
      items.push(
        <div
          key={`filler-end-${fillerCount++}`}
          style={{ gridColumn: "span 1" }}
          className="bento-cell"
        >
          <FillerCard />
        </div>
      );
      cellIndex++;
      col++;
    }
  }

  return { items, cellCount: cellIndex };
}

export function ProjectGridV2({
  onSelectProject,
}: {
  onSelectProject: (project: Project) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  /** Detect mobile — disable proximity field on small viewports */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Sort by order field (ascending), filter hidden projects */
  const visibleProjects = useMemo(
    () =>
      (projectsData as Project[])
        .filter((p) => p.display !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    []
  );

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(visibleProjects.map((p) => p.category)))],
    [visibleProjects]
  );

  const filteredProjects =
    activeCategory === "All"
      ? visibleProjects
      : visibleProjects.filter((p) => p.category === activeCategory);

  /** Estimate cell count for the proximity hook (projects + potential fillers) */
  const estimatedCellCount = useMemo(() => {
    let count = 0;
    let col = 0;
    const COLS = 3;
    filteredProjects.forEach((p) => {
      const span = p.highlight ? 2 : 1;
      if (col + span > COLS) {
        count += COLS - col;
        col = 0;
      }
      count++;
      col += span;
      if (col >= COLS) col = 0;
    });
    if (col > 0) count += COLS - col;
    return count;
  }, [filteredProjects]);

  /** Proximity Pulse hook — disabled on mobile and reduced motion */
  const { gridRef, cardData } = useProximityField({
    cardCount: estimatedCellCount,
    disabled: isMobile || prefersReduced,
  });

  const { items: gridItems } = buildGridItems(
    filteredProjects,
    onSelectProject,
    cardData
  );

  return (
    <div>
      {/* Category filter tabs — horizontally scrollable on mobile, wrapping on desktop */}
      <div
        className="flex gap-4 md:gap-6 md:flex-wrap overflow-x-auto"
        style={{
          marginBottom: "var(--v2-space-2xl)",
          borderBottom: "1px solid var(--v2-border)",
          paddingBottom: "var(--v2-space-sm)",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {categories.map((category) => {
          const isTabActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: isTabActive ? "var(--v2-text-primary)" : "var(--v2-text-tertiary)",
                background: "none",
                border: "none",
                borderBottom: isTabActive ? "2px solid var(--v2-text-primary)" : "2px solid transparent",
                padding: "var(--v2-space-md) 0",
                cursor: "pointer",
                transition: "color 0.2s ease, border-color 0.2s ease",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isTabActive) e.currentTarget.style.color = "var(--v2-text-secondary)";
              }}
              onMouseLeave={(e) => {
                if (!isTabActive) e.currentTarget.style.color = "var(--v2-text-tertiary)";
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Project count */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
          marginBottom: "var(--v2-space-lg)",
          letterSpacing: "0.04em",
        }}
      >
        {filteredProjects.length} module{filteredProjects.length !== 1 ? "s" : ""} loaded
      </p>

      {/* 3-column highlight-aware bento grid with stagger entrance + proximity field */}
      <motion.div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--v2-space-lg)",
          perspective: "800px",
          marginBottom: "var(--v2-space-3xl)",
        }}
        className="bento-grid"
        variants={prefersReduced ? undefined : containerVariants}
        initial={prefersReduced ? false : "hidden"}
        whileInView={prefersReduced ? undefined : "visible"}
        viewport={{ once: true, amount: 0.05 }}
        key={activeCategory} /* Re-trigger stagger on category change */
      >
        {gridItems}
      </motion.div>

      {/* Responsive overrides + scrollbar hiding moved to globals.css */}
    </div>
  );
}
