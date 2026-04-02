"use client";

import { ReactNode } from "react";
import { NavbarV2 } from "./NavbarV2";
import { HeroV2 } from "./HeroV2";
import { FooterV2 } from "./FooterV2";

/**
 * LayoutShellV2 — page-level wrapper for the Speculative Interface (v2).
 * Renders NavbarV2, HeroV2 (system label + headline), children, and FooterV2.
 * Background uses v2 tokens. Max-width matches design (80rem / max-w-7xl).
 * Bottom-right space is reserved for the ChatWidget (rendered externally).
 */
export function LayoutShellV2({ children }: { children: ReactNode }) {
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

      <HeroV2 />

      {/* Main content area */}
      <div className="max-w-7xl mx-auto w-full px-6 flex-1">
        {children}
      </div>

      <FooterV2 />
    </div>
  );
}
