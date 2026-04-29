import { notFound } from "next/navigation";
import type { Metadata } from "next";
import experimentsData from "@/data/experiments.json";
import type { Experiment } from "@/types/experiment";
import { ExperimentDetail } from "@/components/playground/ExperimentDetail";
import seo from "@/data/seo.json";

/**
 * Individual experiment page — reads from experiments.json by slug.
 * Renders breadcrumb, header (title, description, input indicator),
 * dark canvas placeholder, and "coming soon" message.
 * Three.js / WebGPU canvas will be loaded via next/dynamic with ssr:false
 * once the experiments are built.
 */

const experiments = experimentsData as Experiment[];

/** Canonical Person entity — portfolio domain is authoritative across both sites. */
const PORTFOLIO_PERSON_ID = "https://dianaismail.me/#person";

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
    title: `${experiment.title} | Playground | Labs by Diana`,
    description: experiment.description,
    keywords: experiment.tags,
  };
}

/**
 * Per-experiment JSON-LD structured data (GEO P0).
 * SoftwareApplication is the correct type for interactive browser-based experiments.
 * author uses canonical @id to connect to the portfolio entity graph.
 * abstract surfaces conceptStatement for AI engine summarisation.
 */
function buildExperimentJsonLd(experiment: Experiment) {
  const canonicalUrl = `${seo.siteUrl}/playground/${experiment.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: experiment.title,
    description: experiment.description,
    ...(experiment.conceptStatement && { abstract: experiment.conceptStatement }),
    url: canonicalUrl,
    applicationCategory: "WebApplication",
    operatingSystem: "Web Browser",
    // @id reference connects this page to the canonical entity graph (not a name string).
    author: { "@id": PORTFOLIO_PERSON_ID },
    datePublished: experiment.createdAt,
    keywords: experiment.tags.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildExperimentJsonLd(experiment)),
        }}
      />
      <ExperimentDetail experiment={experiment} />
    </>
  );
}
