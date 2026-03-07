"use client";

import { useState } from "react";
import { ProjectCard, Project } from "./ProjectCard";
import projectsData from "../data/projects.json";

/**
 * The main container component for the Labs project display.
 * Manages the category active state, dynamically builds category tabs from the JSON data,
 * and renders a responsive grid of `ProjectCard` components.
 */
export function ProjectGrid() {
    // State to track the currently selected category filter tab
    const [activeCategory, setActiveCategory] = useState("All");

    // Retrieve only projects explicitly flagged for display
    const visibleProjects = projectsData.filter(p => p.display !== false);

    // Dynamically generate a sorted array of unique categories from the visible data
    const categories = ["All", ...Array.from(new Set(visibleProjects.map(p => p.category)))];

    // Filter projects passed down to the cards based on selected category tab
    const filteredProjects = activeCategory === "All"
        ? visibleProjects
        : visibleProjects.filter(p => p.category === activeCategory);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Filtering Navigation / Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 rounded-full text-sm font-mono transition-colors ${activeCategory === category
                            ? "bg-white text-black font-semibold"
                            : "bg-transparent text-neutral-400 hover:text-white hover:bg-white/10"
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Responsive Grid that gracefully scales (1 col mobile, 2 col tablet, 3 col desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project as Project} />
                ))}
            </div>
        </div>
    );
}
