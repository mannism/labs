/**
 * BullMQ Worker for EXP_005 — Autonomous Brand Pipeline.
 *
 * This worker runs inside the Next.js server process via the instrumentation
 * hook (instrumentation.ts at project root). It picks up jobs from the
 * "brand-pipeline" queue and drives them through three sequential steps:
 *
 *   1. generate  — produce N brand concept variants via Anthropic streaming
 *   2. evaluate  — score each variant against brand rules (parallelised)
 *   3. rank      — select top K variants with Anthropic reasoning
 *
 * Each step publishes SSE-formatted events to a Redis pub/sub channel
 * `brand-pipeline:<jobId>` so the stream route can forward them to the
 * client in real time.
 *
 * Timing considerations:
 *   - stalledInterval: 15 000 ms — how often BullMQ checks for stalled jobs.
 *     Pipeline runs are 60–90 s, so a 15 s interval catches truly stuck jobs
 *     without excessive overhead.
 *   - lockDuration: 30 000 ms — the job lock is renewed every 30 s to prevent
 *     another worker from stealing the job mid-run.
 */

import Anthropic                   from "@anthropic-ai/sdk";
import { Worker, type Job }        from "bullmq";
import Redis                       from "ioredis";
import { randomUUID }              from "crypto";
import type {
    BrandPipelineConfig,
    PipelineEvent,
    PipelineStep,
    VariantResult,
} from "@/types/brandPipeline";
import {
    buildGenerateMessages,
    buildEvaluateMessages,
    buildRankMessages,
} from "@/lib/prompts/brandPipeline";
import {
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    ANTHROPIC_EVAL_MODEL,
    ANTHROPIC_MAX_TOKENS,
} from "@/lib/experiments/config";

const QUEUE_NAME = "brand-pipeline";

// ---------------------------------------------------------------------------
// Anthropic client — module-level singleton.
// Initialised once at worker startup; throws clearly if the API key is absent.
// ---------------------------------------------------------------------------

