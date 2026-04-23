/**
 * POST /api/experiments/generative-ui/render
 *
 * Streams a UICanvas from Claude Haiku, emitting each completed block as an
 * SSE event as soon as it closes in the LLM response stream.
 *
 * ## Request
 *   Body: { prompt: string }  — max 200 characters, Zod validated
 *
 * ## SSE event types (wire format: `data: <JSON>\n\n`)
 *   block        — { type: "block",        block: UIBlock }
 *   canvas_done  — { type: "canvas_done",  theme?: string }
 *   canvas_error — { type: "canvas_error", message: string }
 *
 * ## Incremental block extraction algorithm
 *   The LLM emits a single UICanvas JSON object. We cannot wait for the full
 *   response before rendering because that removes the streaming benefit.
 *
 *   Strategy: character-level depth tracking.
 *     1. Accumulate streamed text in a running buffer.
 *     2. Track parse state: BEFORE_BLOCKS_ARRAY → INSIDE_BLOCKS_ARRAY →
 *        INSIDE_BLOCK → DONE.
 *     3. Once we detect `"blocks":[` in the buffer, flip to INSIDE_BLOCKS_ARRAY.
 *     4. Each `{` at depth 0 (relative to the array) opens a new block buffer.
 *        Increment depth. Each subsequent `{` increments depth. Each `}` decrements
 *        depth. When depth returns to 0, the block object is complete — extract it.
 *     5. Zod-validate the candidate block. Valid → emit `block` SSE event.
 *        Invalid → emit `canvas_error` SSE event with a safe message (no raw Zod
 *        error in the wire payload — those go to server logs only).
 *     6. After the stream ends, scan the full buffer for `"theme":"..."` and emit
 *        canvas_done with the resolved theme.
 *
 * ## Failure modes
 *   - Anthropic 4xx/5xx: canvas_error emitted, stream closes.
 *   - JSON parse error on a block candidate: canvas_error emitted for that block,
 *     stream continues (remaining blocks may still be valid).
 *   - Zod validation failure on a block: canvas_error emitted, stream continues.
 *   - Full response is not parseable as UICanvas: canvas_error emitted at the end.
 *   - Missing ANTHROPIC_API_KEY: canvas_error emitted immediately.
 */

import { NextRequest }               from "next/server";
import { z }                         from "zod";
import Anthropic                     from "@anthropic-ai/sdk";
import {
    UIBlockSchema,
    type UICanvasSSEEvent,
    type UIBlock,
    type UICanvas,
}                                    from "@/lib/schemas/uiBlocks";
import {
    GENERATIVE_UI_SYSTEM_PROMPT,
    buildGenerativeUIUserMessage,
}                                    from "@/lib/prompts/generativeUI";
import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } from "@/lib/experiments/config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum characters in the user prompt. */
const PROMPT_MAX_LENGTH = 200;

/** Maximum tokens the model may generate. */
const MAX_TOKENS = 1500;

/** SSE heartbeat comment — keeps proxies from closing idle connections. */
const SSE_HEARTBEAT = ": heartbeat\n\n";

/** Heartbeat interval in ms. Proxies typically time out at 30 s. */
const HEARTBEAT_INTERVAL_MS = 25_000;

// ---------------------------------------------------------------------------
// Request validation schema
// ---------------------------------------------------------------------------

const RenderRequestSchema = z.object({
    prompt: z
        .string()
        .trim()
        .min(1, "prompt is required")
        .max(PROMPT_MAX_LENGTH, `prompt must be at most ${PROMPT_MAX_LENGTH} characters`),
});

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

