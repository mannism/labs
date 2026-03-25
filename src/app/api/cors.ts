/**
 * CORS header utility for the Digital Twin API routes.
 *
 * Mirrors the policy from telegram-digital-twin/main.py:
 *   - All *.dianaismail.me subdomains (production sites)
 *   - localhost on any port (local development)
 *   - Same-origin requests (no Origin header) pass through without CORS headers
 *
 * This enables the ChatWidget to be hosted on any *.dianaismail.me site and
 * point its NEXT_PUBLIC_CHAT_API_URL at the Labs server.
 */

const ALLOWED_ORIGIN_RE = /^https?:\/\/(localhost:\d+|.*\.dianaismail\.me)$/;

/**
 * Returns CORS headers for the given request Origin.
 * If the origin is not allowed, Access-Control-Allow-Origin is set to "" (effectively denied).
 */
export function corsHeaders(origin: string | null): HeadersInit {
    const allowed = origin && ALLOWED_ORIGIN_RE.test(origin) ? origin : "";
    return {
        "Access-Control-Allow-Origin":  allowed,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

/**
 * Standard OPTIONS preflight response (204 No Content).
 */
export function corsPreflightResponse(origin: string | null): Response {
    return new Response(null, {
        status:  204,
        headers: corsHeaders(origin),
    });
}
