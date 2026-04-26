/**
 * EXP_009 — Agentic Reliability Dashboard
 * Environment variable resolution for the runner and provider clients.
 * All other modules in exp_009/ import from here — never call process.env directly.
 */

export const EXP009_OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
export const EXP009_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
export const EXP009_GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';

/**
 * GPT-5.5 is in staged rollout — if access is gated the provider falls back to
 * this model and logs a warning. Set EXP009_OPENAI_MODEL_OVERRIDE in env to
 * force a specific model without touching code.
 */
export const EXP009_OPENAI_MODEL_PRIMARY = 'gpt-5.5' as const;
export const EXP009_OPENAI_MODEL_FALLBACK = 'gpt-4.1' as const;
export const EXP009_OPENAI_MODEL_OVERRIDE = process.env.EXP009_OPENAI_MODEL_OVERRIDE ?? '';

export const EXP009_ANTHROPIC_MODEL = 'claude-opus-4-5' as const;
export const EXP009_GOOGLE_MODEL = 'gemini-2.5-pro-preview-03-25' as const;
