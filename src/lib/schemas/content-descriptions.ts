/**
 * Content description validation schemas — Zod enforcement of per-content-type
 * word-count floors and Reid's quality constraints.
 *
 * Three schema tiers, one per content type:
 *   - ProjectDescriptionSchema  — entries with type: "project" (or type absent)
 *   - ArticleDescriptionSchema  — entries with type: "article"
 *   - ExperimentDescriptionSchema — all entries in experiments.json
 *
 * Run via `npm run validate:content` (scripts/validate-descriptions.ts).
 * Failures block CI; soft warnings emit to stderr but exit 0.
 *
 * Zod v4 notes:
 *   - z.string().min() checks character count, not word count.
 *     All word-count gates use z.string().check() with countWords().
 *   - The v3 refine(fn, (val) => ({ message })) callback form is not
 *     supported in v4 — use .check() for dynamic messages or .refine()
 *     with a static { message } object.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Word-count helper
// ---------------------------------------------------------------------------

/**
 * Count words in a string.
 *
 * Handles markdown backtick spans and en/em dashes consistently:
 * - Backtick-wrapped tokens (e.g. `performance`) count as 1 word.
 * - En/em dashes surrounded by spaces are treated as word boundaries and
 *   do not inflate the count (the dash itself is not counted).
 * - Sequences of punctuation-only characters are not counted.
 *
 * This matches the manual counts published in vera-geo-rewrites.md.
 */
export function countWords(text: string): number {
  return (
    text
      // Remove backtick spans, keeping the inner token as one word.
      .replace(/`[^`]+`/g, "TOKEN")
      // Replace em/en dashes (and surrounding spaces) with a single space.
      .replace(/\s*[\u2013\u2014]—?\s*/g, " ")
      .replace(/--/g, " ")
      // Split on whitespace.
      .trim()
      .split(/\s+/)
      // Discard empty strings and punctuation-only tokens.
      .filter((w) => /\w/.test(w)).length
  );
}

// ---------------------------------------------------------------------------
// Shared filter helpers
// ---------------------------------------------------------------------------

/**
 * Hedging tokens that signal epistemic uncertainty or personal-opinion framing.
 * Reid's positioning note prohibits these across all content types.
 */
const HEDGING_TOKENS: RegExp =
  /it depends|many ways to think|just my perspective|kind of|sort of|maybe/i;

/**
 * Marketing-register tokens that undermine the Labs operational voice.
 * Sourced from the brief; confirmed against voice-system.md off-limits list.
 */
const OFF_LIMITS_TOKENS: RegExp =
  /\belevate\b|\bdelight\b|\bseamless\b|\bunlock\b|\beverag(e|es|ed|ing)\b|\bsynergy\b|\brevolutionary\b/i;

// ---------------------------------------------------------------------------
// Shared string validators (Zod v4 .check() for dynamic messages)
// ---------------------------------------------------------------------------

/**
 * Returns a Zod v4 string schema with hedging and off-limits register checks.
 * Shared across all three schema tiers.
 */
function stringWithQualityChecks(): z.ZodString {
  return z
    .string()
    .refine((text) => !HEDGING_TOKENS.test(text), {
      message:
        "contains hedging language — remove epistemic hedges (it depends, kind of, sort of, maybe, etc.)",
    })
    .refine((text) => !OFF_LIMITS_TOKENS.test(text), {
      message:
        "contains off-limits marketing register — remove (elevate, delight, seamless, unlock, leverage, synergy, revolutionary)",
    });
}

/**
 * Wraps a string schema with a minimum word-count check (Zod v4 .check()).
 * Dynamic message includes the actual word count for actionable output.
 */
function withWordFloor(
  schema: z.ZodString,
  floor: number,
  fieldLabel: string,
  purpose: string,
): z.ZodString {
  return schema.check((ctx) => {
    const wc = countWords(ctx.value);
    if (wc < floor) {
      ctx.issues.push({
        code: "custom",
        message: `${fieldLabel} must be ≥${floor} words ${purpose} (current: ${wc} words)`,
        input: ctx.value,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// ProjectDescriptionSchema
// ---------------------------------------------------------------------------

/**
 * Validates shortDescription for project-type entries (type: "project" or absent).
 *
 * Hard constraints (exit 1 on failure):
 *   - ≥50 words — Tom's floor for SoftwareApplication JSON-LD summary.
 *   - No hedging language.
 *   - No off-limits marketing register.
 */
export const ProjectDescriptionSchema = z.object({
  shortDescription: withWordFloor(
    stringWithQualityChecks(),
    50,
    "shortDescription",
    "for SoftwareApplication AI extraction",
  ),
});

// ---------------------------------------------------------------------------
// ArticleDescriptionSchema
// ---------------------------------------------------------------------------

/**
 * Validates shortDescription for article-type entries (type: "article").
 *
 * Hard constraints (exit 1 on failure):
 *   - ≥36 words — Tom's TechArticle abstract floor.
 *   - No hedging language.
 *   - No off-limits marketing register.
 *
 * Soft constraint (warn only, exit 0):
 *   - Description should name "Diana" OR include a mechanism/proof keyword.
 *   Surfaced as a CI warning — article register is the most varied in shape.
 */
export const ArticleDescriptionSchema = z.object({
  shortDescription: withWordFloor(
    stringWithQualityChecks(),
    36,
    "shortDescription",
    "for TechArticle abstract",
  ),
});

/**
 * Soft check: description should anchor to Diana Ismail or a named mechanism.
 * Returns true when the description passes (no warning needed).
 * Returns false when a warning should be emitted.
 */
export function articleEntityAnchorCheck(shortDescription: string): boolean {
  return (
    /diana/i.test(shortDescription) ||
    /mechanism|pattern|demonstrates|architecture|proves/i.test(shortDescription)
  );
}

// ---------------------------------------------------------------------------
// ExperimentDescriptionSchema
// ---------------------------------------------------------------------------

/**
 * Validates description for all experiment entries in experiments.json.
 *
 * Hard constraints (exit 1 on failure):
 *   - ≥20 words — minimum clarity threshold.
 *   - No hedging language.
 *   - No off-limits marketing register.
 *
 * Soft constraint (warn only, exit 0):
 *   - Description ideally includes a proof/capability keyword
 *     (demonstrates|proves|shows|enables|allows).
 *   This is a register signal, not a hard requirement. The structured
 *   `whatItProves` field on each experiment carries the proof register;
 *   the card `description` carries the "what it is" summary — a different
 *   job. Forcing all 9 cards to start with "demonstrates" homogenises
 *   register and makes copy worse. Use `experimentProofKeywordCheck()`
 *   in the validator script to emit a soft warning instead.
 */
export const ExperimentDescriptionSchema = z.object({
  description: withWordFloor(
    stringWithQualityChecks(),
    20,
    "description",
    "for experiment clarity",
  ),
});

/**
 * Soft check: experiment description ideally includes a proof/capability keyword.
 * Returns true when the description passes (no warning needed).
 * Returns false when a warning should be emitted.
 *
 * This is intentionally soft — the `whatItProves` array carries the proof
 * register; the card `description` is a "what it is" summary with its own
 * voice. Homogenising both to the same keyword pattern degrades copy quality.
 */
export function experimentProofKeywordCheck(description: string): boolean {
  return /demonstrates|proves|shows|enables|allows/i.test(description);
}
