/**
 * Central configuration for the Digital Twin chat engine.
 * All environment variables are read once at module load and exported as typed constants.
 * Every other module imports from here — never use process.env directly elsewhere.
 */

export const OPENAI_API_KEY       = process.env.OPENAI_API_KEY       ?? "";
export const OPENAI_MODEL         = process.env.OPENAI_MODEL         ?? "gpt-5.4";
export const OPENAI_MODEL_SUMMARY = process.env.OPENAI_MODEL_SUMMARY ?? "gpt-5.4-nano";

export const REDIS_URL         = process.env.REDIS_URL ?? "redis://localhost:6379";
export const RATE_LIMIT_COUNT  = parseInt(process.env.RATE_LIMIT_COUNT  ?? "5",  10);
export const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW ?? "60", 10);

export const SUMMARISATION_THRESHOLD = parseInt(process.env.SUMMARISATION_THRESHOLD ?? "30", 10);

export const TELEGRAM_TOKEN          = process.env.TELEGRAM_TOKEN          ?? "";
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
export const LABS_URL                = process.env.LABS_URL                ?? "https://labs.dianaismail.me";
