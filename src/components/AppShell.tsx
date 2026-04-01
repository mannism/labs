"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useVersion } from "./VersionProvider";
import { VersionToggle } from "./VersionToggle";
import { ChatWidget } from "./ChatWidget";
import { Project } from "./ProjectCard";

/* v1 components */
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { ProjectGrid } from "./ProjectGrid";
import { Footer } from "./Footer";

/* v2 components */
import { LayoutShellV2 } from "./v2/LayoutShellV2";
import { ProjectGridV2 } from "./v2/ProjectGridV2";
import { ProjectDetailV2 } from "./v2/ProjectDetailV2";
import { ScanLine } from "./v2/ScanLine";

/**
 * AppShell — conditionally renders the v1 or v2 interface based on useVersion().
 *
 * v1: existing Navbar, Hero, ProjectGrid, Footer (unchanged behaviour).
 * v2: LayoutShellV2 wrapping ProjectGridV2 (grid view) or ProjectDetailV2
 *     (detail view) with a scan-line atmospheric element.
 *
 * ChatWidget renders in BOTH versions (always present, bottom-right, z-index 45).
 */
export function AppShell() {
  const { version } = useVersion();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <main className="min-h-screen flex flex-col">
      {version === "v1" ? (
        /* ── V1 interface ──────────────────────────────────────────── */
        <>
          {/* Full-width sticky navbar (includes version toggle + theme toggle) */}
          <Navbar />

          {/* Centered content area */}
          <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col pt-8">
            <Hero />
            <ProjectGrid />
          </div>

          <div className="w-full max-w-7xl mx-auto">
            <Footer />
          </div>
        </>
      ) : (
        /* ── V2 interface ──────────────────────────────────────────── */
        <>
          {/* Atmospheric scan-line — v2 only */}
          <ScanLine />

          <LayoutShellV2 versionToggle={<VersionToggle />}>
            <AnimatePresence mode="wait">
              {selectedProject ? (
                <ProjectDetailV2
                  key="detail"
                  project={selectedProject}
                  onBack={() => setSelectedProject(null)}
                />
              ) : (
                <ProjectGridV2
                  key="grid"
                  onSelectProject={setSelectedProject}
                />
              )}
            </AnimatePresence>
          </LayoutShellV2>
        </>
      )}

      {/* Floating chat widget — always present in both versions */}
      <ChatWidget />
    </main>
  );
}
