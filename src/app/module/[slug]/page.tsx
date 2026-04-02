import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Project } from "@/types/project";
import projectsData from "@/data/projects.json";
import seo from "@/data/seo.json";
import { ModuleDetailClient } from "./ModuleDetailClient";

/** Static project dataset typed for lookup */
const projects = projectsData as Project[];

/** All visible project slugs — used for static generation */
const visibleProjects = projects.filter((p) => p.display !== false);

/**
 * generateStaticParams — pre-renders all visible project slugs at build time.
 * Ensures each /module/[slug] page is statically generated.
 */
export function generateStaticParams() {
  return visibleProjects.map((p) => ({ slug: p.slug }));
}

/**
 * generateMetadata — per-project SEO metadata.
 * Title: "{project.title} — Labs | Diana Ismail"
 * Description: project.shortDescription
 * Canonical URL: https://labs.dianaismail.me/module/{slug}
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return { title: "Not Found — Labs | Diana Ismail" };
  }

  const canonicalUrl = `${seo.siteUrl}/module/${slug}`;

  return {
    title: `${project.title} — Labs | Diana Ismail`,
    description: project.shortDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: seo.openGraph.locale,
      url: canonicalUrl,
      siteName: seo.siteName,
      title: `${project.title} — Labs | Diana Ismail`,
      description: project.shortDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} — Labs | Diana Ismail`,
      description: project.shortDescription,
      creator: seo.twitterHandle,
    },
  };
}

/**
 * ModuleDetailPage — server component entry for /module/[slug].
 * Resolves the project by slug, returns 404 if not found,
 * then delegates rendering to the client component.
 */
export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return <ModuleDetailClient project={project} />;
}
