import type { MetadataRoute } from "next";
import seo from "@/data/seo.json";
import projectsData from "@/lib/projects";
import experimentsData from "@/data/experiments.json";
import { Project } from "@/types/project";
import { Experiment } from "@/types/experiment";

/**
 * Generates /sitemap.xml via Next.js Metadata Route API.
 * Includes the homepage, all visible project detail pages at /module/[slug],
 * and all experiment pages at /playground/[slug] (GEO P0 — previously absent).
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

  /** Experiment pages — previously absent from sitemap (GEO crawlability gap). */
  const experimentEntries: MetadataRoute.Sitemap = (
    experimentsData as Experiment[]
  ).map((e) => ({
    url: `${seo.siteUrl}/playground/${e.slug}`,
    lastModified: new Date(e.createdAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: seo.siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...projectEntries,
    ...experimentEntries,
  ];
}
