"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, Github } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Project } from "./ProjectCard";

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

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
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
                        {/* Mobile Drag Indicator (Visual Only) */}
                        <div className="w-full h-1.5 flex justify-center pt-4 sm:hidden">
                            <div className="w-12 h-1.5 rounded-full dark:bg-white/20 bg-black/20" />
                        </div>

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
                            
                            {/* Meta Badges */}
                            <div className="flex items-center gap-2 mb-6 flex-wrap">
                                <span className="badge-category">
                                    {project.category}
                                </span>
                                <span className={`px-3 py-1 text-xs font-mono rounded-full border ${statusClass(project.status)}`}>
                                    {project.status}
                                </span>
                                {project.version && (
                                    <span className="px-3 py-1 text-xs font-mono rounded-full border" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)", background: "var(--tag-bg)" }}>
                                        v{project.version}
                                    </span>
                                )}
                            </div>

                            {/* Detailed Description */}
                            <div className="prose prose-neutral max-w-none">
                                <p className="text-base leading-relaxed mb-8" style={{ color: "var(--text-primary)" }}>
                                    {project.detailedDescription}
                                </p>
                            </div>

                            {/* Key Learnings — only rendered when field is present */}
                            {project.keyLearnings && (
                                <div
                                    className="mb-8 rounded-lg p-4"
                                    style={{ background: "rgba(0, 105, 255, 0.06)", borderLeft: "3px solid var(--accent-blue)" }}
                                >
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Key Learnings</h4>
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

                            {project.lastUpdated && (
                                <p className="text-xs font-mono mt-2" style={{ color: "var(--text-muted)" }}>
                                    Updated {new Date(project.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                            )}
                        </div>

                        {/* Sticky Footer: Action Links */}
                        <div className="p-6 border-t flex gap-4 backdrop-blur-md" style={{ background: "var(--bg-glass)", borderColor: "var(--border-subtle)" }}>
                            {project.demoUrl && project.demoUrl !== "#" && (
                                <a
                                    href={project.demoUrl}
                                    target={isInternalDemo ? "_self" : "_blank"}
                                    rel={isInternalDemo ? undefined : "noopener noreferrer"}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold drawer-btn-primary"
                                >
                                    Launch Demo <ArrowUpRight className="w-4 h-4" />
                                </a>
                            )}
                            
                            {project.githubUrl && project.githubUrl !== "#" && (
                                <a
                                    href={project.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl drawer-btn-secondary ${!project.demoUrl || project.demoUrl === "#" ? "flex-1" : ""}`}
                                >
                                    <Github className="w-5 h-5" /> Source
                                </a>
                            )}
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
