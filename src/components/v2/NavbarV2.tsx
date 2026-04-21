"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import packageJson from "../../../package.json";

/**
 * NavbarV2 — Speculative Interface top navigation.
 * "L A B S" letterspaced logo left, "PLAYGROUND" + "PORTFOLIO" links right.
 * Chartreuse 2px top accent line. Clean white surface, no glassmorphism.
 * Version badge in monospace. All text is uppercase for clinical feel.
 * Active route (e.g. /playground) gets a chartreuse underline.
 */
export function NavbarV2() {
  const pathname = usePathname();
  const isExperimentsActive = pathname?.startsWith("/playground");

  /* Auto-hide on scroll: hide when scrolling down, show when scrolling up.
     Always visible near the top of the page (< 60px). Uses a 10px delta
     threshold to ignore micro-scrolls from touch inertia or rounding. */
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const SCROLL_DELTA_THRESHOLD = 10;
    const TOP_THRESHOLD = 60;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY < TOP_THRESHOLD) {
        setHidden(false);
      } else if (currentY - lastScrollY.current > SCROLL_DELTA_THRESHOLD) {
        setHidden(true);
      } else if (lastScrollY.current - currentY > SCROLL_DELTA_THRESHOLD) {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      style={{
        /* Sticky positioning — stays visible on scroll. z-index 40 keeps it
           below the ChatWidget (z-index 45) but above page content. */
        position: "sticky",
        top: 0,
        zIndex: 40,
        /* WCAG: purely decorative accent line — no information conveyed. Exempt per 1.4.11. */
        borderTop: "2px solid var(--v2-accent)",
        borderBottom: "1px solid var(--v2-border)",
        background: "var(--v2-bg-surface)",
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.3s ease",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: logo + version + breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            style={{
              fontFamily: "var(--v2-font-display)",
              fontSize: "var(--v2-font-size-base)",
              fontWeight: 700,
              letterSpacing: "var(--v2-letter-spacing-wide)",
              color: "var(--v2-text-primary)",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            L A B S
          </Link>
          {/* Version — part of the identity block, hidden on small mobile */}
          <span
            className="hidden sm:inline"
            suppressHydrationWarning
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-sm)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.02em",
            }}
          >
            v{packageJson.version}
          </span>
          {/* Breadcrumb — hidden on mobile (redundant with HeroV2) */}
          <span
            className="hidden md:inline"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-sm)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.04em",
            }}
          >
            {"// SYSTEM.USER.DIANA_ISMAIL"}
          </span>
        </div>

        {/* Right: experiments + portfolio links */}
        <div className="flex items-center gap-6">
          <Link
            href="/playground"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-sm)",
              fontWeight: 500,
              color: isExperimentsActive
                ? "var(--v2-text-primary)"
                : "var(--v2-text-secondary)",
              textDecoration: "none",
              transition: "color 0.2s ease",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              borderBottom: isExperimentsActive
                ? "2px solid var(--v2-accent)"
                : "2px solid transparent",
              paddingBottom: "2px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--v2-text-primary)")
            }
            onMouseLeave={(e) => {
              if (!isExperimentsActive) {
                e.currentTarget.style.color = "var(--v2-text-secondary)";
              }
            }}
          >
            PLAYGROUND
          </Link>
          <a
            href="https://dianaismail.me"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-sm)",
              fontWeight: 500,
              color: "var(--v2-text-secondary)",
              textDecoration: "none",
              transition: "color 0.2s ease",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              paddingBottom: "2px",
              borderBottom: "2px solid transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--v2-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--v2-text-secondary)")}
          >
            PORTFOLIO &rarr;
          </a>
        </div>
      </div>
    </nav>
  );
}
