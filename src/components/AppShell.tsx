"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChatWidgetLazy } from "./ChatWidgetLazy";
import { Project } from "@/types/project";

/* v2 components */
import { LayoutShellV2 } from "./v2/LayoutShellV2";
import { ProjectGridV2 } from "./v2/ProjectGridV2";
import { ScanLine } from "./v2/ScanLine";
import { SystemBoot } from "./v2/SystemBoot";
import { SignalField } from "./v2/SignalField";
import { DatamoshTransition } from "./v2/DatamoshTransition";

/**
 * AppShell — renders the v2 Speculative Interface homepage (grid view).
 * Clicking a project triggers the Datamosh transition, then navigates
 * to /module/[slug] via Next.js router. Detail views are now standalone
 * pages with their own SEO metadata.
 * ChatWidget is always present (bottom-right, z-index 45).
 */
export function AppShell() {
  const router = useRouter();
  /** Whether System Boot has finished — gates Ghost Type scramble */
  const [bootComplete, setBootComplete] = useState(false);
  /** Datamosh glitch transition state */
  const [datamoshActive, setDatamoshActive] = useState(false);
  /** Pending project slug for delayed navigation after glitch plays */
  const pendingSlugRef = useRef<string | null>(null);

  /** Callback when datamosh animation completes — navigate to the project route */
  const handleDatamoshComplete = useCallback(() => {
    setDatamoshActive(false);

    if (pendingSlugRef.current) {
      const slug = pendingSlugRef.current;
      pendingSlugRef.current = null;
      router.push(`/module/${slug}`);
    }
  }, [router]);

  /** Open detail view: store slug for return-scroll, trigger datamosh, then navigate */
  const selectProject = useCallback((project: Project) => {
    pendingSlugRef.current = project.slug;
    try {
      sessionStorage.setItem("labs-return-to-slug", project.slug);
    } catch {
      /* sessionStorage unavailable — no-op */
    }
    setDatamoshActive(true);
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Cursor-reactive dot grid background — z-index 0, behind everything */}
      <SignalField />

      {/* System boot overlay — plays once per session */}
      <SystemBoot onComplete={() => setBootComplete(true)} />

      {/* Datamosh glitch transition overlay — full mode for grid-to-detail */}
      <DatamoshTransition
        active={datamoshActive}
        mode="full"
        onComplete={handleDatamoshComplete}
      />

      {/* Atmospheric scan-line */}
      <ScanLine />

      <LayoutShellV2 bootComplete={bootComplete}>
        <ProjectGridV2 key="grid" onSelectProject={selectProject} />
      </LayoutShellV2>

      {/* Floating chat widget — always present (lazy-loaded, code-split from critical bundle) */}
      <ChatWidgetLazy />
    </main>
  );
}
