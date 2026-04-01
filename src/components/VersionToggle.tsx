"use client";

import { useVersion } from "./VersionProvider";

/**
 * VersionToggle — minimal text-button toggle between v1 and v2.
 * The active version is highlighted; the inactive one is muted.
 * Styled to work in both NavbarV2 (v2 mode) and the existing Navbar (v1 mode).
 */
export function VersionToggle() {
  const { version, setVersion } = useVersion();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        borderRadius: "9999px",
        border: "1px solid var(--border-subtle, var(--v2-border, rgba(0,0,0,0.08)))",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setVersion("v1")}
        aria-label="Switch to v1 interface"
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "0.6875rem",
          padding: "4px 10px",
          border: "none",
          cursor: "pointer",
          transition: "background 0.2s ease, color 0.2s ease",
          background: version === "v1" ? "var(--accent-blue, #0069FF)" : "transparent",
          color: version === "v1" ? "#fff" : "var(--text-muted, var(--v2-text-tertiary, #9CA3AF))",
        }}
      >
        v1
      </button>
      <button
        onClick={() => setVersion("v2")}
        aria-label="Switch to v2 interface"
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "0.6875rem",
          padding: "4px 10px",
          border: "none",
          cursor: "pointer",
          transition: "background 0.2s ease, color 0.2s ease",
          background: version === "v2" ? "var(--accent-blue, #0069FF)" : "transparent",
          color: version === "v2" ? "#fff" : "var(--text-muted, var(--v2-text-tertiary, #9CA3AF))",
        }}
      >
        v2
      </button>
    </div>
  );
}
