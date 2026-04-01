"use client";

import { ReactNode } from "react";
import { NavbarV2 } from "./NavbarV2";
import { FooterV2 } from "./FooterV2";

/**
 * LayoutShellV2 — page-level wrapper for the Speculative Interface (v2).
 * Renders NavbarV2, a "CORE DIRECTORY" subheadline, children, and FooterV2.
 * Background uses v2 tokens. Max-width matches v1 (80rem / max-w-7xl).
 * Bottom-right space is reserved for the ChatWidget (rendered externally).
 */
export function LayoutShellV2({
  children,
  versionToggle,
}: {
  children: ReactNode;
  versionToggle?: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--v2-bg-primary)",
      }}
    >
      <NavbarV2 versionToggle={versionToggle} />

      {/* Subheadline — directory-style system label */}
      <div className="max-w-7xl mx-auto w-full px-6" style={{ paddingTop: "var(--v2-space-lg)" }}>
        <p
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            margin: 0,
          }}
        >
          CORE DIRECTORY // SYSTEM.USER.DIANA_ISMAIL
        </p>
      </div>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto w-full px-6 flex-1" style={{ paddingTop: "var(--v2-space-xl)" }}>
        {children}
      </div>

      <FooterV2 />
    </div>
  );
}
