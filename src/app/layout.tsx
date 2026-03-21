import type { Metadata } from "next";
import { Geist_Mono, Merriweather, Open_Sans } from "next/font/google";
import "./globals.css";
import seo from "@/data/seo.json";

// Next.js Font Optimization:
// These fonts are downloaded at build time and served from the application origin,
// eliminating external requests to Google Fonts API and improving performance/privacy.
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

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  keywords: seo.keywords,
  authors: [{ name: seo.author }],
  metadataBase: new URL(seo.siteUrl),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome", url: "/android-chrome-192x192.png", sizes: "192x192" },
    ],
  },
  openGraph: {
    type: seo.openGraph.type as "website",
    locale: seo.openGraph.locale,
    url: seo.siteUrl,
    siteName: seo.siteName,
    title: seo.title,
    description: seo.description,
    images: [
      {
        url: seo.openGraph.imageUrl,
        width: seo.openGraph.imageWidth,
        height: seo.openGraph.imageHeight,
        alt: seo.openGraph.imageAlt,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: seo.title,
    description: seo.description,
    creator: seo.twitterHandle,
    images: [seo.openGraph.imageUrl],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${merriweather.variable} ${openSans.variable} ${geistMono.variable} antialiased font-sans`}
        style={{ position: "relative" }}
      >
        {/* Fixed decorative background orbs */}
        <div className="bg-orbs" aria-hidden="true">
          <div className="bg-orb bg-orb-blue" />
          <div className="bg-orb bg-orb-purple" />
        </div>

        {/* Page content layered above orbs */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
