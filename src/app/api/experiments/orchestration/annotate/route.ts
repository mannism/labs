/**
 * POST /api/experiments/orchestration/annotate
 *
 * Shared annotation endpoint for EXP_007 (ADK Visualizer) and EXP_008
 * (Agent Orchestration Map). Accepts a selected diagram element and streams
 * an architectural explanation back as SSE.
 *
 * Request body:
 *   { elementType: 'node' | 'edge', elementData: object, contextPrompt?: string }
 *
 * Response (Content-Type: text/event-stream):
 *   event: chunk   — { text: string }   streaming token text
 *   event: done    — {}                 stream complete
 *   event: error   — { message: string } safe error description
 *
 * Error responses (non-stream):
 *   400  { error: string }   — Zod validation failure
 *   500  { error: string }   — unexpected server error before stream starts
 *
 * Design notes:
 *   - max_tokens is capped at 300. The system prompt enforces exactly 3 sentences
 *     (~100-150 tokens), so 300 is a generous safety ceiling.
 *   - The stream fails closed: if Anthropic throws after the stream has opened,
 *     an error SSE event is sent before closing, so the client always receives
 *     a terminal event.
 *   - No Redis dependency — this is a stateless request/response pattern. Each
 *     POST is independent; history is not maintained between calls.
 *   - Rate limiting is intentionally deferred to a future PR. The endpoint is
 *     not publicly exposed in the nav and both experiments gate usage on the
 *     client side. Add IP-based rate limiting before any public launch.
 */

import { NextRequest }                     from "next/server";
import { z }                               from "zod";
import Anthropic                           from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } from "@/lib/experiments/config";
import {
    buildAnnotationPrompt,
    type NodeElementData,
    type EdgeElementData,
} from "@/lib/prompts/orchestrationAnnotation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOKENS = 300;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

/**
 * elementData is validated as a non-null object at the boundary.
 * Downstream code (buildAnnotationPrompt) reads specific fields from it —
 * the prompt builder tolerates missing optional fields gracefully. We keep
 * the schema open (z.record) rather than duplicating the NodeElementData /
 * EdgeElementData shape here to allow EXP_007 and EXP_008 to pass different
 * field sets without a breaking schema change.
 */
const AnnotateRequestSchema = z.object({
    elementType: z.enum(["node", "edge"], {
        error: "elementType must be 'node' or 'edge'",
    }),
    elementData: z
        .record(z.string(), z.unknown())
        .refine(
            (obj) => typeof obj["label"] === "string" && obj["label"].trim().length > 0,
            { message: "elementData.label is required and must be a non-empty string" }
        ),
    contextPrompt: z.string().trim().max(2000).optional(),
});

type AnnotateRequest = z.infer<typeof AnnotateRequestSchema>;

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

/** Formats a named SSE event frame. */
function sseEvent(event: string, data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ---------------------------------------------------------------------------
// Anthropic client — module-level singleton
// ---------------------------------------------------------------------------

/**
 * Instantiated once at module load. Reused across requests in the same
 * Next.js server process. The SDK handles connection pooling internally.
 * Fails fast at construction if ANTHROPIC_API_KEY is empty (caught by the
 * route handler's outer try/catch and surfaced as a 500).
 */
function getAnthropicClient(): Anthropic {
    if (!ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
    // --- 1. Parse JSON body ---
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // --- 2. Validate ---
    const parsed = AnnotateRequestSchema.safeParse(body);
    if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        return Response.json(
            { error: firstIssue?.message ?? "Invalid request body" },
            { status: 400 }
        );
    }

    const { elementType, elementData, contextPrompt }: AnnotateRequest = parsed.data;

    // --- 3. Build prompt ---
    // Cast elementData to the appropriate shape. The Zod schema guarantees
    // `label` is a non-empty string; the prompt builder reads additional
    // fields defensively and substitutes empty strings for missing ones.
    const typedElementData = elementData as unknown as NodeElementData | EdgeElementData;
    const { system, user } = buildAnnotationPrompt(elementType, typedElementData, contextPrompt);

    // --- 4. Create Anthropic client (throws if key is missing) ---
    let anthropic: Anthropic;
    try {
        anthropic = getAnthropicClient();
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[api/orchestration/annotate] Anthropic client init failed:", message);
        return Response.json(
            { error: "Annotation service is unavailable. Please try again later." },
            { status: 500 }
        );
    }

    // --- 5. Open SSE stream ---
    const stream = new ReadableStream({
        async start(controller) {
            // Log request metadata — never logs API key or user-supplied content
            const requestMeta = {
                elementType,
                model: ANTHROPIC_MODEL,
                maxTokens: MAX_TOKENS,
                hasContextPrompt: Boolean(contextPrompt),
            };
            console.log("[api/orchestration/annotate] request started", requestMeta);

            const startedAt = Date.now();
            let promptTokens = 0;
            let completionTokens = 0;

            try {
                // Stream completion from Anthropic
                const anthropicStream = anthropic.messages.stream({
                    model:      ANTHROPIC_MODEL,
                    max_tokens: MAX_TOKENS,
                    system,
                    messages: [{ role: "user", content: user }],
                });

                // Forward each text delta as a `chunk` SSE event
                anthropicStream.on("text", (text: string) => {
                    try {
                        controller.enqueue(sseEvent("chunk", { text }));
                    } catch {
                        // Controller closed mid-stream (client disconnected) — stop
                        anthropicStream.abort();
                    }
                });

                // Wait for the stream to complete and capture usage
                const finalMessage = await anthropicStream.finalMessage();
                promptTokens     = finalMessage.usage.input_tokens;
                completionTokens = finalMessage.usage.output_tokens;

                // Emit `done` event and close
                try {
                    controller.enqueue(sseEvent("done", {}));
                } catch {
                    // Controller closed between last chunk and done — acceptable
                }
                controller.close();

            } catch (err) {
                // Anthropic call failed after stream opened — emit safe error event
                const message =
                    err instanceof Anthropic.APIError
                        ? `Anthropic API error (${err.status})`
                        : "Failed to generate annotation";

                console.error(
                    "[api/orchestration/annotate] stream error:",
                    err instanceof Error ? err.message : String(err)
                );

                try {
                    controller.enqueue(sseEvent("error", { message }));
                } catch {
                    // Controller already closed — nothing to do
                }
                try {
                    controller.close();
                } catch {
                    // Already closed
                }
            } finally {
                // Structured log: always emitted, whether success or failure
                const latencyMs = Date.now() - startedAt;
                console.log("[api/orchestration/annotate] request complete", {
                    elementType,
                    model:            ANTHROPIC_MODEL,
                    promptTokens,
                    completionTokens,
                    latencyMs,
                    // Cost estimate: Haiku 4.5 pricing (input $0.80/M, output $4.00/M)
                    estimatedCostUsd: (
                        (promptTokens / 1_000_000) * 0.80 +
                        (completionTokens / 1_000_000) * 4.00
                    ).toFixed(6),
                });
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type":      "text/event-stream",
            "Cache-Control":     "no-cache",
            "Connection":        "keep-alive",
            "X-Accel-Buffering": "no", // Disable Nginx buffering for SSE
        },
    });
}
