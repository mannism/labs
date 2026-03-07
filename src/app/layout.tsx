import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistMono.variable} antialiased`}
        style={{ position: "relative" }}
      >
        {/* Fixed decorative background orbs — matches twin site aesthetic */}
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
