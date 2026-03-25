"use client";

import { motion } from "framer-motion";

/**
 * Hero Component
 * Sets the tone for the application with a "Cyber-Minimalist" aesthetic.
 * Incorporates brand-specific typography (Merriweather display, Open Sans body)
 * and the glowing status badge modeled after the twin site's digital agent interface.
 * Staggered Framer Motion entry animations fade each element in sequentially.
 */
export function Hero() {
    return (
        <section className="py-12 md:py-20 flex flex-col items-center justify-center text-center px-4">

            {/* Status badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono mb-8"
                style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                    letterSpacing: "0.12em",
                }}
            >
                <span
                    className="w-2 h-2 rounded-full animate-pulse-dot"
                    style={{ background: "#22C55E" }}
                />
                {"// Labs by Diana"}
            </motion.div>

            {/* Main Headline — Merriweather display font */}
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
                className="font-display text-4xl md:text-6xl font-bold max-w-3xl leading-tight"
                style={{ color: "var(--text-primary)" }}
            >
                Labs by Diana —{" "}
                <span style={{ color: "var(--accent-blue)" }}>
                    Experiments that ship.
                </span>
            </motion.h1>

        </section>
    );
}
