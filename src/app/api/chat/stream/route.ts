/**
 * POST /api/chat/stream — SSE streaming endpoint for the Digital Twin chat engine.
 *
 * Request body: { session_id: string; text: string }
 * Response:     text/event-stream with SSE events:
 *   data: {"type":"chunk","text":"..."}   — incremental token
 *   data: {"type":"done"}                 — stream complete
 *   data: {"type":"error","text":"..."}   — engine-level error
 */

import { NextRequest }                          from "next/server";
import { processUserMessageStream }             from "@/lib/twin/engine";
import { MSG_TOO_LONG }                         from "@/lib/twin/messages";
import { corsHeaders, corsPreflightResponse }   from "@/app/api/cors";

const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || "4000", 10);

export function OPTIONS(req: NextRequest): Response {
    return corsPreflightResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest): Promise<Response> {
    const origin = req.headers.get("origin");

    // Parse and validate request body
    let sessionId: string;
    let text: string;
    try {
        const body = await req.json() as { session_id?: unknown; text?: unknown };
        if (typeof body.session_id !== "string" || !body.session_id.trim()) {
            return Response.json({ error: "session_id is required" }, { status: 400, headers: corsHeaders(origin) });
        }
        if (typeof body.text !== "string" || !body.text.trim()) {
            return Response.json({ error: "text is required" }, { status: 400, headers: corsHeaders(origin) });
        }
        sessionId = body.session_id.trim();
        text      = body.text.trim();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders(origin) });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
        const errPayload = `data: ${JSON.stringify({ type: "error", text: MSG_TOO_LONG })}\n\n`;
        return new Response(errPayload, {
            headers: {
                "Content-Type":     "text/event-stream",
                "Cache-Control":    "no-cache",
                "X-Accel-Buffering": "no",
                ...corsHeaders(origin),
            },
        });
    }

    // Pipe the async generator into a ReadableStream
    const generator = processUserMessageStream(sessionId, text, "web");
    const stream    = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of generator) {
                    controller.enqueue(encoder.encode(chunk));
                }
            } catch (err) {
                console.error("[api/chat/stream] unhandled error:", err);
                const errChunk = `data: ${JSON.stringify({ type: "error", text: "An unexpected error occurred." })}\n\n`;
                controller.enqueue(encoder.encode(errChunk));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type":      "text/event-stream",
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            ...corsHeaders(origin),
        },
    });
}
