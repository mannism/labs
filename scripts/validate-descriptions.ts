/**
 * validate-descriptions.ts — build-time content description validator.
 *
 * Validates all visible entries in projects.json and experiments.json against
 * the Zod schemas in src/lib/schemas/content-descriptions.ts.
 *
 * Behaviour:
 *   - Skips entries with display: false (not user-facing, not GEO-relevant).
 *   - Selects schema by content type: project/absent → ProjectDescriptionSchema,
 *     article → ArticleDescriptionSchema, experiments → ExperimentDescriptionSchema.
 *   - Aggregates all failures before exiting — does NOT bail on first error.
 *   - Hard failures: prints to stderr, exits 1.
 *   - Soft warnings (article entity-anchor check): prints to stderr, exits 0.
 *
 * Run via: npm run validate:content
 */

// ZodError import not needed — we access .issues directly (Zod v4 API).
// In Zod v4, ZodError.errors is removed; use ZodError.issues instead.
import {
  ProjectDescriptionSchema,
  ArticleDescriptionSchema,
  ExperimentDescriptionSchema,
  articleEntityAnchorCheck,
  experimentProofKeywordCheck,
} from "../src/lib/schemas/content-descriptions.js";

// ---------------------------------------------------------------------------
// JSON imports — resolved relative to the repo root at runtime.
// ---------------------------------------------------------------------------

import projectsData from "../src/data/projects.json" with { type: "json" };
import experimentsData from "../src/data/experiments.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Types (minimal — we only care about the fields we validate)
// ---------------------------------------------------------------------------

interface ProjectEntry {
  slug: string;
  display: boolean;
  type?: "project" | "article";
  shortDescription: string;
}

interface ExperimentEntry {
  slug: string;
  description: string;
  // No display field on experiments — all are validated.
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

/** Truncate text to n characters, appending "…" if truncated. */
function trunc(text: string, n = 80): string {
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
}

/** Print a hard failure line to stderr. */
function printFailure(slug: string, field: string, reason: string, text: string): void {
  process.stderr.write(
    `FAIL  ${slug} — ${field} — ${reason} — "${trunc(text)}"\n`,
  );
}

/** Print a soft warning line to stderr. */
function printWarning(slug: string, field: string, reason: string, text: string): void {
  process.stderr.write(
    `WARN  ${slug} — ${field} — ${reason} — "${trunc(text)}"\n`,
  );
}

/** Extract human-readable messages from a Zod v4 parse error. */
function zodMessages(err: { issues: Array<{ message: string }> }): string[] {
  return err.issues.map((e) => e.message);
}

// ---------------------------------------------------------------------------
// Validation runner
// ---------------------------------------------------------------------------

let hardFailureCount = 0;
let softWarningCount = 0;

// ---- Projects and Articles (projects.json) ----

const projects = projectsData as ProjectEntry[];

for (const entry of projects) {
  // Skip hidden entries — not user-facing, not GEO-relevant.
  if (!entry.display) continue;

  const isArticle = entry.type === "article";
  const schema = isArticle ? ArticleDescriptionSchema : ProjectDescriptionSchema;

  const result = schema.safeParse({ shortDescription: entry.shortDescription });

  if (!result.success) {
    for (const msg of zodMessages(result.error)) {
      printFailure(entry.slug, "shortDescription", msg, entry.shortDescription);
      hardFailureCount++;
    }
  }

  // Soft check for articles: should name Diana or include a mechanism keyword.
  if (isArticle && result.success) {
    if (!articleEntityAnchorCheck(entry.shortDescription)) {
      printWarning(
        entry.slug,
        "shortDescription",
        "soft: should reference \"Diana\" or include a mechanism keyword (mechanism|pattern|demonstrates|architecture|proves)",
        entry.shortDescription,
      );
      softWarningCount++;
    }
  }
}

// ---- Experiments (experiments.json) ----

const experiments = experimentsData as ExperimentEntry[];

for (const entry of experiments) {
  const result = ExperimentDescriptionSchema.safeParse({
    description: entry.description,
  });

  if (!result.success) {
    for (const msg of zodMessages(result.error)) {
      printFailure(entry.slug, "description", msg, entry.description);
      hardFailureCount++;
    }
  }

  // Soft check: description ideally uses proof/capability framing.
  // Hard check removed — the `whatItProves` field carries that register;
  // the card description has a different job ("what it is", not "what it proves").
  if (result.success && !experimentProofKeywordCheck(entry.description)) {
    printWarning(
      entry.slug,
      "description",
      'soft: consider including a proof/capability keyword (demonstrates|proves|shows|enables|allows) — currently absent from card description',
      entry.description,
    );
    softWarningCount++;
  }
}

// ---------------------------------------------------------------------------
// Summary and exit
// ---------------------------------------------------------------------------

if (hardFailureCount > 0) {
  process.stderr.write(
    `\n${hardFailureCount} hard failure(s), ${softWarningCount} soft warning(s). Fix failures before merging.\n`,
  );
  process.exit(1);
} else {
  const warningLine =
    softWarningCount > 0
      ? ` (${softWarningCount} soft warning(s) — see above)`
      : "";
  process.stdout.write(`All content descriptions pass validation.${warningLine}\n`);
  process.exit(0);
}
