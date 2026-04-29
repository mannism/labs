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

/** Canonical Person entity — portfolio domain is authoritative across both sites. */
const PORTFOLIO_PERSON_ID = "https://dianaismail.me/#person";

/**
 * Per-project JSON-LD structured data.
 * - Articles: TechArticle (upgraded from Article) — signals technical practitioner authorship.
 * - Projects: SoftwareApplication — with datePublished/dateModified from createdDate/lastUpdated.
 * - All types: author uses canonical @id (GEO entity graph fix, P0).
 */
function buildJsonLd(project: Project) {
  const canonicalUrl = `${seo.siteUrl}/module/${project.slug}`;
  const isArticle = project.type === "article";

  if (isArticle) {
    return {
      "@context": "https://schema.org",
      // TechArticle (subtype of Article) signals technical expertise to AI engines.
      "@type": "TechArticle",
      headline: project.title,
      description: project.shortDescription,
      url: canonicalUrl,
      // @id reference connects this page to the canonical entity graph (not a name string).
      author: { "@id": PORTFOLIO_PERSON_ID },
      publisher: { "@id": `${seo.siteUrl}/#website` },
      proficiencyLevel: "Expert",
      ...(project.createdDate && { datePublished: project.createdDate }),
      // dateModified falls back to createdDate when lastUpdated is absent (articles without GitHub repos).
      ...(project.createdDate && {
        dateModified: project.lastUpdated ?? project.createdDate,
      }),
      ...(project.wordCount && { wordCount: project.wordCount }),
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
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
    // @id reference connects this page to the canonical entity graph (not a name string).
    author: { "@id": PORTFOLIO_PERSON_ID },
    ...(project.version && { softwareVersion: project.version }),
    // Date signals for AI engine recency scoring (GEO P0).
    ...(project.createdDate && { datePublished: project.createdDate }),
    ...(project.lastUpdated && { dateModified: project.lastUpdated }),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
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
