import { useState, useEffect } from "react";

/**
 * useReducedMotion — returns true when the user has enabled
 * prefers-reduced-motion in their OS/browser settings.
 * All v2 animations should be disabled when this returns true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
