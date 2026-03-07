import { Hero } from "@/components/Hero";
import { ProjectGrid } from "@/components/ProjectGrid";
import { Footer } from "@/components/Footer";

/**
 * The main entry point for the application.
 * Renders the primary layout structure:
 * - A central flex container restricted to max-w-7xl
 * - The Hero section (introduction)
 * - The dynamic ProjectGrid (filterable list of projects)
 * - The global Footer
 */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      {/* Main Content Area: Flexes to fill available space before the footer */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col pt-8">
        <Hero />
        <ProjectGrid />
      </div>

      {/* Footer Area: Contained at the bottom */}
      <div className="w-full max-w-7xl mx-auto">
        <Footer />
      </div>
    </main>
  );
}
