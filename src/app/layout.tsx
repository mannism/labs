import type { Metadata } from "next";
import { Geist_Mono, Merriweather, Open_Sans, Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import seo from "@/data/seo.json";
import projects from "@/lib/projects";
import { MotionProvider } from "@/components/MotionProvider";

const gaId = process.env.NEXT_PUBLIC_GA_ID;

// Next.js Font Optimization:
// All fonts are downloaded at build time and served from the application origin,
// eliminating external requests to Google Fonts API and improving performance/privacy.
// Primary v2 font is Space Grotesk; legacy fonts (Merriweather, Open Sans) retained for token compat.
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* V2 geometric sans-serif for Speculative Interface direction */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  keywords: seo.keywords,
  authors: [{ name: seo.author }],
  metadataBase: new URL(seo.siteUrl),
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  // Icons auto-detected from src/app/icon.tsx and src/app/apple-icon.tsx (v2 route-based generation)
  openGraph: {
    type: seo.openGraph.type as "website",
    locale: seo.openGraph.locale,
    url: seo.siteUrl,
    siteName: seo.siteName,
    title: seo.title,
    description: seo.description,
    // images omitted — opengraph-image.tsx file convention handles og:image automatically
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    creator: seo.twitterHandle,
    // images omitted — Next.js picks up opengraph-image.tsx for twitter:image automatically
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

/**
 * JSON-LD structured data for search engines and AI crawlers.
 * Graph includes: WebSite, Person (Diana Ismail), and ItemList of projects.
 * Data sourced from seo.json and projects.json — no hardcoded values.
 *
 * Entity graph strategy (GEO P0):
 * Labs is a satellite domain of dianaismail.me. The canonical Person @id lives at
 * the portfolio domain so AI knowledge graphs merge both domains into one entity.
 * The WebSite author and all per-page author fields reference this canonical @id.
 */
const PORTFOLIO_PERSON_ID = "https://dianaismail.me/#person";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${seo.siteUrl}/#website`,
      name: seo.siteName,
      url: seo.siteUrl,
      description: seo.description,
      // @id reference (not name string) connects this site to the canonical entity graph
      author: { "@id": PORTFOLIO_PERSON_ID },
    },
    {
      // Person @id uses portfolio domain — Labs is the same entity, not a separate one.
      // sameAs includes labs.dianaismail.me so AI engines resolve Labs content to this entity.
      "@type": "Person",
      "@id": PORTFOLIO_PERSON_ID,
      name: seo.author,
      url: "https://dianaismail.me",
      jobTitle: "Agentic AI Builder",
      description:
        "Agentic AI builder creating at the intersection of AI, interactive design, and brand experience.",
      sameAs: [
        `https://twitter.com/${seo.twitterHandle.replace("@", "")}`,
        "https://www.linkedin.com/in/dee-ismail/",
        seo.siteUrl,
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${seo.siteUrl}/#projects`,
      name: "Projects",
      numberOfItems: projects.filter((p) => p.display).length,
      itemListElement: projects
        .filter((p) => p.display)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "SoftwareApplication",
            name: p.title,
            description: p.shortDescription,
            applicationCategory: "WebApplication",
            url: p.demoUrl || seo.siteUrl,
          },
        })),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="v2">
      <body
        className={`${merriweather.variable} ${openSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased font-sans`}
        style={{ position: "relative" }}
      >
        {/* Structured data for search engines and AI crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Page content — MotionProvider supplies LazyMotion features to all m.X components */}
        <MotionProvider>
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </MotionProvider>

        {/* Google Analytics — only loads when NEXT_PUBLIC_GA_ID is set */}
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
