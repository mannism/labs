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
import { SignalField } from "./v2/SignalField";
import { DatamoshTransition } from "./v2/DatamoshTransition";

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
  /** Datamosh glitch transition state */
  const [datamoshActive, setDatamoshActive] = useState(false);
  /** Track whether transitioning to detail (full) or back to grid (mild) */
  const [datamoshMode, setDatamoshMode] = useState<"full" | "mild">("full");
  /** Pending project for delayed selection after glitch plays */
  const pendingProjectRef = useRef<Project | null>(null);

  /** Find a project by its ID from the static dataset */
  const findProjectById = useCallback((id: string): Project | null => {
    return (projectsData as Project[]).find((p) => p.id === id) ?? null;
  }, []);

  /** Callback when datamosh animation completes — apply the pending transition */
  const handleDatamoshComplete = useCallback(() => {
    setDatamoshActive(false);
    if (datamoshMode === "full" && pendingProjectRef.current) {
      const project = pendingProjectRef.current;
      pendingProjectRef.current = null;
      setSelectedProject(project);
      window.history.pushState(
        { projectId: project.id },
        "",
        `?project=${project.id}`
      );
    }
  }, [datamoshMode]);

  /** Open detail view: trigger datamosh, then switch view on completion */
  const selectProject = useCallback(
    (project: Project) => {
      savedScrollY.current = window.scrollY;
      pendingProjectRef.current = project;
      setDatamoshMode("full");
      setDatamoshActive(true);
    },
    []
  );

  /** Close detail view via browser back — triggers mild datamosh */
  const goBackToGrid = useCallback(() => {
    setDatamoshMode("mild");
    setDatamoshActive(true);
    /* The actual back navigation happens after datamosh completes via popstate */
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
      {/* Cursor-reactive dot grid background — z-index 0, behind everything */}
      <SignalField />

      {/* System boot overlay — plays once per session */}
      <SystemBoot />

      {/* Datamosh glitch transition overlay */}
      <DatamoshTransition
        active={datamoshActive}
        mode={datamoshMode}
        onComplete={handleDatamoshComplete}
      />

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
