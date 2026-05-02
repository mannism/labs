"use client";

import { useState, useEffect } from "react";
import * as m from "framer-motion/m";
import { ArrowUpRight } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { trackEvent } from "@/lib/analytics";

/* Re-export Project type from canonical location for backward compatibility */
import type { Project } from "@/types/project";
export type { Project } from "@/types/project";

/**
 * Badge classes for the active/up state (green).
 * Used when the site is reachable or no demoUrl is present.
 */
const STATUS_UP   = "border-green-400/60 text-green-700 bg-green-500/10 dark:border-green-500/30 dark:text-green-400";
/** Badge classes for the down/muted state (neutral). */
const STATUS_DOWN = "border-neutral-400/60 text-neutral-500 bg-neutral-500/10 dark:border-neutral-500/30 dark:text-neutral-400";

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
     * Ping demoUrl on mount to check live reachability.
     * no-cors avoids CORS preflight — an opaque response means the server answered;
     * a network error (or timeout) means it's unreachable.
     * null = still checking, true = up, false = down.
     */
    const [siteUp, setSiteUp] = useState<boolean | null>(null);
    useEffect(() => {
        if (!project.demoUrl || project.demoUrl === "#") {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- early exit before async fetch
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

    const badgeClass  = siteUp === false ? STATUS_DOWN : STATUS_UP;
    const badgeLabel  = siteUp === false ? "Not Active" : project.status;

    return (
        <m.div
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
            suppressHydrationWarning
        >
            {/* Blue gradient overlay — fades in via CSS on .project-card:hover */}
            <div className="card-overlay" />

            {/* Header: badges + action icons */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-category">{project.category}</span>
                    <span className={`px-2.5 py-1 text-sm font-mono rounded-full border transition-colors duration-300 ${badgeClass}`}>
                        {badgeLabel}
                    </span>
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
                            <GithubIcon className="w-4 h-4" />
                        </a>
                    )}
                    {project.demoUrl && project.demoUrl !== "#" && (
                        <a
                            href={project.demoUrl}
                            target={isInternalDemo ? "_self" : "_blank"}
                            rel={isInternalDemo ? undefined : "noopener noreferrer"}
                            className="card-icon-btn demo"
                            onClick={(e) => {
                                e.stopPropagation();
                                trackEvent("demo_launch", { project_title: project.title, demo_url: project.demoUrl });
                            }}
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

            {/* Short Description — inline arrow signals clickability without a separate CTA element */}
            <p className="text-base mb-6 flex-grow relative z-10 font-normal leading-[1.625]" style={{ color: "var(--text-muted)" }}>
                {project.shortDescription}{" "}
                <span className="font-mono transition-opacity group-hover:opacity-60" style={{ color: "var(--accent-blue)" }}>→</span>
            </p>

            {/* Tags — bordered chips */}
            <div className="flex flex-wrap gap-2 relative z-10">
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
        </m.div>
    );
}
