import type { MetadataRoute } from "next";
import seo from "@/data/seo.json";

/**
 * Generates /sitemap.xml via Next.js Metadata Route API.
 * Single-URL sitemap for this one-page app.
 * Submit to Google Search Console at: https://search.google.com/search-console
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: seo.siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
