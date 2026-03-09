"use client";

import { ArrowUpRight } from "lucide-react";

/**
 * Footer Component
 * Displays copyright information and a link to the main portfolio site.
 */
export function Footer() {
    return (
        <footer className="py-10 mt-20" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div
                className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm font-mono gap-4"
                style={{ color: "var(--text-muted)" }}
            >
                <p>© {new Date().getFullYear()} Diana Ismail. All rights reserved.</p>

                {/* .footer-link class drives the electric-blue hover via pure CSS */}
                <a
                    href="https://dianaismail.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                >
                    Return to main site <ArrowUpRight className="w-4 h-4" />
                </a>
            </div>
        </footer>
    );
}
