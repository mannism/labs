/**
 * Configuration for EXP_005 — Autonomous Brand Pipeline.
 *
 * Intentionally separate from src/lib/twin/config.ts to keep the brand
 * pipeline experiment isolated from the Digital Twin chat engine. The two
 * systems use different LLM providers (Anthropic vs OpenAI) and have
 * independent rate limits and model selections.
 *
 * All environment variables are read once at module load.
 * Every experiment module must import from here — never call process.env directly.
 */

/** Anthropic API key. Required for Day 2-3 LLM calls. */
export const ANTHROPIC_API_KEY =
    process.env.ANTHROPIC_API_KEY ?? "";

/**
 * Anthropic model for the generate step.
 * claude-sonnet-4-6 is the default — capable and cost-effective for
 * variant generation and evaluation. Override with ANTHROPIC_MODEL env var.
 */
export const ANTHROPIC_MODEL =
    process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

/**
 * Anthropic model for the evaluate and rank steps.
 * Separate from the generate model so the evaluate step can use a more
 * capable model without changing generation cost.
 * Default: same as generate model. Override with ANTHROPIC_EVAL_MODEL env var.
 */
export const ANTHROPIC_EVAL_MODEL =
    process.env.ANTHROPIC_EVAL_MODEL ?? ANTHROPIC_MODEL;

/** Maximum token budget for a single generate step call. */
export const ANTHROPIC_MAX_TOKENS =
    parseInt(process.env.ANTHROPIC_MAX_TOKENS ?? "4096", 10);

/**
 * Redis URL for BullMQ connections.
 * Shared with the twin engine's REDIS_URL env var — same Redis instance,
 * separate key namespaces.
 */
export const REDIS_URL =
    process.env.REDIS_URL ?? "redis://localhost:6379";

/** Minimum allowed variantCount (validated in the API route). */
export const VARIANT_COUNT_MIN = 3;
/** Maximum allowed variantCount. */
export const VARIANT_COUNT_MAX = 10;

/** Minimum allowed topPicks. */
export const TOP_PICKS_MIN = 1;
/** Maximum allowed topPicks. */
export const TOP_PICKS_MAX = 3;

/** Maximum character length for the brief field. */
export const BRIEF_MAX_LENGTH = 8000;

/** Maximum character length for the brandRules field. */
export const BRAND_RULES_MAX_LENGTH = 4000;