if (!ANTHROPIC_API_KEY) {
    console.error(
        "[workers/brandPipeline] ANTHROPIC_API_KEY is not set. " +
        "Brand pipeline jobs will fail at the generate step."
    );
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Dedicated Redis connection for the worker.
// BullMQ Workers use blocking BRPOP calls — they MUST have their own
// connection and cannot share with Queue or QueueEvents.
// ---------------------------------------------------------------------------

function createWorkerRedisConnection(): Redis {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    const client = new Redis(url, {
        maxRetriesPerRequest: null,
        enableOfflineQueue:   true,
    });
    client.on("error", (err: Error) => {
        console.error("[workers/brandPipeline] Redis worker connection error:", err.message);
    });
    return client;
}

// ---------------------------------------------------------------------------
// Pub/sub publisher — separate connection, dedicated to PUBLISH only.
// A connection in subscriber mode cannot issue PUBLISH; keeping it separate
// also avoids blocking the worker connection with pub/sub state.
// ---------------------------------------------------------------------------

function createPublisherConnection(): Redis {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    const client = new Redis(url, {
        maxRetriesPerRequest: null,
        enableOfflineQueue:   true,
    });
    client.on("error", (err: Error) => {
        console.error("[workers/brandPipeline] Redis publisher connection error:", err.message);
    });
    return client;
}

const publisher = createPublisherConnection();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Publishes a PipelineEvent to the job-specific Redis pub/sub channel.
 * The stream route subscribes to this channel and forwards events as SSE frames.
 * Failures are logged and swallowed — a missed event does not crash the pipeline.
 */
async function publishEvent(jobId: string, event: PipelineEvent): Promise<void> {
    try {
        const channel = `brand-pipeline:${jobId}`;
        await publisher.publish(channel, JSON.stringify(event));
    } catch (err) {
        console.error(`[workers/brandPipeline] failed to publish event for job ${jobId}:`, err);
    }
}

/**
 * Parses a JSON string returned by Claude, stripping markdown fences if any.
 * Claude occasionally wraps JSON in ```json ... ``` despite being instructed
 * not to — this strips those fences before parsing.
 */
function parseJsonResponse(raw: string): unknown {
    const stripped = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
    return JSON.parse(stripped);
}

// ---------------------------------------------------------------------------
// Step 1: Generate
// ---------------------------------------------------------------------------

/**
 * Calls Anthropic with streaming to produce N brand concept variants.
 * Streams llm_chunk events per token. On completion parses a JSON array of
 * { id: string, concept: string }[] and returns the concept strings.
 *
 * Throws on:
 *   - API errors (timeout, rate limit, server error)
 *   - JSON parse failure
 *   - Unexpected response shape
 */
async function runGenerateStep(
    job: Job<BrandPipelineConfig>,
    config: BrandPipelineConfig
): Promise<Array<{ id: string; concept: string }>> {
    const jobId = job.id ?? "unknown";

    await publishEvent(jobId, {
        type:      "step_start",
        step:      "generate" as PipelineStep,
        timestamp: Date.now(),
    });

    console.log(
        `[workers/brandPipeline] [job:${jobId}] generate step started — ` +
        `model: ${ANTHROPIC_MODEL}, variantCount: ${config.variantCount}`
    );

    const { system, user } = buildGenerateMessages(
        config.brief,
        config.brandRules,
        config.variantCount
    );

    let fullText = "";

    const stream = anthropic.messages.stream({
        model:      ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        system,
        messages:   [{ role: "user", content: user }],
    });

    // Forward streamed tokens to the SSE channel in real time
    stream.on("text", async (delta: string) => {
        fullText += delta;
        await publishEvent(jobId, {
            type:    "llm_chunk",
            step:    "generate" as PipelineStep,
            content: delta,
        });
    });

    await stream.finalMessage();

    // Parse the JSON array from the completed response
    let parsed: unknown;
    try {
        parsed = parseJsonResponse(fullText);
    } catch {
        throw new Error(
            `[generate] Claude returned non-JSON output. ` +
            `Raw response (first 200 chars): ${fullText.slice(0, 200)}`
        );
    }

    if (!Array.isArray(parsed)) {
        throw new Error(
            `[generate] Expected a JSON array, got ${typeof parsed}`
        );
    }

    const variants = parsed as Array<{ id: string; concept: string }>;

    if (variants.length !== config.variantCount) {
        console.warn(
            `[workers/brandPipeline] [job:${jobId}] generate step: expected ` +
            `${config.variantCount} variants, received ${variants.length}`
        );
    }

    await publishEvent(jobId, {
        type:      "step_complete",
        step:      "generate" as PipelineStep,
        timestamp: Date.now(),
    });

    console.log(
        `[workers/brandPipeline] [job:${jobId}] generate step complete — ` +
        `${variants.length} variants`
    );

    return variants;
}

// ---------------------------------------------------------------------------
// Step 2: Evaluate
// ---------------------------------------------------------------------------

/**
 * Structured result expected from the evaluate prompt.
 */
type EvaluationResult = {
    concept:   string;
    id:        string;
    score:     number;
    flags:     string[];
    rationale: string;
};

/**
 * Evaluates a single variant against the brand rules.
 * Streams llm_chunk events prefixed with the variant index for the UI.
 *
 * Returns null if the call fails — the caller skips failed variants and logs
 * the skip rather than aborting the whole pipeline.
 */
async function evaluateSingleVariant(
    jobId:      string,
    variant:    { id: string; concept: string },
    variantIdx: number,
    brandRules: string
): Promise<EvaluationResult | null> {
    const { system, user } = buildEvaluateMessages(variant.concept, brandRules);

    let fullText = "";

    try {
        const stream = anthropic.messages.stream({
            model:      ANTHROPIC_EVAL_MODEL,
            max_tokens: 1024,
            system,
            messages:   [{ role: "user", content: user }],
        });

        stream.on("text", async (delta: string) => {
            fullText += delta;
            // Prefix chunks with variant index so the UI can associate tokens
            // with the correct evaluation card while parallel evals stream in
            await publishEvent(jobId, {
                type:    "llm_chunk",
                step:    "evaluate" as PipelineStep,
                content: `[variant:${variantIdx}] ${delta}`,
            });
        });

        await stream.finalMessage();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
            `[workers/brandPipeline] [job:${jobId}] evaluate variant ${variant.id} failed: ${msg}`
        );
        return null;
    }

    let parsed: unknown;
    try {
        parsed = parseJsonResponse(fullText);
    } catch {
        console.error(
            `[workers/brandPipeline] [job:${jobId}] evaluate variant ${variant.id} ` +
            `returned non-JSON. Raw (first 200 chars): ${fullText.slice(0, 200)}`
        );
        return null;
    }

    const raw = parsed as Record<string, unknown>;

    if (
        typeof raw.score     !== "number" ||
        !Array.isArray(raw.flags)         ||
        typeof raw.rationale !== "string"
    ) {
        console.error(
            `[workers/brandPipeline] [job:${jobId}] evaluate variant ${variant.id} ` +
            `response missing required fields. Parsed:`, raw
        );
        return null;
    }

    return {
        id:        variant.id,
        concept:   variant.concept,
        score:     raw.score as number,
        flags:     raw.flags as string[],
        rationale: raw.rationale as string,
    };
}

