"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";

export interface Project {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    display: boolean;
    tags: string[];
    demoUrl: string;
    githubUrl: string;
}

function statusClass(status: string) {
    if (status === "Active") return "border-green-500/30 text-green-400 bg-green-500/10";
    if (status === "Research") return "border-amber-500/30 text-amber-400 bg-amber-500/10";
    return "border-neutral-500/30 text-neutral-400 bg-neutral-500/10";
}

export function ProjectCard({ project }: { project: Project }) {
    return (
        <motion.div
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
                            target="_self"
                            rel="noopener noreferrer"
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

            {/* Description */}
            <p className="text-base mb-6 flex-grow relative z-10 font-normal opacity-90 leading-[1.625]" style={{ color: "var(--text-muted)" }}>
                {project.description}
            </p>

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
