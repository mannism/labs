"use client";

import { useState } from "react";
import { ProjectCard, Project } from "./ProjectCard";
import { ProjectDetailsDrawer } from "./ProjectDetailsDrawer";
import projectsData from "../data/projects.json";

/**
 * ProjectGrid Component
 * Manages the display of project cards with dynamic category filtering.
 * Toggled categories apply an electric-blue active state to match the design system.
 */
export function ProjectGrid() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const visibleProjects = projectsData.filter(p => p.display !== false);
    const categories = ["All", ...Array.from(new Set(visibleProjects.map(p => p.category)))];
    const filteredProjects = activeCategory === "All"
        ? visibleProjects
        : visibleProjects.filter(p => p.category === activeCategory);

    return (
        <div className="container mx-auto px-4 py-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                    <ProjectCard
                        key={project.id}
                        project={project as Project}
                        onClick={() => setSelectedProject(project as Project)}
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
