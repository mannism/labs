/**
 * POST /api/experiments/orchestration/annotate
 *
 * Shared annotation endpoint for EXP_007 (ADK Visualizer) and EXP_008
 * (Agent Orchestration Map). Accepts a selected diagram element and streams
 * an architectural explanation back as SSE.
 *
 * Uses OpenAI (gpt-5.4-nano) for cost efficiency — the prompt is simple
 * (3 sentences) and any capable model handles it well.
 *
 * Request body:
 *   { elementType: 'node' | 'edge', elementData: object, contextPrompt?: string }
 *
 * Response (Content-Type: text/event-stream):
 *   event: chunk   — { text: string }   streaming token text
 *   event: done    — {}                 stream complete
 *   event: error   — { message: string } safe error description
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/lib/twin/config";
import {
    buildAnnotationPrompt,
    type NodeElementData,
    type EdgeElementData,
} from "@/lib/prompts/orchestrationAnnotation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = "gpt-5.4-nano";
const MAX_TOKENS = 300;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

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

function sseEvent(event: string, data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ---------------------------------------------------------------------------
// OpenAI client — module-level singleton
// ---------------------------------------------------------------------------

function getOpenAIClient(): OpenAI {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
    }
    return new OpenAI({ apiKey: OPENAI_API_KEY });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = AnnotateRequestSchema.safeParse(body);
    if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        return Response.json(
            { error: firstIssue?.message ?? "Invalid request body" },
            { status: 400 }
        );
    }

    const { elementType, elementData, contextPrompt }: AnnotateRequest = parsed.data;

    const typedElementData = elementData as unknown as NodeElementData | EdgeElementData;
    const { system, user } = buildAnnotationPrompt(elementType, typedElementData, contextPrompt);

    let openai: OpenAI;
    try {
        openai = getOpenAIClient();
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[api/orchestration/annotate] OpenAI client init failed:", message);
        return Response.json(
            { error: "Annotation service is unavailable. Please try again later." },
            { status: 500 }
        );
    }

    const stream = new ReadableStream({
        async start(controller) {
            console.log("[api/orchestration/annotate] request started", {
                elementType,
                model: MODEL,
                maxTokens: MAX_TOKENS,
                hasContextPrompt: Boolean(contextPrompt),
            });

            const startedAt = Date.now();
            let promptTokens = 0;
            let completionTokens = 0;

            try {
                const openaiStream = await openai.chat.completions.create({
                    model: MODEL,
                    max_completion_tokens: MAX_TOKENS,
                    stream: true,
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                });

                for await (const chunk of openaiStream) {
                    const delta = chunk.choices[0]?.delta?.content;
                    if (delta) {
                        try {
                            controller.enqueue(sseEvent("chunk", { text: delta }));
                        } catch {
                            break;
                        }
                    }

                    if (chunk.usage) {
                        promptTokens = chunk.usage.prompt_tokens;
                        completionTokens = chunk.usage.completion_tokens;
                    }
                }

                try {
                    controller.enqueue(sseEvent("done", {}));
                } catch {
                    // Controller closed
                }
                controller.close();

            } catch (err) {
                const message =
                    err instanceof OpenAI.APIError
                        ? `OpenAI API error (${err.status})`
                        : "Failed to generate annotation";

                console.error(
                    "[api/orchestration/annotate] stream error:",
                    err instanceof Error ? err.message : String(err)
                );

                try {
                    controller.enqueue(sseEvent("error", { message }));
                } catch {
                    // Already closed
                }
                try {
                    controller.close();
                } catch {
                    // Already closed
                }
            } finally {
                const latencyMs = Date.now() - startedAt;
                console.log("[api/orchestration/annotate] request complete", {
                    elementType,
                    model: MODEL,
                    promptTokens,
                    completionTokens,
                    latencyMs,
                });
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