/**
 * Step 2: Evaluates all variants in parallel.
 * Failed evaluations are logged and skipped — the pipeline continues with
 * the successfully evaluated subset.
 *
 * Throws only if zero variants are successfully evaluated (nothing to rank).
 */
async function runEvaluateStep(
    job: Job<BrandPipelineConfig>,
    config: BrandPipelineConfig,
    variants: Array<{ id: string; concept: string }>
): Promise<EvaluationResult[]> {
    const jobId = job.id ?? "unknown";

    await publishEvent(jobId, {
        type:      "step_start",
        step:      "evaluate" as PipelineStep,
        timestamp: Date.now(),
    });

    console.log(
        `[workers/brandPipeline] [job:${jobId}] evaluate step started — ` +
        `${variants.length} variants, model: ${ANTHROPIC_EVAL_MODEL}`
    );

    const results = await Promise.all(
        variants.map((v, idx) =>
            evaluateSingleVariant(jobId, v, idx, config.brandRules)
        )
    );

    const successful = results.filter((r): r is EvaluationResult => r !== null);
    const skipped    = results.length - successful.length;

    if (skipped > 0) {
        console.warn(
            `[workers/brandPipeline] [job:${jobId}] evaluate step: ` +
            `${skipped} variant(s) skipped due to evaluation errors`
        );
    }

    if (successful.length === 0) {
        throw new Error(
            "[evaluate] All variant evaluations failed. Cannot proceed to rank step."
        );
    }

    await publishEvent(jobId, {
        type:      "step_complete",
        step:      "evaluate" as PipelineStep,
        timestamp: Date.now(),
    });

    console.log(
        `[workers/brandPipeline] [job:${jobId}] evaluate step complete — ` +
        `${successful.length} of ${variants.length} variants evaluated`
    );

    return successful;
}

// ---------------------------------------------------------------------------
// Step 3: Rank
// ---------------------------------------------------------------------------

/**
 * Step 3: Sends all evaluated variants to Anthropic for comparative ranking.
 * Streams the reasoning as llm_chunk events. Parses the final top-K list.
 *
 * The rank prompt instructs Claude to sort by score desc, break ties by flag
 * count asc, and prefer conceptual diversity. Returns a VariantResult[] with
 * stable UUIDs assigned here (the model only sees the id field from evaluation).
 */
