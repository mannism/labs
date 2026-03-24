"use client";

/**
 * Footer Component
 * Displays copyright information.
 */
export function Footer() {
    return (
        <footer className="py-10 mt-20" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div
                className="container mx-auto px-4 flex items-center justify-center text-sm font-mono"
                style={{ color: "var(--text-muted)" }}
            >
                <p>© {new Date().getFullYear()} Diana Ismail. All rights reserved.</p>
            </div>
        </footer>
    );
}
