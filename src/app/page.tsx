import { AppShell } from "@/components/AppShell";

/**
 * Main Application Page
 * Delegates rendering to AppShell, which conditionally shows v1 or v2
 * based on the user's version preference. Background depth (orbs & grid)
 * is managed upstream in layout.tsx.
 */
export default function Home() {
  return <AppShell />;
}
