"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ProjectCard, Project } from "./ProjectCard";
import { ProjectDetailsDrawer } from "./ProjectDetailsDrawer";
import { trackEvent } from "@/lib/analytics";
import projectsData from "../data/projects.json";

/**
 * ProjectGrid Component
 * Manages the display of project cards with dynamic category filtering.
 * Toggled categories apply an electric-blue active state to match the design system.
 */
export function ProjectGrid() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Sort by order field (ascending) before filtering so manual ordering is respected
    const visibleProjects = projectsData
        .filter(p => p.display !== false)
        .sort((a, b) => ((a as { order?: number }).order ?? 999) - ((b as { order?: number }).order ?? 999));
    const categories = ["All", ...Array.from(new Set(visibleProjects.map(p => p.category)))];
    const filteredProjects = activeCategory === "All"
        ? visibleProjects
        : visibleProjects.filter(p => p.category === activeCategory);

    return (
        <div className="container mx-auto px-4 py-16">
            {/* Section heading */}
            <motion.div
                className="mb-10 text-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
            >
                <h2
                    className="font-display text-3xl md:text-4xl font-bold mb-3"
                    style={{ color: "var(--text-primary)" }}
                >
                    Projects
                </h2>
                <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                    {filteredProjects.length} experiment{filteredProjects.length !== 1 ? "s" : ""}
                </p>
            </motion.div>

            {/* Category filter tabs — CSS-driven so transitions actually animate */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`filter-tab${activeCategory === category ? " active" : ""}`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Responsive card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {filteredProjects.map((project) => (
                    <ProjectCard
                        key={project.id}
                        project={project as Project}
                        onClick={() => {
                            trackEvent("card_click", { project_title: project.title, project_category: project.category });
                            setSelectedProject(project as Project);
                        }}
                    />
                ))}
            </div>

            {/* Slide-out details drawer */}
            <ProjectDetailsDrawer
                project={selectedProject}
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
            />
        </div>
    );
}
