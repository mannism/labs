import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ProjectGrid } from "@/components/ProjectGrid";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";

/**
 * Main Application Page
 * Composes Navbar, Hero, ProjectGrid, and Footer into a single-page layout.
 * The Navbar spans full-width (outside the max-w-7xl container).
 * Background depth (orbs & grid) is managed upstream in layout.tsx.
 */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Full-width sticky navbar */}
      <Navbar />

      {/* Centered content area */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col pt-8">
        <Hero />
        <ProjectGrid />
      </div>

      <div className="w-full max-w-7xl mx-auto">
        <Footer />
      </div>

      {/* Floating chat widget — fixed position, outside layout flow */}
      <ChatWidget />
    </main>
  );
}