/** Encodes a UICanvasSSEEvent as an SSE data frame. */
function sseEvent(event: UICanvasSSEEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

// ---------------------------------------------------------------------------
// JSON code-fence stripper
//
// The LLM occasionally wraps its response in ```json ... ``` despite
// instructions. Strip those fences before attempting to parse.
// ---------------------------------------------------------------------------

function stripCodeFences(text: string): string {
    // Match optional language tag after opening fence
    return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

// ---------------------------------------------------------------------------
// Theme extractor
//
// Scans the raw buffer for a "theme" property after streaming completes.
// Returns undefined if the property is absent or its value is not a known theme.
// ---------------------------------------------------------------------------

const KNOWN_THEMES = new Set<string>(["default", "dark", "minimal"]);

function extractTheme(raw: string): UICanvas["theme"] {
    // Match `"theme":"value"` with optional whitespace around the colon
    const match = raw.match(/"theme"\s*:\s*"([^"]+)"/);
    if (!match) return undefined;
    const candidate = match[1];
    return KNOWN_THEMES.has(candidate) ? (candidate as UICanvas["theme"]) : undefined;
}

// ---------------------------------------------------------------------------
// Incremental block extractor
//
// Stateful class — one instance per request. Accepts streamed text chunks and
// emits complete UIBlock JSON strings as each block closes.
//
// State machine:
//   BEFORE_BLOCKS_ARRAY  — waiting for `"blocks":[` to appear in the buffer
//   INSIDE_BLOCKS_ARRAY  — between blocks (depth === 0 relative to array)
//   INSIDE_BLOCK         — accumulating characters for a single block (depth >= 1)
//   DONE                 — the blocks array has closed; ignore further input
// ---------------------------------------------------------------------------

type ExtractorState =
    | "BEFORE_BLOCKS_ARRAY"
    | "INSIDE_BLOCKS_ARRAY"
    | "INSIDE_BLOCK"
    | "DONE";

class BlockExtractor {
    private state: ExtractorState = "BEFORE_BLOCKS_ARRAY";

    /** Full accumulated text across all chunks. Used for post-stream theme extraction. */
    private fullBuffer = "";

    /** Accumulates characters for the block currently being parsed. */
    private blockBuffer = "";

    /** Brace depth relative to the start of the current block. */
    private depth = 0;

    /** Whether we are currently inside a JSON string (skip brace counting). */
    private inString = false;

    /** Whether the previous character was a backslash (escape handling in strings). */
    private escaped = false;

    /**
     * Feed a new chunk of streamed text.
     * Returns an array of raw JSON strings, one per complete block found in this chunk.
     */
    ingest(chunk: string): string[] {
        this.fullBuffer += chunk;
        const completedBlocks: string[] = [];

        for (const char of chunk) {
            switch (this.state) {

                case "BEFORE_BLOCKS_ARRAY":
                    // Wait until we see `"blocks":` followed by `[` in fullBuffer.
                    // We do not track individual chars here — just check after each chunk.
                    if (this.fullBuffer.includes('"blocks"') && this.fullBuffer.includes('[')) {
                        // Find the position of the `[` that opens the blocks array.
                        // This fires once; subsequent chars are handled by INSIDE_BLOCKS_ARRAY.
                        const blocksMarker = this.fullBuffer.lastIndexOf('"blocks"');
                        const bracketPos   = this.fullBuffer.indexOf('[', blocksMarker);
                        if (bracketPos !== -1) {
                            this.state = "INSIDE_BLOCKS_ARRAY";
                        }
                    }
                    break;

                case "INSIDE_BLOCKS_ARRAY":
                    if (char === '{') {
                        // Opening brace of a new block — start accumulating
                        this.state       = "INSIDE_BLOCK";
                        this.blockBuffer = char;
                        this.depth       = 1;
                        this.inString    = false;
                        this.escaped     = false;
                    } else if (char === ']') {
                        // The blocks array has closed
                        this.state = "DONE";
                    }
                    // Commas, whitespace, etc. between blocks are ignored here
                    break;

                case "INSIDE_BLOCK":
                    this.blockBuffer += char;
                    this.trackDepth(char);
                    if (this.depth === 0) {
                        // Block is complete
                        completedBlocks.push(this.blockBuffer);
                        this.blockBuffer = "";
                        this.state       = "INSIDE_BLOCKS_ARRAY";
                    }
                    break;

                case "DONE":
                    // Ignore remaining characters (canvas closing brace, etc.)
                    break;
            }

            // Safety re-check for BEFORE_BLOCKS_ARRAY transition: we rely on
            // the fullBuffer check within the loop iteration so we don't need
            // to do it again here.
        }

        return completedBlocks;
    }

    /** Returns the full accumulated buffer (for theme extraction after streaming). */
    getFullBuffer(): string {
        return this.fullBuffer;
    }

    /**
     * Updates `inString` and `depth` for a single character.
     * Called only while state === INSIDE_BLOCK.
     */
    private trackDepth(char: string): void {
        if (this.escaped) {
            // This char is escaped — skip brace/quote logic
            this.escaped = false;
            return;
        }

        if (char === '\\' && this.inString) {
            this.escaped = true;
            return;
        }

        if (char === '"') {
            this.inString = !this.inString;
            return;
        }

        // Only count braces outside of strings
        if (!this.inString) {
            if (char === '{') this.depth++;
            else if (char === '}') this.depth--;
        }
    }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {

    // Guard: API key must be set before touching the Anthropic client
    if (!ANTHROPIC_API_KEY) {
        console.error("[api/generative-ui/render] ANTHROPIC_API_KEY is not set");
        const event: UICanvasSSEEvent = {
            type:    "canvas_error",
            message: "Service configuration error. Please contact support.",
        };
        // Return a minimal SSE stream with the single error event so the client
        // can handle it uniformly without special-casing HTTP error status codes.
        const body = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
        return new Response(body, {
            status:  200,
            headers: sseHeaders(),
        });
    }

    // Parse and validate request body
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RenderRequestSchema.safeParse(body);
    if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        return Response.json(
            { error: firstIssue?.message ?? "Invalid request body" },
            { status: 400 }
        );
    }

    const { prompt } = parsed.data;

    // Build the stream — all LLM interaction happens inside ReadableStream.start()
    const stream = new ReadableStream({
        async start(controller) {
            const client     = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
            const extractor  = new BlockExtractor();
            let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
            let controllerClosed = false;

            // Helper: safely enqueue bytes, no-op if controller is already closed
            function enqueue(chunk: Uint8Array): void {
                if (controllerClosed) return;
                try {
                    controller.enqueue(chunk);
                } catch {
                    controllerClosed = true;
                }
            }

            // Helper: close the controller exactly once
            function closeController(): void {
                if (controllerClosed) return;
                controllerClosed = true;
                if (heartbeatTimer !== null) {
                    clearInterval(heartbeatTimer);
                    heartbeatTimer = null;
                }
                try { controller.close(); } catch { /* already closed */ }
            }

            // Heartbeat — fires every 25 s to keep the connection alive
            heartbeatTimer = setInterval(() => {
                enqueue(encoder.encode(SSE_HEARTBEAT));
            }, HEARTBEAT_INTERVAL_MS);

            // Client disconnect — stop producing
            req.signal.addEventListener("abort", () => {
                console.log("[api/generative-ui/render] client disconnected");
                closeController();
            });

            try {
                // Open a streaming completion with Claude Haiku
                const anthropicStream = await client.messages.stream({
                    model:      ANTHROPIC_MODEL,
                    max_tokens: MAX_TOKENS,
                    system:     GENERATIVE_UI_SYSTEM_PROMPT,
                    messages:   [
                        { role: "user", content: buildGenerativeUIUserMessage(prompt) },
                    ],
                });

                // Process each text delta as it arrives
                for await (const event of anthropicStream) {
                    if (controllerClosed) break;

                    if (
                        event.type === "content_block_delta" &&
                        event.delta.type === "text_delta"
                    ) {
                        const completedBlockJsons = extractor.ingest(event.delta.text);

                        for (const rawJson of completedBlockJsons) {
                            emitBlock(rawJson, enqueue);
                        }
                    }
                }

                // Stream ended — extract theme and emit canvas_done
                const fullBuffer = extractor.getFullBuffer();
                const theme      = extractTheme(stripCodeFences(fullBuffer));

                const doneEvent: UICanvasSSEEvent = { type: "canvas_done", theme };
                enqueue(sseEvent(doneEvent));

                // Log token usage from the final message
                const finalMessage = await anthropicStream.finalMessage();
                console.log(
                    "[api/generative-ui/render] completed —",
                    `prompt_tokens: ${finalMessage.usage.input_tokens},`,
                    `completion_tokens: ${finalMessage.usage.output_tokens},`,
                    `model: ${finalMessage.model}`
                );

            } catch (err) {
                const safeMessage = "Failed to generate UI. Please try again.";
                console.error("[api/generative-ui/render] LLM error:", err);
                const errorEvent: UICanvasSSEEvent = {
                    type:    "canvas_error",
                    message: safeMessage,
                };
                enqueue(sseEvent(errorEvent));
            } finally {
                closeController();
            }
        },
    });

    return new Response(stream, { headers: sseHeaders() });
}

// ---------------------------------------------------------------------------
// Block emission helper
//
// Parses a raw JSON string extracted by BlockExtractor, Zod-validates the
// result, then enqueues the SSE event. Errors are emitted as canvas_error
// events — raw Zod/parse error details go to server logs only.
// ---------------------------------------------------------------------------

function emitBlock(
    rawJson: string,
    enqueue: (chunk: Uint8Array) => void
): void {
    // Strip any stray code fences that may have appeared mid-stream
    const cleaned = stripCodeFences(rawJson);

    // Parse
    let candidate: unknown;
    try {
        candidate = JSON.parse(cleaned);
    } catch (err) {
        console.error("[api/generative-ui/render] block JSON parse error:", err, "raw:", cleaned);
        const event: UICanvasSSEEvent = {
            type:    "canvas_error",
            message: "Received a malformed block from the AI. Skipping.",
        };
        enqueue(sseEvent(event));
        return;
    }

    // Zod validate
    const result = UIBlockSchema.safeParse(candidate);
    if (!result.success) {
        console.error(
            "[api/generative-ui/render] block validation failed:",
            result.error.issues,
            "candidate:", candidate
        );
        const event: UICanvasSSEEvent = {
            type:    "canvas_error",
            message: "Received an invalid block structure from the AI. Skipping.",
        };
        enqueue(sseEvent(event));
        return;
    }

    const block: UIBlock = result.data;
    const event: UICanvasSSEEvent = { type: "block", block };
    enqueue(sseEvent(event));
}

// ---------------------------------------------------------------------------
// SSE response headers
// ---------------------------------------------------------------------------

function sseHeaders(): HeadersInit {
    return {
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",   // Disable Nginx response buffering for SSE
    };
}
