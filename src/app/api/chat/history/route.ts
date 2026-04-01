/**
 * GET /api/chat/history?session_id=xxx — Returns conversation history for a session.
 *
 * Used by the portfolio ChatWidget to restore previous messages on mount,
 * enabling a continuous conversation across the floating widget and the
 * embedded Ask Diana page.
 *
 * Response: { messages: Array<{ role: "user" | "assistant"; content: string }> }
 */

import { NextRequest } from "next/server";
import { getChatHistory } from "@/lib/twin/memory";
import { corsHeaders, corsPreflightResponse } from "@/app/api/cors";

export function OPTIONS(req: NextRequest): Response {
    return corsPreflightResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest): Promise<Response> {
    const origin = req.headers.get("origin");
    const sessionId = req.nextUrl.searchParams.get("session_id");

    if (!sessionId || !sessionId.trim()) {
        return Response.json(
            { error: "session_id is required" },
            { status: 400, headers: corsHeaders(origin) }
        );
    }

    try {
        const history = await getChatHistory(sessionId.trim());
        return Response.json(
            { messages: history.messages },
            { headers: corsHeaders(origin) }
        );
    } catch (err) {
        console.error("[chat/history] error:", (err as Error).message);
        return Response.json(
            { error: "Failed to retrieve history" },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
