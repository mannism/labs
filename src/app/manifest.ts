import type { MetadataRoute } from "next";
import seo from "@/data/seo.json";

/**
 * Generates /manifest.json via Next.js Metadata Route API.
 * Provides PWA metadata and discoverability signals for browsers and search engines.
 * Background and theme colors match globals.css --bg-primary and --accent-blue.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: seo.siteName,
    short_name: "Diana Labs",
    description: seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#3b82f6",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
