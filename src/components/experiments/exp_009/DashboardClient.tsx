"use client";

/**
 * DashboardClient — thin client shell that dynamically imports the Dashboard.
 *
 * next/dynamic with ssr: false must live in a "use client" component in
 * Next.js 16+ (Turbopack). This wrapper satisfies that constraint while
 * keeping the page.tsx a Server Component so it can export Metadata.
 */

import dynamic from "next/dynamic";

/** Loading state shown while the Dashboard client bundle is being fetched. */
function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--exp-canvas-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
        }}
      >
        Loading Dashboard…
      </p>
    </div>
  );
}

/** Dynamically imported Dashboard — browser APIs only, no SSR. */
const Dashboard = dynamic(
  () =>
    import("@/components/experiments/exp_009/Dashboard").then(
      (mod) => mod.Dashboard
    ),
  {
    ssr: false,
    loading: DashboardLoading,
  }
);

export function DashboardClient() {
  return <Dashboard />;
}
