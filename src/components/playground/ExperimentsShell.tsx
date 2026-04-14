"use client";

import type { ReactNode } from "react";
import { NavbarV2 } from "@/components/v2/NavbarV2";
import { FooterV2 } from "@/components/v2/FooterV2";
import { WebGPUProvider } from "./WebGPUCheck";

/**
 * ExperimentsShell — client-side layout wrapper for the experiments section.
 * Provides the WebGPU capability context and renders shared chrome
 * (navbar, footer). Separated from layout.tsx to keep the Server Component
 * boundary clean (metadata export requires a Server Component).
 */
export function ExperimentsShell({ children }: { children: ReactNode }) {
  return (
    <WebGPUProvider>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--v2-bg-primary)",
        }}
      >
        <NavbarV2 />

        {/* Page content — full-width wrapper so experiment canvases can bleed edge-to-edge.
            Child sections must apply `max-w-7xl mx-auto px-6` to align with the navbar.
            See ExperimentsLanding and ExperimentDetail for the pattern. */}
        <div style={{ flex: 1 }}>{children}</div>

        <FooterV2 />
      </div>
    </WebGPUProvider>
  );
}
