/** Thin wrapper around the global gtag function injected by @next/third-parties. */
export function trackEvent(action: string, params: Record<string, string>) {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", action, params);
    }
}
