/**
 * Hero component for the Labs landing page.
 * Displays the main headline, subtitle, and an animated status indicator.
 * Utilizes Tailwind CSS for layout, typography, and responsive design.
 */
export function Hero() {
    return (
        <section className="py-20 md:py-32 flex flex-col items-center justify-center text-center px-4">
            {/* Status Indicator Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-neutral-300 mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                dianaismail.me/labs
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 max-w-3xl">
                Labs by Diana — Where creativity meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-white">experimental tech.</span>
            </h1>

            {/* Subtitle / Description */}
            <p className="text-lg text-neutral-400 max-w-2xl font-mono">
                Just scratching an itch -  my random musings/projects.
            </p>
        </section>
    );
}
