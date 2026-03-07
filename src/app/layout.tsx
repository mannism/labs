import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Configure default Sans font
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Configure default Mono font mapping for tech accents
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Global static metadata for SEO and tab titles
export const metadata: Metadata = {
  title: "Labs | Diana Ismail",
  description: "Just scratching an itch, the random projects by Diana Ismail.",
};

/**
 * Root Layout defining the base HTML structure.
 * Applies the dark theme configuration and injects global CSS variables.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Defaulting to "dark" class as part of the Agent-first UI aesthetic
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-50 selection:bg-neutral-800 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
