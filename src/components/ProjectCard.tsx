"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";

/**
 * Defines the strict schema for a project entry as parsed from data/projects.json.
 */
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

/**
 * Individual Project Card component utilizing Framer Motion for entrance and hover animations.
 * Features a glassmorphism (backdrop-blur) aesthetic with dynamic status badges.
 * 
 * @param {Object} props - Component props
 * @param {Project} props.project - The project data object to display
 */
export function ProjectCard({ project }: { project: Project }) {
    return (
        <motion.div
            /* Entrance and hover animation configurations */
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative flex flex-col p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 hover:border-[#213169] transition-all duration-300 overflow-hidden min-h-[250px] shadow-[0_4px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_0_30px_rgba(33,49,105,0.4)]"
        >
            {/* Dynamic Glassmorphism gradient overlay visible on hover */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#213169]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Header: Displays Category Badge and Status Badge */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-mono rounded-full bg-white/10 text-neutral-300">
                        {project.category}
                    </span>
                    {/* Status badge changes color dynamically based on Active/Research/Archive states */}
                    <span className={`px-2.5 py-1 text-xs font-mono rounded-full border ${project.status === 'Active' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                        project.status === 'Research' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                            'border-neutral-500/30 text-neutral-400 bg-neutral-500/10'
                        }`}>
                        {project.status}
                    </span>
                </div>

                {/* Action Links: Renders GitHub and Demo icons only if valid URLs exist */}
                <div className="flex gap-2">
                    {project.githubUrl && project.githubUrl !== "#" && (
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/10 transition-colors text-neutral-400 hover:text-white">
                            <Github className="w-4 h-4" />
                        </a>
                    )}
                    {project.demoUrl && project.demoUrl !== "#" && (
                        <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/10 transition-colors text-neutral-400 hover:text-white">
                            <ArrowUpRight className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-xl font-bold text-white mb-2 relative z-10">{project.title}</h3>
            <p className="text-neutral-400 text-sm mb-6 flex-grow relative z-10">{project.description}</p>

            {/* Tags Grid: Renders standard hashtag badges at the bottom of the card */}
            <div className="flex flex-wrap gap-2 relative z-10 mt-auto">
                {project.tags.map(tag => (
                    <span key={tag} className="text-xs font-mono text-neutral-500 flex items-center before:content-['#'] before:mr-0.5">
                        {tag}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}
