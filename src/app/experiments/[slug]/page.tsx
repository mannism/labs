import { notFound } from "next/navigation";
import type { Metadata } from "next";
import experimentsData from "@/data/experiments.json";
import type { Experiment } from "@/types/experiment";
import { ExperimentDetail } from "@/components/experiments/ExperimentDetail";

/**
 * Individual experiment page — reads from experiments.json by slug.
 * Renders breadcrumb, header (title, description, input indicator),
 * dark canvas placeholder, and "coming soon" message.
 * Three.js / WebGPU canvas will be loaded via next/dynamic with ssr:false
 * once the experiments are built.
 */

const experiments = experimentsData as Experiment[];

/** Generate static params for all experiment slugs. */
export async function generateStaticParams() {
  return experiments.map((exp) => ({ slug: exp.slug }));
}

/** Per-experiment metadata for SEO. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const experiment = experiments.find((e) => e.slug === slug);
  if (!experiment) return {};

  return {
    title: `${experiment.title} | Experiments | Labs by Diana`,
    description: experiment.description,
    keywords: experiment.tags,
  };
}

export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const experiment = experiments.find((e) => e.slug === slug);

  if (!experiment) {
    notFound();
  }

  return <ExperimentDetail experiment={experiment} />;
}
