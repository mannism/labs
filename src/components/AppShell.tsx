"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatWidget } from "./ChatWidget";
import { Project } from "@/types/project";
import projectsData from "../data/projects.json";

/* v2 components */
import { LayoutShellV2 } from "./v2/LayoutShellV2";
import { ProjectGridV2 } from "./v2/ProjectGridV2";
import { ProjectDetailV2 } from "./v2/ProjectDetailV2";
import { ScanLine } from "./v2/ScanLine";
import { SystemBoot } from "./v2/SystemBoot";

/**
 * AppShell — renders the v2 Speculative Interface.
 * LayoutShellV2 wraps ProjectGridV2 (grid view) or ProjectDetailV2
 * (detail view) with a scan-line atmospheric element.
 * ChatWidget is always present (bottom-right, z-index 45).
 */
export function AppShell() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  /** Saved scroll position so we can restore it when returning to the grid */
  const savedScrollY = useRef(0);

  /** Find a project by its ID from the static dataset */
  const findProjectById = useCallback((id: string): Project | null => {
    return (projectsData as Project[]).find((p) => p.id === id) ?? null;
  }, []);

  /** Open detail view: save scroll position, push history, scroll to top */
  const selectProject = useCallback(
    (project: Project) => {
      savedScrollY.current = window.scrollY;
      setSelectedProject(project);
      window.history.pushState({ projectId: project.id }, "", `?project=${project.id}`);
      /* Detail view's own useEffect handles scrolling to the back button */
    },
    []
  );

  /** Close detail view via browser back */
  const goBackToGrid = useCallback(() => {
    window.history.back();
  }, []);

  /* Handle popstate (browser back/forward) and initial URL param */
  useEffect(() => {
    /* On mount, check for ?project= in the URL (handles refresh & forward nav) */
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get("project");
    if (projectParam) {
      const found = findProjectById(projectParam);
      if (found) setSelectedProject(found);
    }

    /** Popstate handler — sync selectedProject with browser history state */
    const onPopState = (event: PopStateEvent) => {
      if (event.state?.projectId) {
        const found = findProjectById(event.state.projectId);
        setSelectedProject(found);
        /* Detail view's own useEffect handles scrolling to the back button */
      } else {
        /* Returning to grid — restore saved scroll position */
        setSelectedProject(null);
        setTimeout(() => window.scrollTo({ top: savedScrollY.current, behavior: "instant" }), 50);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [findProjectById]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* System boot overlay — plays once per session */}
      <SystemBoot />

      {/* Atmospheric scan-line */}
      <ScanLine />

      <LayoutShellV2>
        <AnimatePresence mode="wait">
          {selectedProject ? (
            <ProjectDetailV2
              key="detail"
              project={selectedProject}
              onBack={goBackToGrid}
            />
          ) : (
            <ProjectGridV2
              key="grid"
              onSelectProject={selectProject}
            />
          )}
        </AnimatePresence>
      </LayoutShellV2>

      {/* Floating chat widget — always present */}
      <ChatWidget />
    </main>
  );
}
