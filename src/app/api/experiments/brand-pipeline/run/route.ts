/**
 * POST /api/experiments/brand-pipeline/run
 *
 * Enqueues a brand pipeline job and returns the job ID for SSE stream polling.
 *
 * Request body:  BrandPipelineConfig
 * Response 200:  { jobId: string }
 * Response 400:  { error: string }   — validation failure
 * Response 500:  { error: string }   — queue failure
 *
 * The caller uses the returned jobId to open:
 *   GET /api/experiments/brand-pipeline/stream/<jobId>
 */

import { NextRequest }              from "next/server";
import { z }                        from "zod";
import { brandPipelineQueue }       from "@/lib/queues/brandPipelineQueue";
import {
    VARIANT_COUNT_MIN,
    VARIANT_COUNT_MAX,
    TOP_PICKS_MIN,
    TOP_PICKS_MAX,
    BRIEF_MAX_LENGTH,
    BRAND_RULES_MAX_LENGTH,
} from "@/lib/experiments/config";

// ---------------------------------------------------------------------------
// Zod schema — mirrors BrandPipelineConfig with enforcement of field bounds
// ---------------------------------------------------------------------------

const BrandPipelineConfigSchema = z.object({
    brief: z
        .string()
        .trim()
        .min(1, "brief is required")
        .max(BRIEF_MAX_LENGTH, `brief must be at most ${BRIEF_MAX_LENGTH} characters`),

    brandRules: z
        .string()
        .trim()
        .min(1, "brandRules is required")
        .max(BRAND_RULES_MAX_LENGTH, `brandRules must be at most ${BRAND_RULES_MAX_LENGTH} characters`),

    variantCount: z
        .number()
        .int("variantCount must be an integer")
        .min(VARIANT_COUNT_MIN, `variantCount must be at least ${VARIANT_COUNT_MIN}`)
        .max(VARIANT_COUNT_MAX, `variantCount must be at most ${VARIANT_COUNT_MAX}`),

    topPicks: z
        .number()
        .int("topPicks must be an integer")
        .min(TOP_PICKS_MIN, `topPicks must be at least ${TOP_PICKS_MIN}`)
        .max(TOP_PICKS_MAX, `topPicks must be at most ${TOP_PICKS_MAX}`),
}).refine(
    (data) => data.topPicks <= data.variantCount,
    { message: "topPicks cannot exceed variantCount", path: ["topPicks"] }
);

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
    // Parse and validate request body
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const parsed = BrandPipelineConfigSchema.safeParse(body);
    if (!parsed.success) {
        // Return the first validation error message — safe to surface to client
        const firstError = parsed.error.errors[0];
        return Response.json(
            { error: firstError?.message ?? "Invalid request body" },
            { status: 400 }
        );
    }

    const config = parsed.data;

    // Enqueue the job
    try {
        const job = await brandPipelineQueue.add("run", config);
        console.log(
            `[api/brand-pipeline/run] job enqueued — id: ${job.id}, ` +
            `variantCount: ${config.variantCount}, topPicks: ${config.topPicks}`
        );
        return Response.json({ jobId: job.id }, { status: 200 });
    } catch (err) {
        console.error("[api/brand-pipeline/run] failed to enqueue job:", err);
        return Response.json(
            { error: "Failed to start the brand pipeline. Please try again." },
            { status: 500 }
        );
    }
}
