import type { MetadataRoute } from "next";
import seo from "@/data/seo.json";

/**
 * Generates /manifest.json via Next.js Metadata Route API.
 * Provides PWA metadata and discoverability signals for browsers and search engines.
 * Background and theme colors match v2 Speculative Interface direction.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: seo.siteName,
    short_name: "Diana Labs",
    description: seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#1A1D23",
    theme_color: "#C8FF00",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
