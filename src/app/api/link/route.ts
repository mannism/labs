/**
 * POST /api/link — OTP verification for linking a web session to a Telegram chat.
 *
 * Request body: { code: string }
 * Response:     { success: boolean; linked_session_id?: string; message: string }
 *
 * The response shape matches exactly what ChatWidget.tsx parses at the link handler.
 * Port of telegram-digital-twin/app/interfaces/web/router.py link endpoint.
 */

import { NextRequest }                        from "next/server";
import { checkOtpRateLimit, verifyPairingCode } from "@/lib/twin/memory";
import { MSG_LINK_SUCCESS, MSG_LINK_INVALID, MSG_OTP_RATE_LIMITED } from "@/lib/twin/messages";
import { corsHeaders, corsPreflightResponse } from "@/app/api/cors";

interface LinkResponseBody {
    success:           boolean;
    linked_session_id?: string;
    message:           string;
}

export function OPTIONS(req: NextRequest): Response {
    return corsPreflightResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest): Promise<Response> {
    const origin = req.headers.get("origin");

    // Parse and validate request body
    let code: string;
    try {
        const body = await req.json() as { code?: unknown };
        if (typeof body.code !== "string" || !body.code.trim()) {
            return Response.json(
                { success: false, message: MSG_LINK_INVALID } satisfies LinkResponseBody,
                { status: 400, headers: corsHeaders(origin) }
            );
        }
        code = body.code.trim();
    } catch {
        return Response.json(
            { success: false, message: MSG_LINK_INVALID } satisfies LinkResponseBody,
            { status: 400, headers: corsHeaders(origin) }
        );
    }

    // OTP rate limit by client IP (fail open if header is absent)
    const ip      = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const allowed = await checkOtpRateLimit(ip);
    if (!allowed) {
        return Response.json(
            { success: false, message: MSG_OTP_RATE_LIMITED } satisfies LinkResponseBody,
            { status: 429, headers: corsHeaders(origin) }
        );
    }

    // Verify the pairing code
    const linkedSessionId = await verifyPairingCode(code);
    if (!linkedSessionId) {
        return Response.json(
            { success: false, message: MSG_LINK_INVALID } satisfies LinkResponseBody,
            { status: 200, headers: corsHeaders(origin) }
        );
    }

    return Response.json(
        { success: true, linked_session_id: linkedSessionId, message: MSG_LINK_SUCCESS } satisfies LinkResponseBody,
        { status: 200, headers: corsHeaders(origin) }
    );
}
