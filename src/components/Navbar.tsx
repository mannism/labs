"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

/**
 * Navbar Component
 * Sticky top navigation with the Labs logo and a dark/light mode toggle.
 * Reads theme from localStorage on mount and persists changes back to it.
 * Sets html.dark / html.light class, which drives all CSS variable overrides.
 */
export function Navbar() {
    const [isDark, setIsDark] = useState(true);

    // Sync toggle state with whatever the theme-init script already applied.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading external DOM state on mount
        setIsDark(document.documentElement.classList.contains("dark") ||
            document.documentElement.className === "dark");
    }, []);

    const toggle = () => {
        const next = isDark ? "light" : "dark";
        document.documentElement.className = next;
        localStorage.setItem("theme", next);
        setIsDark(!isDark);
    };

    return (
        <nav className="navbar w-full">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

                {/* Logo + Portfolio link */}
                <div className="flex items-center gap-3">
                    <span
                        className="font-mono text-base font-semibold tracking-widest uppercase"
                        style={{ color: "var(--text-primary)" }}
                    >
                        Labs by Diana
                    </span>
                    <span style={{ color: "var(--border-subtle)", fontSize: "1.1rem" }}>|</span>
                    <a
                        href="https://dianaismail.me"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-base font-semibold tracking-widest uppercase"
                        style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s ease" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                        Portfolio
                    </a>
                </div>

                {/* Theme toggle */}
                <motion.button
                    onClick={toggle}
                    whileTap={{ scale: 0.94 }}
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-colors"
                    style={{
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--tab-bg)",
                    }}
                >
                    {isDark
                        ? <><Sun className="w-3.5 h-3.5" /> Light</>
                        : <><Moon className="w-3.5 h-3.5" /> Dark</>
                    }
                </motion.button>
            </div>
        </nav>
    );
}
