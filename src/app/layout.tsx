import type { Metadata } from "next";
import { Geist_Mono, Merriweather, Open_Sans } from "next/font/google";
import "./globals.css";

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
  title: "Labs | Diana Ismail",
  description: "Just scratching an itch, the random projects by Diana Ismail.",
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
