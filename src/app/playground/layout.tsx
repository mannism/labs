import type { Metadata } from "next";
import { ExperimentsShell } from "@/components/playground/ExperimentsShell";

/**
 * Playground layout — shared wrapper for /playground/ routes.
 * Renders NavbarV2 (with PLAYGROUND link active), WebGPU provider,
 * and FooterV2. Children are the landing page or individual experiment pages.
 */

export const metadata: Metadata = {
  title: "Playground | Labs by Diana",
  description:
    "Technical experiments exploring emerging browser capabilities. WebGPU compute shaders, real-time simulations, and interactive visualizations.",
};

export default function ExperimentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExperimentsShell>{children}</ExperimentsShell>;
}
