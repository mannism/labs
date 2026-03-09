"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, Github } from "lucide-react";
import { useEffect, useRef } from "react";
import { Project } from "./ProjectCard";

interface ProjectDetailsDrawerProps {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Maps project status to specific Tailwind color classes for the status badge (copied from Card).
 */
function statusClass(status: string) {
    if (status === "Active") return "border-green-500/30 text-green-400 bg-green-500/10";
    if (status === "Research") return "border-amber-500/30 text-amber-400 bg-amber-500/10";
    return "border-neutral-500/30 text-neutral-400 bg-neutral-500/10";
}

/**
 * ProjectDetailsDrawer Component
 * A responsive slide-out drawer (bottom-sheet on mobile, side-panel on desktop).
 * Utilizes Framer Motion for exit/enter animations and glassmorphism styling.
 */
export function ProjectDetailsDrawer({ project, isOpen, onClose }: ProjectDetailsDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

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
                        // Mobile: Slide up from bottom. Desktop: Slide in from right.
                        initial={{ y: "100%", x: 0 }}
                        animate={{ y: 0, x: 0 }}
                        exit={{ y: "100%", x: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="sm:!y-0 sm:!translate-y-0 sm:initial-x-full sm:animate-x-0 sm:exit-x-full w-full sm:w-[500px] md:w-[600px] bg-[#0a0f1c] bg-opacity-95 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-white/10 h-[85vh] sm:h-full rounded-t-3xl sm:rounded-none relative flex flex-col shadow-2xl overflow-hidden z-10"
                        style={{
                            // CSS override for sm/desktop breakpoint since Framer styles apply inline
                            transform: window.innerWidth >= 640 ? "translateX(100%)" : "translateY(100%)"
                        }}
                        onAnimationStart={() => {
                            // Quick hack to fix framer motion inline styles fighting tailwind breakpoints
                            if (drawerRef.current && window.innerWidth >= 640) {
                                drawerRef.current.style.transform = "none";
                            }
                        }}
                    >
                        {/* Mobile Drag Indicator (Visual Only) */}
                        <div className="w-full h-1.5 flex justify-center pt-4 sm:hidden">
                            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        {/* Sticky Header */}
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h2 className="font-display text-2xl font-bold tracking-tight text-white m-0">
                                {project.title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="Close details"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
                            
                            {/* Meta Badges */}
                            <div className="flex items-center gap-2 mb-6 flex-wrap">
                                <span className="px-3 py-1 text-xs font-mono rounded-full bg-white/10 text-neutral-300">
                                    {project.category}
                                </span>
                                <span className={`px-3 py-1 text-xs font-mono rounded-full border ${statusClass(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>

                            {/* Detailed Description */}
                            <div className="prose prose-invert prose-neutral max-w-none">
                                <p className="text-base text-neutral-300 leading-relaxed mb-8">
                                    {project.detailedDescription}
                                </p>
                            </div>

                            {/* Tags Grid */}
                            <div className="mb-8">
                                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Technologies</h4>
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-sm font-mono text-neutral-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer: Action Links */}
                        <div className="p-6 border-t border-white/5 flex gap-4 bg-[#0a0f1c]/80 backdrop-blur-md">
                            {project.demoUrl && project.demoUrl !== "#" && (
                                <a
                                    href={project.demoUrl}
                                    target={isInternalDemo ? "_self" : "_blank"}
                                    rel={isInternalDemo ? undefined : "noopener noreferrer"}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-colors"
                                >
                                    Launch Demo <ArrowUpRight className="w-4 h-4" />
                                </a>
                            )}
                            
                            {project.githubUrl && project.githubUrl !== "#" && (
                                <a
                                    href={project.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors ${!project.demoUrl || project.demoUrl === "#" ? "flex-1" : ""}`}
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
