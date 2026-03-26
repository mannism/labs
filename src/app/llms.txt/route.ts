import { NextResponse } from "next/server";
import seo from "@/data/seo.json";
import projects from "@/data/projects.json";

/**
 * Serves /llms.txt — an AI-crawler-readable plain-text description of this site.
 * Based on the llms.txt standard (https://llmstxt.org).
 * All content derived from seo.json and projects.json — no hardcoded values.
 */
export function GET() {
  const projectLines = projects
    .filter((p) => p.display)
    .sort((a, b) => a.order - b.order)
    .map((p) => `- ${p.title}: ${p.shortDescription}`)
    .join("\n");

  const body = [
    `# ${seo.siteName}`,
    ``,
    `> ${seo.description}`,
    ``,
    `## Projects`,
    ``,
    projectLines,
    ``,
    `## Contact`,
    ``,
    `- Site: ${seo.siteUrl}`,
    `- Twitter: ${seo.twitterHandle}`,
  ].join("\n");

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
