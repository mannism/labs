"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

/**
 * WebGPUCheck — client component that detects navigator.gpu availability.
 * Provides context so child components can conditionally render fallbacks.
 * Also exports an amber browser support banner shown when WebGPU is unavailable.
 */

interface WebGPUContextValue {
  /** null = still checking, true = supported, false = not supported */
  supported: boolean | null;
}

const WebGPUContext = createContext<WebGPUContextValue>({ supported: null });

/** Hook to consume WebGPU support status from nearest provider. */
export function useWebGPU(): WebGPUContextValue {
  return useContext(WebGPUContext);
}

/** Provider that runs the capability check once on mount. */
export function WebGPUProvider({ children }: { children: ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    /* navigator.gpu exists only in browsers with WebGPU support */
    setSupported(typeof navigator !== "undefined" && "gpu" in navigator);
  }, []);

  return (
    <WebGPUContext.Provider value={{ supported }}>
      {children}
    </WebGPUContext.Provider>
  );
}

/**
 * WebGPUBanner — amber-tinted info banner shown when WebGPU is unavailable.
 * Hidden when supported or still checking.
 */
export function WebGPUBanner() {
  const { supported } = useWebGPU();

  /* Don't render while checking or when supported */
  if (supported === null || supported === true) return null;

  return (
    <div
      role="alert"
      style={{
        background: "rgba(245, 158, 11, 0.08)",
        border: "1px solid rgba(245, 158, 11, 0.2)",
        borderRadius: "4px",
        padding: "var(--v2-space-md) var(--v2-space-lg)",
        marginBottom: "var(--v2-space-3xl)",
        display: "flex",
        alignItems: "center",
        gap: "var(--v2-space-sm)",
      }}
    >
      {/* Info circle icon — inline SVG to avoid external dependency */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="8" cy="8" r="7" stroke="#F59E0B" strokeWidth="1.5" />
        <path d="M8 7v4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.75" fill="#F59E0B" />
      </svg>
      <span
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-secondary)",
          lineHeight: 1.5,
        }}
      >
        These experiments require WebGPU support. Chrome 113+ and Edge 113+ recommended.
      </span>
    </div>
  );
}
