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
      // Experiment routes — microphone enabled, worker-src allows blob: for Three.js
      {
        source: "/experiments/:path*",
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
      // All other routes — strict permissions policy
      {
        source: "/(.*)",
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
