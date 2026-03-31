"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, Github } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Project } from "./ProjectCard";
import { trackEvent } from "@/lib/analytics";

interface ProjectDetailsDrawerProps {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Maps project status to Tailwind badge classes.
 * Intentionally mirrors the same helper in ProjectCard to keep components self-contained.
 * Uses both light and dark: variants so the drawer respects the active theme.
 */
function statusClass(status: string) {
    if (status === "Active")   return "border-green-400/60  text-green-700  bg-green-500/10  dark:border-green-500/30  dark:text-green-400";
    if (status === "Research") return "border-amber-400/60  text-amber-700  bg-amber-500/10  dark:border-amber-500/30  dark:text-amber-400";
    return                            "border-neutral-400/60 text-neutral-600 bg-neutral-500/10 dark:border-neutral-500/30 dark:text-neutral-400";
}

/**
 * Splits a string on backtick-delimited spans and renders inline <code> chips
 * for each matched segment. Safe for static content — no dangerouslySetInnerHTML.
 */
function renderWithCode(text: string) {
    return text.split(/`([^`]+)`/).map((part, i) =>
        i % 2 === 1
            ? <code key={i} className="font-mono text-xs px-1.5 py-0.5 rounded border" style={{ background: "var(--tag-bg)", borderColor: "var(--tag-border)", color: "var(--accent-blue)" }}>{part}</code>
            : part
    );
}

/**
 * ProjectDetailsDrawer Component
 * A responsive slide-out drawer (bottom-sheet on mobile, side-panel on desktop).
 * Utilizes Framer Motion for exit/enter animations and glassmorphism styling.
 *
 * Interior layout (Maya UX audit, 2026-03-29):
 *   1. Detailed description — primary content, immediately after title
 *   2. Meta badges (category + status) — confirmatory metadata below description
 *   3. Version + date — single monospaced muted line, merged metadata
 *   4. Key Learnings — qualitative insight block
 *   5. Technologies — tag chips
 *   Sticky footer — only rendered when at least one action link is present
 *
 * Fix 6: Body scroll lock compensates for scrollbar width to prevent layout shift.
 */
export function ProjectDetailsDrawer({ project, isOpen, onClose }: ProjectDetailsDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Track viewport width client-side to drive the correct slide animation axis.
    // Defaults to false (mobile) so SSR never touches window.
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 640px)");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing initial state from matchMedia on mount
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    // Fix 6: Lock body scroll with scrollbar-width compensation to prevent layout shift.
    useEffect(() => {
        if (isOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.paddingRight = `${scrollbarWidth}px`;
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
            document.body.style.paddingRight = "0px";
        }
        return () => {
            document.body.style.overflow = "unset";
            document.body.style.paddingRight = "0px";
        };
    }, [isOpen]);

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Handle clicks outside the drawer content to close
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    if (!project) return null;

    const isInternalDemo = project.demoUrl?.includes("dianaismail.me");

    // Fix 4: Only render the footer when at least one real action link exists.
    const hasDemo = Boolean(project.demoUrl && project.demoUrl !== "#");
    const hasGithub = Boolean(project.githubUrl && project.githubUrl !== "#");
    const hasFooter = hasDemo || hasGithub;

    /** Slide axis swaps between mobile (y) and desktop (x) based on hydrated isDesktop. */
    const drawerVariants = {
        hidden: isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 },
        visible: { x: 0, y: 0 },
        exit:   isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end">

                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                        onClick={handleBackdropClick}
                        aria-hidden="true"
                    />

                    {/* Drawer Content Area */}
                    <motion.div
                        ref={drawerRef}
                        variants={drawerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="w-full sm:w-[500px] md:w-[600px] backdrop-blur-2xl border-t sm:border-t-0 sm:border-l h-[85vh] sm:h-full rounded-t-3xl sm:rounded-none relative flex flex-col shadow-2xl overflow-hidden z-10"
                        style={{ background: "var(--bg-glass)", borderColor: "var(--border-subtle)" }}
                    >
                        {/* Fix 2: Drag handle removed — gesture was not implemented and the visual-only
                            indicator created a false affordance. Framer Motion spring animation on the
                            drawer itself provides sufficient motion context on mobile. */}

                        {/* Sticky Header */}
                        <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                            <h2 className="font-display text-2xl font-bold tracking-tight m-0" style={{ color: "var(--text-primary)" }}>
                                {project.title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 card-icon-btn"
                                aria-label="Close details"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">

                            {/* Fix 1: Detailed description moves to top — primary content reads first. */}
                            <div className="prose prose-neutral max-w-none">
                                <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text-primary)" }}>
                                    {project.detailedDescription}
                                </p>
                            </div>

                            {/* Fix 1: Meta badges row (category + status) — moved below description.
                                Fix 3: Version badge removed from this row; merged into the metadata line below. */}
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <span className="badge-category">
                                    {project.category}
                                </span>
                                <span className={`px-3 py-1 text-xs font-mono rounded-full border ${statusClass(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>

                            {/* Fix 3: Version and date unified into a single monospaced muted line. */}
                            {(project.version || project.lastUpdated) && (
                                <p className="text-xs font-mono -mt-1 mb-6" style={{ color: "var(--text-muted)" }}>
                                    {[
                                        project.version && `v${project.version}`,
                                        project.lastUpdated && `Updated ${new Date(project.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                                    ].filter(Boolean).join(" · ")}
                                </p>
                            )}

                            {/* Fix 5: Key Learnings heading uses accent-blue to match the left-border callout
                                and distinguish it from the Technologies section heading (which stays as-is). */}
                            {project.keyLearnings && (
                                <div
                                    className="mb-8 rounded-lg p-4"
                                    style={{ background: "rgba(0, 105, 255, 0.06)", borderLeft: "3px solid var(--accent-blue)" }}
                                >
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent-blue)" }}>Key Learnings</h4>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                        {renderWithCode(project.keyLearnings)}
                                    </p>
                                </div>
                            )}

                            {/* Tags Grid */}
                            <div className="mb-8">
                                <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Technologies</h4>
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 rounded text-sm font-mono border" style={{ background: "var(--tag-bg)", borderColor: "var(--tag-border)", color: "var(--tag-color)" }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Fix 3: Standalone "Updated" line removed — date is now in the unified metadata line above. */}

                        </div>

                        {/* Fix 4: Sticky footer only renders when at least one action link is present. */}
                        {hasFooter && (
                            <div className="p-6 border-t flex gap-4 backdrop-blur-md" style={{ background: "var(--bg-glass)", borderColor: "var(--border-subtle)" }}>
                                {hasDemo && (
                                    <a
                                        href={project.demoUrl}
                                        target={isInternalDemo ? "_self" : "_blank"}
                                        rel={isInternalDemo ? undefined : "noopener noreferrer"}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold drawer-btn-primary"
                                        onClick={() => trackEvent("demo_launch", { project_title: project.title, demo_url: project.demoUrl })}
                                    >
                                        Launch Demo <ArrowUpRight className="w-4 h-4" />
                                    </a>
                                )}

                                {hasGithub && (
                                    <a
                                        href={project.githubUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl drawer-btn-secondary ${!hasDemo ? "flex-1" : ""}`}
                                    >
                                        <Github className="w-5 h-5" /> Source
                                    </a>
                                )}
                            </div>
                        )}

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
