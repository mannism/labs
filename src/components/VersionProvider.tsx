"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

/**
 * Version context for switching between v1 (Cyber-Minimalist) and v2 (Speculative Interface).
 * Persists the user's choice to localStorage and manages the html class accordingly.
 * v1 supports dark/light themes; v2 is light-only (applies html.v2 class).
 */

type Version = "v1" | "v2";

interface VersionContextValue {
  version: Version;
  setVersion: (v: Version) => void;
}

const VersionContext = createContext<VersionContextValue | undefined>(undefined);

const STORAGE_KEY = "labs-ui-version";
const THEME_STORAGE_KEY = "theme";

/**
 * VersionProvider — wraps the app and manages the active UI version.
 * On mount, reads the persisted version from localStorage (defaults to "v2").
 * When version changes, updates the html element classes:
 *   - v1: restores dark/light theme class from localStorage
 *   - v2: sets "v2" class, removes dark/light (light-only design)
 */
export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersionState] = useState<Version>("v2");
  const [mounted, setMounted] = useState(false);

  /* Read persisted version on mount */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Version | null;
    if (stored === "v1" || stored === "v2") {
      setVersionState(stored);
    }
    setMounted(true);
  }, []);

  /** Apply the correct html classes for the given version */
  const applyVersionClasses = (v: Version) => {
    const root = document.documentElement;

    if (v === "v2") {
      /* v2 is light-only — remove dark/light classes, add v2 */
      root.classList.remove("dark", "light");
      root.classList.add("v2");
    } else {
      /* v1 supports dark/light — restore saved theme or default to dark */
      root.classList.remove("v2");
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
      root.classList.remove("dark", "light");
      root.classList.add(savedTheme);
    }
  };

  /* Apply html classes whenever version changes (only after mount) */
  useEffect(() => {
    if (!mounted) return;
    applyVersionClasses(version);
  }, [version, mounted]);

  /* Re-apply classes when page is restored from bfcache (back/forward nav) */
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        applyVersionClasses(version);
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [version]);

  /** Persist version choice and update state */
  const setVersion = (v: Version) => {
    localStorage.setItem(STORAGE_KEY, v);
    setVersionState(v);
  };

  return (
    <VersionContext.Provider value={{ version, setVersion }}>
      {children}
    </VersionContext.Provider>
  );
}

/**
 * useVersion — access the current version and setter from any client component.
 * Must be called within a VersionProvider.
 */
export function useVersion(): VersionContextValue {
  const ctx = useContext(VersionContext);
  if (!ctx) {
    throw new Error("useVersion must be used within a VersionProvider");
  }
  return ctx;
}
