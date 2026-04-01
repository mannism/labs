"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ProjectCardV2 } from "./ProjectCardV2";
import { Project } from "../ProjectCard";
import { useReducedMotion } from "./useReducedMotion";
import projectsData from "../../data/projects.json";

/**
 * ProjectGridV2 — Speculative Interface project grid with stagger entrance.
 * Maps project data to ProjectCardV2 components with category filtering.
 * Category tabs use an underline-active style rather than v1's pill/glow.
 * Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop.
 * Cards animate in with a stagger-fade on first page load.
 */

/** Parent stagger container variants for card entrance */
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

export function ProjectGridV2({
  onSelectProject,
}: {
  onSelectProject: (project: Project) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const prefersReduced = useReducedMotion();

  /* Sort by order field, filter hidden projects — same logic as v1 ProjectGrid */
  const visibleProjects = (projectsData as Project[])
    .filter((p) => p.display !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const categories = ["All", ...Array.from(new Set(visibleProjects.map((p) => p.category)))];

  const filteredProjects =
    activeCategory === "All"
      ? visibleProjects
      : visibleProjects.filter((p) => p.category === activeCategory);

  return (
    <div>
      {/* Category filter tabs — minimal underline-active style */}
      <div
        className="flex flex-wrap gap-4"
        style={{
          marginBottom: "var(--v2-space-2xl)",
          borderBottom: "1px solid var(--v2-border)",
          paddingBottom: "var(--v2-space-sm)",
        }}
      >
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: isActive ? "var(--v2-text-primary)" : "var(--v2-text-tertiary)",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid var(--v2-text-primary)" : "2px solid transparent",
                padding: "var(--v2-space-xs) 0",
                cursor: "pointer",
                transition: "color 0.2s ease, border-color 0.2s ease",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
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
        }}
      >
        {filteredProjects.length} module{filteredProjects.length !== 1 ? "s" : ""} loaded
      </p>

      {/* Responsive card grid with stagger entrance */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={prefersReduced ? undefined : containerVariants}
        initial={prefersReduced ? undefined : "hidden"}
        animate={prefersReduced ? undefined : "visible"}
        key={activeCategory} /* Re-trigger stagger on category change */
      >
        {filteredProjects.map((project, idx) => (
          <ProjectCardV2
            key={project.id}
            project={project}
            index={idx}
            onClick={() => onSelectProject(project)}
          />
        ))}
      </motion.div>
    </div>
  );
}
