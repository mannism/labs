"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";

/**
 * Defines the schema for a project. 
 * Updated to include the 'display' flag for visibility control.
 */
export interface Project {
    id: string;
    title: string;
    shortDescription: string;
    detailedDescription: string;
    category: string;
    status: string;
    display: boolean;
    tags: string[];
    demoUrl: string;
    githubUrl: string;
}

/**
 * Maps project status to specific Tailwind color classes for the status badge.
 */
function statusClass(status: string) {
    if (status === "Active") return "border-green-500/30 text-green-400 bg-green-500/10";
    if (status === "Research") return "border-amber-500/30 text-amber-400 bg-amber-500/10";
    return "border-neutral-500/30 text-neutral-400 bg-neutral-500/10";
}

/**
 * ProjectCard Component
 * Glassmorphic card with 16px backdrop blur, Framer Motion entry animation,
 * and a hover lift effect (y: -6px, scale: 1.01).
 * Click or keyboard-activate (Enter/Space) to open the details drawer.
 */
export function ProjectCard({ project, onClick }: { project: Project; onClick?: () => void }) {
    const isInternalDemo = project.demoUrl?.includes("dianaismail.me");

    return (
        <motion.div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            whileHover={{ y: -6, scale: 1.01 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="project-card group relative flex flex-col overflow-hidden min-h-[260px] p-6"
        >
            {/* Blue gradient overlay — fades in via CSS on .project-card:hover */}
            <div className="card-overlay" />

            {/* Header: badges + action icons */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-category">{project.category}</span>
                    <span className={`px-2.5 py-1 text-sm font-mono rounded-full border ${statusClass(project.status)}`}>
                        {project.status}
                    </span>
                </div>

                <div className="flex gap-1">
                    {project.githubUrl && project.githubUrl !== "#" && (
                        <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-icon-btn"
                        >
                            <Github className="w-4 h-4" />
                        </a>
                    )}
                    {project.demoUrl && project.demoUrl !== "#" && (
                        <a
                            href={project.demoUrl}
                            target={isInternalDemo ? "_self" : "_blank"}
                            rel={isInternalDemo ? undefined : "noopener noreferrer"}
                            className="card-icon-btn demo"
                        >
                            <ArrowUpRight className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* Title — Merriweather display font */}
            <h3 className="font-display text-xl font-bold mb-3 relative z-10 tracking-tight" style={{ color: "var(--text-primary)" }}>
                {project.title}
            </h3>

            {/* Short Description */}
            <p className="text-base mb-6 flex-grow relative z-10 font-normal opacity-90 leading-[1.625]" style={{ color: "var(--text-muted)" }}>
                {project.shortDescription}
            </p>

            {/* View Details Button inside Card */}
            <div className="mb-6 relative z-10">
                <button
                    className="flex items-center gap-1.5 text-sm font-mono transition-colors hover:text-white group/btn"
                    style={{ color: "var(--accent-blue)" }}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevents double firing if clicking button inside card
                        onClick?.();
                    }}
                >
                    View Details
                    <span className="transform transition-transform group-hover/btn:translate-x-1">→</span>
                </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 relative z-10 mt-auto">
                {project.tags.map(tag => (
                    <span key={tag} className="text-sm font-mono tracking-wider font-medium" style={{ color: "#748099" }}>
                        #{tag}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}
