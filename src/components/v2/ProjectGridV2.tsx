"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ProjectCardV2 } from "./ProjectCardV2";
import { FillerCard } from "./FillerCard";
import { Project } from "../ProjectCard";
import { useReducedMotion } from "./useReducedMotion";
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
 * between adjacent highlighted projects to prevent layout collisions.
 */
function buildGridItems(
  projects: Project[],
  onSelect: (p: Project) => void
): React.ReactNode[] {
  const items: React.ReactNode[] = [];
  let prevWasHighlighted = false;

  projects.forEach((project, idx) => {
    const isHighlighted = project.highlight === true;

    /* Insert filler card when two highlighted projects are adjacent */
    if (isHighlighted && prevWasHighlighted) {
      items.push(
        <div
          key={`filler-${project.id}`}
          style={{ gridColumn: "span 1" }}
          className="bento-cell"
        >
          <FillerCard />
        </div>
      );
    }

    const colSpan = isHighlighted ? 2 : 1;

    items.push(
      <div
        key={project.id}
        style={{ gridColumn: `span ${colSpan}` }}
        className="bento-cell"
      >
        <ProjectCardV2
          project={project}
          index={idx}
          size={isHighlighted ? "large" : "default"}
          onClick={() => onSelect(project)}
        />
      </div>
    );

    prevWasHighlighted = isHighlighted;
  });

  return items;
}

export function ProjectGridV2({
  onSelectProject,
}: {
  onSelectProject: (project: Project) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const prefersReduced = useReducedMotion();

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

  const gridItems = buildGridItems(filteredProjects, onSelectProject);

  return (
    <div>
      {/* Category filter tabs — minimal underline-active style */}
      <div
        className="flex flex-wrap gap-6"
        style={{
          marginBottom: "var(--v2-space-2xl)",
          borderBottom: "1px solid var(--v2-border)",
          paddingBottom: "var(--v2-space-sm)",
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
                padding: "var(--v2-space-sm) 0",
                cursor: "pointer",
                transition: "color 0.2s ease, border-color 0.2s ease",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
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

      {/* 3-column highlight-aware bento grid with stagger entrance */}
      <motion.div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--v2-space-lg)",
        }}
        className="bento-grid"
        variants={prefersReduced ? undefined : containerVariants}
        initial={prefersReduced ? undefined : "hidden"}
        animate={prefersReduced ? undefined : "visible"}
        key={activeCategory} /* Re-trigger stagger on category change */
      >
        {gridItems}
      </motion.div>

      {/* Responsive overrides: mobile full-width, tablet 2-col equal */}
      <style>{`
        @media (max-width: 767px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-cell { grid-column: span 1 !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-cell { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  );
}
