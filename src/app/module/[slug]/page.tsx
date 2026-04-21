import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Project } from "@/types/project";
import projectsData from "@/lib/projects";
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
 * Title, description, keywords, canonical URL, OG tags, and twitter card.
 * Keywords derived from project tags for GEO optimization.
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
  const title = `${project.title} — Labs | Diana Ismail`;

  return {
    title,
    description: project.shortDescription,
    keywords: [...project.tags, "Diana Ismail", "Labs"],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      /* Article pages get og:type "article" for richer social card previews */
      type: project.type === "article" ? "article" : "website",
      locale: seo.openGraph.locale,
      url: canonicalUrl,
      siteName: seo.siteName,
      title,
      description: project.shortDescription,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: project.shortDescription,
      creator: seo.twitterHandle,
    },
  };
}

/**
 * Per-project JSON-LD structured data.
 * SoftwareApplication schema for project pages, Article schema for article pages.
 */
function buildJsonLd(project: Project) {
  const canonicalUrl = `${seo.siteUrl}/module/${project.slug}`;
  const isArticle = project.type === "article";

  if (isArticle) {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: project.title,
      description: project.shortDescription,
      url: canonicalUrl,
      author: {
        "@type": "Person",
        name: seo.author,
        url: "https://dianaismail.me",
      },
      publisher: {
        "@type": "Person",
        name: seo.author,
      },
      ...(project.createdDate && { datePublished: project.createdDate }),
      keywords: project.tags.join(", "),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    description: project.shortDescription,
    url: project.demoUrl || canonicalUrl,
    applicationCategory: "WebApplication",
    operatingSystem: "Web",
    author: {
      "@type": "Person",
      name: seo.author,
      url: "https://dianaismail.me",
    },
    ...(project.version && { softwareVersion: project.version }),
    keywords: project.tags.join(", "),
  };
}

/**
 * ModuleDetailPage — server component entry for /module/[slug].
 * Resolves the project by slug, returns 404 if not found,
 * then delegates rendering to the client component.
 * Injects per-project JSON-LD structured data.
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(project)) }}
      />
      <ModuleDetailClient project={project} />
    </>
  );
}
