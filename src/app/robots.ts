import type { MetadataRoute } from "next";
import seo from "@/data/seo.json";

/**
 * Generates /robots.txt via Next.js Metadata Route API.
 * Allows all crawlers (Googlebot, GPTBot, PerplexityBot, ClaudeBot, etc.)
 * and disallows API routes, which are not useful to search engines.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    sitemap: `${seo.siteUrl}/sitemap.xml`,
    host: seo.siteUrl,
  };
}
