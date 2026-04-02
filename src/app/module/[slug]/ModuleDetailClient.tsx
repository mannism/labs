"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/types/project";
import { LayoutShellV2 } from "@/components/v2/LayoutShellV2";
import { ProjectDetailV2 } from "@/components/v2/ProjectDetailV2";
import { SignalField } from "@/components/v2/SignalField";
import { ScanLine } from "@/components/v2/ScanLine";
import { DatamoshTransition } from "@/components/v2/DatamoshTransition";
import { ChatWidget } from "@/components/ChatWidget";

/**
 * ModuleDetailClient — client wrapper for the /module/[slug] route.
 * Renders the same layout (SignalField, ScanLine, LayoutShellV2, ChatWidget)
 * as AppShell, but skips the grid and SystemBoot. The detail view is shown
 * immediately with the Datamosh transition firing on back navigation.
 */
export function ModuleDetailClient({ project }: { project: Project }) {
  const router = useRouter();
  const [datamoshActive, setDatamoshActive] = useState(false);

  /** Navigate back — play mild datamosh, then route to homepage */
  const goBack = useCallback(() => {
    setDatamoshActive(true);
  }, []);

  /** Datamosh complete — perform the actual navigation */
  const handleDatamoshComplete = useCallback(() => {
    setDatamoshActive(false);
    router.push("/");
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Cursor-reactive dot grid background */}
      <SignalField />

      {/* Datamosh glitch transition overlay — mild mode for back nav */}
      <DatamoshTransition
        active={datamoshActive}
        mode="mild"
        onComplete={handleDatamoshComplete}
      />

      {/* Atmospheric scan-line */}
      <ScanLine />

      {/* bootComplete=true skips the Ghost Type delay on HeroV2 headline */}
      <LayoutShellV2 bootComplete>
        <ProjectDetailV2 project={project} onBack={goBack} />
      </LayoutShellV2>

      {/* Floating chat widget — always present */}
      <ChatWidget />
    </main>
  );
}
