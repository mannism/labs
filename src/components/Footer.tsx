import { ArrowUpRight } from "lucide-react";

/**
 * Footer component for the application.
 * Contains copyright information and a prominent link back to the main portfolio site.
 * Designed to be responsive, stacking on mobile and side-by-side on desktop.
 */
export function Footer() {
    return (
        <footer className="border-t border-white/10 py-12 mt-20">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-neutral-400 text-sm font-mono">
                {/* Copyright Text */}
                <p>© {new Date().getFullYear()} Diana Ismail. All rights reserved.</p>

                {/* External Link back to main platform */}
                <a
                    href="https://dianaismail.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors mt-4 md:mt-0"
                >
                    Return to main site <ArrowUpRight className="w-4 h-4" />
                </a>
            </div>
        </footer>
    );
}
