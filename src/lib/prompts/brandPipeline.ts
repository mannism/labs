/**
 * Prompts and presets for EXP_005 — Autonomous Brand Pipeline.
 *
 * Three prompt templates, one per pipeline step:
 *   buildGeneratePrompt  — generate N brand concept variants from a brief
 *   buildEvaluatePrompt  — score one variant against brand rules
 *   buildRankPrompt      — rank all evaluated variants and select top K
 *
 * One example preset (Luxury Sustainable Fashion) is exported so the frontend
 * can offer it as a one-click starting point without requiring users to write
 * their own brand rules from scratch.
 *
 * Prompt changes must be committed separately from code changes (per CLAUDE.md).
 */

// ---------------------------------------------------------------------------
// Preset
// ---------------------------------------------------------------------------

export const BRAND_RULES_PRESET = {
  name: "Luxury Sustainable Fashion",
  rules: `Brand voice: Confident, understated, never loud. Avoid superlatives.
Colour palette: Earth tones — ivory, sage, charcoal, warm sand. No neon, no primary colours.
Typography direction: Serif for headlines, clean sans-serif for body. No decorative or script fonts.
Visual style: Minimal, editorial, high whitespace. Photography over illustration.
Values: Sustainability is assumed, not marketed. Never use "eco-friendly" or "green" as selling points.
Audience: Women 28-45, design-conscious, willing to pay for quality and longevity.
Avoid: Fast fashion language ("affordable", "trendy", "must-have"), urgency tactics ("limited time", "act now"), greenwashing.`,
} as const;

// ---------------------------------------------------------------------------
// Step 1: Generate
// ---------------------------------------------------------------------------

/**
 * Builds the system and user messages for the generate step.
 *
 * The model returns a JSON array of objects: { id: string, concept: string }[]
 * where `id` is a 1-based numeric string ("1", "2", ...) and `concept` is a
 * 1-3 paragraph brand concept description.
 *
 * JSON output is enforced by:
 *   a) a system prompt instruction to respond only with valid JSON
 *   b) a closing instruction in the user message
 * This avoids relying on beta `response_format` which is not universally
 * available across all Claude model generations.
 */
export function buildGenerateMessages(
  brief: string,
  brandRules: string,
  variantCount: number
): { system: string; user: string } {
  const system = `You are a senior brand strategist with expertise in creating distinct, resonant brand concepts. \
You translate creative briefs into concrete brand identities that align precisely with the client's voice, \
audience, and values.

You always output valid JSON and nothing else — no markdown fences, no prose outside the JSON structure.`;

  const user = `Create ${variantCount} distinct brand concept variants for the following brief.

## Creative Brief
${brief}

## Brand Rules
${brandRules}

## Instructions
- Each variant must have a unique creative angle or positioning strategy
- Each concept should be 2–4 sentences: lead with the core idea, then describe how it manifests in voice, \
visual identity, or messaging
- Every concept must comply with all brand rules — flag zero rule violations
- Generate exactly ${variantCount} variants — no more, no fewer

Respond with a JSON array only. No markdown, no explanation, no text outside the JSON.

[
  { "id": "1", "concept": "..." },
  { "id": "2", "concept": "..." },
  ...
]`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Step 2: Evaluate
// ---------------------------------------------------------------------------

/**
 * Builds the system and user messages for the evaluate step.
 *
 * The model returns a JSON object:
 *   { score: number, flags: string[], rationale: string }
 *
 * score: 1–10 (10 = perfect alignment with brand rules, 1 = severe violations)
 * flags: array of specific rule violations; empty array if none
 * rationale: 2–3 sentences explaining the score and flags
 */
export function buildEvaluateMessages(
  concept: string,
  brandRules: string
): { system: string; user: string } {
  const system = `You are a brand compliance evaluator. Your role is to score brand concepts against \
a defined set of brand rules, identifying rule violations and explaining the score with precision.

You always output valid JSON and nothing else — no markdown fences, no prose outside the JSON structure.`;

  const user = `Evaluate the following brand concept against the brand rules below.

## Brand Concept
${concept}

## Brand Rules
${brandRules}

## Scoring Guide
- 9–10: Fully aligned, no rule violations, tone and style are exemplary
- 7–8: Strong alignment with minor issues that do not violate rules
- 5–6: Moderate alignment; one or two clear rule violations
- 3–4: Poor alignment; multiple rule violations
- 1–2: Fundamental misalignment; violates the core brand identity

## Instructions
- Identify every specific rule violation by name (e.g. "uses superlative 'best-in-class'", "urgency tactic 'limited time'")
- If there are no violations, return an empty flags array
- Rationale must be 2–3 sentences: explain the score, reference specific rule violations or strengths

Respond with a JSON object only. No markdown, no explanation, no text outside the JSON.

{ "score": <number 1-10>, "flags": ["...", "..."], "rationale": "..." }`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Step 3: Rank
// ---------------------------------------------------------------------------

/**
 * Builds the system and user messages for the rank step.
 *
 * Input: all evaluated variants as a JSON array in the user message.
 * Output: { results: Array<{ id, concept, score, flags, rationale }> }
 *
 * The model returns the top-K variants sorted by score descending.
 * Ties are broken by fewer flags (fewer violations = higher rank).
 * The model may adjust scores marginally to reflect comparative reasoning,
 * but must not invent new flags or change rationale text.
 */
export function buildRankMessages(
  evaluations: Array<{
    id: string;
    concept: string;
    score: number;
    flags: string[];
    rationale: string;
  }>,
  topPicks: number
): { system: string; user: string } {
  const system = `You are a brand strategy director performing final selection of brand concepts. \
You compare evaluated variants holistically, break ties using flag counts, and select the strongest \
candidates that collectively represent distinct, non-overlapping positioning strategies.

You always output valid JSON and nothing else — no markdown fences, no prose outside the JSON structure.`;

  const user = `Select the top ${topPicks} brand concept variant${topPicks > 1 ? "s" : ""} from the \
evaluated set below.

## Evaluated Variants
${JSON.stringify(evaluations, null, 2)}

## Selection Rules
1. Sort by score descending
2. Break ties by flag count ascending (fewer violations wins)
3. Prefer conceptual diversity — avoid selecting variants with near-identical positioning
4. Return exactly ${topPicks} result${topPicks > 1 ? "s" : ""}
5. Do not modify the concept text, flags, or rationale from the input — preserve them verbatim
6. You may refine the score by ±1 if comparative reasoning reveals an ordering error, but must not \
change scores by more than 1

Respond with a JSON object only. No markdown, no explanation, no text outside the JSON.

{ "results": [ { "id": "...", "concept": "...", "score": <number>, "flags": [...], "rationale": "..." } ] }`;

  return { system, user };
}
