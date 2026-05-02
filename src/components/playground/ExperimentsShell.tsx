"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { NavbarV2 } from "@/components/v2/NavbarV2";
import { FooterV2 } from "@/components/v2/FooterV2";
import { ChatWidget } from "@/components/ChatWidget";
import { WebGPUProvider } from "./WebGPUCheck";

/**
 * ExperimentsShell — client-side layout wrapper for the experiments section.
 * Provides the WebGPU capability context and renders shared chrome
 * (navbar, footer). Separated from layout.tsx to keep the Server Component
 * boundary clean (metadata export requires a Server Component).
 *
 * Preview mode (?preview=1): NavbarV2 and FooterV2 are omitted so the
 * experiment canvas fills the full viewport — used by the capture script.
 */

/**
 * ShellInner reads the search param and conditionally renders chrome.
 * Must be a separate component so it can be wrapped in <Suspense> — Next.js
 * requires useSearchParams() callers to have a Suspense boundary above them
 * in the tree when the page uses generateStaticParams (static rendering).
 * Suspense fallback renders the full chrome, matching the SSR/no-param state.
 */
function ShellInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  if (isPreview) {
    /* Preview mode — bare viewport, no nav/footer chrome. The experiment
       canvas inside ExperimentDetail will expand to fill 100dvh. */
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--exp-canvas-bg)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    );
  }

  return (
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

      {/* Floating chat widget — matches AppShell; hidden in preview mode above */}
      <ChatWidget />
    </div>
  );
}

export function ExperimentsShell({ children }: { children: ReactNode }) {
  return (
    <WebGPUProvider>
      {/*
       * Suspense boundary required by Next.js for useSearchParams() in a
       * statically-rendered route. Fallback renders full chrome — same as the
       * no-param state — so there is no flash of incorrect layout on first paint.
       */}
      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--v2-bg-primary)",
            }}
          >
            <NavbarV2 />
            <div style={{ flex: 1 }}>{children}</div>
            <FooterV2 />
            <ChatWidget />
          </div>
        }
      >
        <ShellInner>{children}</ShellInner>
      </Suspense>
    </WebGPUProvider>
  );
}
