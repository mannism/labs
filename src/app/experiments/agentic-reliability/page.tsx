/**
 * /experiments/agentic-reliability — EXP_009 Agentic Reliability Dashboard
 *
 * Server Component: exports Metadata. The actual interactive dashboard is
 * loaded via DashboardClient (a "use client" component) which wraps the
 * next/dynamic import — required in Next.js 16+ (Turbopack) where ssr: false
 * must be declared inside a Client Component.
 */

import type { Metadata } from "next";
import { DashboardClient } from "@/components/experiments/exp_009/DashboardClient";

export const metadata: Metadata = {
  title: "Agentic Reliability Dashboard | EXP_009 | Labs by Diana",
  description:
    "Head-to-head benchmark: GPT-5.5, Claude Opus 4.7, and Gemini 3.1 Pro running identical tool-calling tasks in real time. Pass rates, latency, and validation errors — live.",
  keywords: [
    "agentic AI",
    "LLM benchmark",
    "tool calling",
    "GPT-5.5",
    "Claude Opus",
    "Gemini",
    "reliability",
    "structured output",
  ],
};

export default function AgenticReliabilityPage() {
  return <DashboardClient />;
}
