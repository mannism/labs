import type { MetadataRoute } from "next";
import seo from "@/data/seo.json";
import projectsData from "@/data/projects.json";
import { Project } from "@/types/project";

/**
 * Generates /sitemap.xml via Next.js Metadata Route API.
 * Includes the homepage and all visible project detail pages at /module/[slug].
 * Submit to Google Search Console at: https://search.google.com/search-console
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const visibleProjects = (projectsData as Project[]).filter(
    (p) => p.display !== false
  );

  /** Project detail pages — one entry per visible project */
  const projectEntries: MetadataRoute.Sitemap = visibleProjects.map((p) => ({
    url: `${seo.siteUrl}/module/${p.slug}`,
    lastModified: p.lastUpdated ? new Date(p.lastUpdated) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: seo.siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...projectEntries,
  ];
}
