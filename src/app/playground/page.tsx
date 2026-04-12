import { ExperimentsLanding } from "@/components/playground/ExperimentsLanding";

/**
 * Playground landing page — displays hero + card grid of all experiments.
 * Server Component wrapper; interactive content delegated to ExperimentsLanding.
 */
export default function ExperimentsPage() {
  return <ExperimentsLanding />;
}
