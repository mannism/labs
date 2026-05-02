import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Security response headers — applied to every route
  async headers() {
    /** Shared security headers used by all routes. */
    const sharedHeaders = [
      // Enforce HTTPS for 2 years, include subdomains
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      // Prevent MIME-type sniffing
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      // Block the page from being embedded in iframes (clickjacking)
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      // Control referrer information sent with requests
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
    ];

    return [
      // Static assets under /public/ that are stable and safe to cache indefinitely.
      // Cache-Control is set here; security headers still apply via the broader source
      // entries below — Next.js merges headers from all matching sources.
      //
      // /experiment-previews/*.webm — video preview files; filenames are stable per
      //   slug. If a capture is re-recorded the file is overwritten at the same path,
      //   so a browser may serve the old copy until the 1-year TTL expires. Rename the
      //   file (e.g. voice-particles-v2.webm) to bust the cache early if needed.
      // /fonts/*.ttf — self-hosted fonts; never change in place without a rename.
      {
        source: "/experiment-previews/:file*.webm",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Playground routes — microphone enabled, worker-src allows blob: for Three.js
      {
        source: "/playground/:path*",
        headers: [
          ...sharedHeaders,
          // Allow microphone access for audio-driven experiments
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          // Extended CSP: worker-src blob: for Three.js internal workers
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; connect-src 'self' https://*.dianaismail.me https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
          },
        ],
      },
      // All other routes — strict permissions policy (excludes /playground/ which has its own headers above)
      {
        source: "/((?!playground).*)",
        headers: [
          ...sharedHeaders,
          // Disable permission-sensitive browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Controlling the origin of content that can be loaded on the page
          // connect-src allows client-side fetch to dianaismail.me subdomains for live status pings
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; connect-src 'self' https://*.dianaismail.me https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
