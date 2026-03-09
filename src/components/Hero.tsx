/**
 * Hero Component
 * Sets the tone for the application with a "Cyber-Minimalist" aesthetic.
 * Incorporates brand-specific typography (Merriweather display, Open Sans body)
 * and the glowing status badge modeled after the twin site's digital agent interface.
 * Engineered for high-contrast readability and impact.
 */
export function Hero() {
    return (
        <section className="py-20 md:py-32 flex flex-col items-center justify-center text-center px-4">

            {/* Status badge — identical pill style from twin site */}
            <div
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
                // DIANA ISMAIL LABS
            </div>

            {/* Main Headline — Merriweather, matching twin site typography */}
            <h1
                className="font-display text-4xl md:text-6xl font-bold mb-6 max-w-3xl leading-tight"
                style={{ color: "var(--text-primary)" }}
            >
                Labs by Diana —{" "}
                <span style={{ color: "var(--accent-blue)" }}>
                    Where creativity meets experimental tech.
                </span>
            </h1>

            {/* Subtitle */}
            <p
                className="text-base md:text-lg max-w-2xl"
                style={{ color: "var(--text-muted)", fontFamily: "'Open Sans', sans-serif" }}
            >
                Just scratching an itch — my random musings and projects.
            </p>
        </section>
    );
}
