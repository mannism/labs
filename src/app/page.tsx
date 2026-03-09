import { Hero } from "@/components/Hero";
import { ProjectGrid } from "@/components/ProjectGrid";
import { Footer } from "@/components/Footer";

/**
 * Main Application Layout (Home)
 * Orchestrates the "Cyber-Minimalist" frontend architecture:
 * - A responsive, globally centered layout constrained to max-w-7xl.
 * - Hero: Brand introduction and high-impact visual anchors.
 * - ProjectGrid: Dynamic, filterable ecosystem of Agentic-AI and Mixed Reality POCs.
 * - Footer: Global navigation and copyright containment.
 * 
 * NOTE: The background depth (orbs & grid) is managed upstream in layout.tsx.
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
