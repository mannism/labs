"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";

/** Schema for a single project entry in src/data/projects.json. */
export interface Project {
    id: string;
    /** Controls display order in the grid — lower numbers appear first. */
    order?: number;
    title: string;
    shortDescription: string;
    detailedDescription: string;
    category: string;
    status: string;
    /** Set to false to hide from the grid without deleting the entry. */
    display: boolean;
    tags: string[];
    demoUrl: string;
    githubUrl: string;
}

/**
 * ProjectCard Component
 * Glassmorphic card using CSS vars that swap between dark/light themes.
 * Fades in when scrolled into view (whileInView, fires once).
 * Hover: y: -6px lift + accent-blue border glow.
 * Click or keyboard-activate (Enter/Space) to open the details drawer.
 */
export function ProjectCard({ project, onClick }: { project: Project; onClick?: () => void }) {
    const isInternalDemo = project.demoUrl?.includes("dianaismail.me");

    /**
     * Ping the demo URL to determine live reachability.
     * Uses no-cors so CORS headers don't block the check — an opaque response
     * means the server responded; a network error means it's unreachable.
     */
    const [siteUp, setSiteUp] = useState<boolean | null>(null);
    useEffect(() => {
        if (!project.demoUrl || project.demoUrl === "#") {
            setSiteUp(true);
            return;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        fetch(project.demoUrl, { mode: "no-cors", signal: controller.signal })
            .then(() => setSiteUp(true))
            .catch(() => setSiteUp(false))
            .finally(() => clearTimeout(timer));
        return () => { controller.abort(); clearTimeout(timer); };
    }, [project.demoUrl]);

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
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="project-card group relative flex flex-col overflow-hidden min-h-[260px] p-6 cursor-pointer"
        >
            {/* Blue gradient overlay — fades in via CSS on .project-card:hover */}
            <div className="card-overlay" />

            {/* Header: category badge + action icons */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-category">{project.category}</span>
                </div>

                <div className="flex gap-1">
                    {project.githubUrl && project.githubUrl !== "#" && (
                        <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-icon-btn"
                            onClick={(e) => e.stopPropagation()}
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
                            onClick={(e) => e.stopPropagation()}
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
            <p className="text-base mb-6 flex-grow relative z-10 font-normal leading-[1.625]" style={{ color: "var(--text-muted)" }}>
                {project.shortDescription}
            </p>

            {/* Live status + category bullets */}
            <div className="flex flex-col gap-1.5 mb-5 relative z-10">
                {/* Status bullet — driven by live ping of demoUrl */}
                <span className="flex items-center gap-2 text-xs font-mono">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        siteUp === null  ? "animate-pulse-dot bg-neutral-500" :
                        siteUp          ? "bg-green-400" :
                                          "bg-neutral-500"
                    }`} />
                    <span style={{ color: siteUp === false ? "var(--text-muted)" : "var(--text-primary)" }}>
                        {siteUp === null ? project.status : siteUp ? project.status : "Not active"}
                    </span>
                </span>
                {/* Category bullet */}
                <span className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-primary)" }}>{project.category}</span>
                </span>
            </div>

            {/* View Details — filled pill CTA */}
            <div className="mb-6 relative z-10">
                <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono font-semibold transition-opacity hover:opacity-85 group/btn"
                    style={{ background: "var(--accent-blue)", color: "#fff" }}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevents double firing if clicking button inside card
                        onClick?.();
                    }}
                >
                    View Details
                    <span className="transform transition-transform group-hover/btn:translate-x-1">→</span>
                </button>
            </div>

            {/* Tags — bordered chips */}
            <div className="flex flex-wrap gap-2 relative z-10 mt-auto">
                {project.tags.map(tag => (
                    <span
                        key={tag}
                        className="px-2.5 py-1 text-xs font-mono rounded-md border"
                        style={{ color: "var(--tag-color)", borderColor: "var(--tag-border)", background: "var(--tag-bg)" }}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}