async function runRankStep(
    job: Job<BrandPipelineConfig>,
    config: BrandPipelineConfig,
    evaluations: EvaluationResult[]
): Promise<VariantResult[]> {
    const jobId = job.id ?? "unknown";

    await publishEvent(jobId, {
        type:      "step_start",
        step:      "rank" as PipelineStep,
        timestamp: Date.now(),
    });

    console.log(
        `[workers/brandPipeline] [job:${jobId}] rank step started — ` +
        `${evaluations.length} candidates, selecting top ${config.topPicks}`
    );

    const { system, user } = buildRankMessages(evaluations, config.topPicks);

    let fullText = "";

    const stream = anthropic.messages.stream({
        model:      ANTHROPIC_EVAL_MODEL,
        max_tokens: 2048,
        system,
        messages:   [{ role: "user", content: user }],
    });

    stream.on("text", async (delta: string) => {
        fullText += delta;
        await publishEvent(jobId, {
            type:    "llm_chunk",
            step:    "rank" as PipelineStep,
            content: delta,
        });
    });

    await stream.finalMessage();

    let parsed: unknown;
    try {
        parsed = parseJsonResponse(fullText);
    } catch {
        throw new Error(
            `[rank] Claude returned non-JSON output. ` +
            `Raw response (first 200 chars): ${fullText.slice(0, 200)}`
        );
    }

    const raw = parsed as Record<string, unknown>;

    if (!Array.isArray(raw.results)) {
        throw new Error(
            `[rank] Expected { results: [...] }, got shape: ${JSON.stringify(Object.keys(raw))}`
        );
    }

    // Assign stable UUIDs for the UI — the model's id field is internal only
    const results: VariantResult[] = (raw.results as Array<Record<string, unknown>>).map((item) => ({
        id:        randomUUID(),
        concept:   String(item.concept   ?? ""),
        score:     Number(item.score     ?? 0),
        flags:     Array.isArray(item.flags) ? (item.flags as string[]) : [],
        rationale: String(item.rationale ?? ""),
    }));

    await publishEvent(jobId, {
        type:      "step_complete",
        step:      "rank" as PipelineStep,
        timestamp: Date.now(),
    });

    console.log(
        `[workers/brandPipeline] [job:${jobId}] rank step complete — ` +
        `top ${results.length} variants selected`
    );

    return results;
}

// ---------------------------------------------------------------------------
// Worker processor
// ---------------------------------------------------------------------------

async function processBrandPipelineJob(job: Job<BrandPipelineConfig>): Promise<void> {
    const jobId  = job.id ?? "unknown";
    const config = job.data;

    console.log(
        `[workers/brandPipeline] [job:${jobId}] pipeline started — ` +
        `brief: ${config.brief.length} chars, ` +
        `variantCount: ${config.variantCount}, topPicks: ${config.topPicks}`
    );

    let variants:    Array<{ id: string; concept: string }> | undefined;
    let evaluations: EvaluationResult[]                     | undefined;
    let results:     VariantResult[]                        | undefined;

    try {
        // Step 1 — generate variants
        variants = await runGenerateStep(job, config);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error in generate step";
        console.error(`[workers/brandPipeline] [job:${jobId}] generate step failed:`, message);

        await publishEvent(jobId, {
            type:      "pipeline_error",
            error:     "Variant generation failed. Please try again.",
            step:      "generate",
            timestamp: Date.now(),
        });

        throw err;  // BullMQ marks job as failed
    }

    try {
        // Step 2 — evaluate variants
        evaluations = await runEvaluateStep(job, config, variants);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error in evaluate step";
        console.error(`[workers/brandPipeline] [job:${jobId}] evaluate step failed:`, message);

        await publishEvent(jobId, {
            type:      "pipeline_error",
            error:     "Variant evaluation failed. Please try again.",
            step:      "evaluate",
            timestamp: Date.now(),
        });

        throw err;
    }

    try {
        // Step 3 — rank and select top K
        results = await runRankStep(job, config, evaluations);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error in rank step";
        console.error(`[workers/brandPipeline] [job:${jobId}] rank step failed:`, message);

        await publishEvent(jobId, {
            type:      "pipeline_error",
            error:     "Final ranking failed. Please try again.",
            step:      "rank",
            timestamp: Date.now(),
        });

        throw err;
    }

    await publishEvent(jobId, {
        type:      "pipeline_done",
        results,
        timestamp: Date.now(),
    });

    console.log(`[workers/brandPipeline] [job:${jobId}] pipeline complete`);
}

// ---------------------------------------------------------------------------
// Worker instance
// ---------------------------------------------------------------------------

export const brandPipelineWorker = new Worker<BrandPipelineConfig>(
    QUEUE_NAME,
    processBrandPipelineJob,
    {
        connection:      createWorkerRedisConnection(),
        stalledInterval: 15_000,  // check for stalled jobs every 15 s
        lockDuration:    30_000,  // lock duration 30 s; BullMQ auto-renews before expiry
        concurrency:     2,       // max 2 concurrent pipeline runs (CPU/cost guard)
    }
);

brandPipelineWorker.on("failed", (job, err) => {
    console.error(
        `[workers/brandPipeline] job ${job?.id ?? "unknown"} failed: ${err.message}`
    );
});

brandPipelineWorker.on("error", (err) => {
    console.error("[workers/brandPipeline] worker error:", err.message);
});
