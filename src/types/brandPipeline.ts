/**
 * Shared types for EXP_005 — Autonomous Brand Pipeline.
 *
 * These types are shared across:
 *   - POST /api/experiments/brand-pipeline/run  (request validation)
 *   - GET  /api/experiments/brand-pipeline/stream/[jobId]  (SSE events)
 *   - src/lib/workers/brandPipelineWorker.ts  (job processor)
 *   - src/lib/queues/brandPipelineQueue.ts  (job enqueue)
 */

// ---------------------------------------------------------------------------
// Pipeline configuration — what the user submits
// ---------------------------------------------------------------------------

export type BrandPipelineConfig = {
  /** Creative brief text describing the brand context and goals. */
  brief: string;
  /** Brand rules governing tone, language, and visual/verbal identity. */
  brandRules: string;
  /** N: number of variants to generate (3–10). */
  variantCount: number;
  /** K: number of top-ranked variants to surface in the final result (1–3). */
  topPicks: number;
};

// ---------------------------------------------------------------------------
// Pipeline step enum
// ---------------------------------------------------------------------------

export type PipelineStep = "generate" | "evaluate" | "rank";

// ---------------------------------------------------------------------------
// SSE event union — every event sent over the stream has one of these shapes
// ---------------------------------------------------------------------------

export type PipelineEvent =
  | { type: "step_start";      step: PipelineStep; timestamp: number }
  | { type: "llm_chunk";       step: PipelineStep; content: string }
  | { type: "step_complete";   step: PipelineStep; timestamp: number }
  | { type: "pipeline_done";   results: VariantResult[]; timestamp: number }
  | { type: "pipeline_error";  error: string; step?: PipelineStep; timestamp: number };

// ---------------------------------------------------------------------------
// Individual variant result — produced by the rank step
// ---------------------------------------------------------------------------

export type VariantResult = {
  /** Unique identifier for this variant (UUID generated during evaluate step). */
  id: string;
  /** The generated brand concept text. */
  concept: string;
  /** Aggregate score from the evaluate step (0–100). */
  score: number;
  /** Brand-rule violations or caution flags identified during evaluation. */
  flags: string[];
  /** Evaluator rationale explaining the score and flags. */
  rationale: string;
};
