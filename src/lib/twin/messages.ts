/**
 * User-facing message strings for the Digital Twin chat engine.
 * All error messages and system replies are defined here so they can be
 * updated in one place without touching handler logic.
 * Port of telegram-digital-twin/app/core/messages.py (web-relevant strings only).
 */

// ── Input validation ─────────────────────────────────────────────────────────

export const MSG_TOO_LONG = "Your message is too long. Please keep it under 4,000 characters.";

// ── OTP linking (Web) ────────────────────────────────────────────────────────

export const MSG_LINK_SUCCESS     = "Successfully linked!";
export const MSG_LINK_INVALID     = "Invalid or expired code.";
export const MSG_OTP_RATE_LIMITED = "Too many attempts. Try again later.";

// ── Engine / system errors ───────────────────────────────────────────────────

export const MSG_API_KEY_MISSING = "Internal Error: OpenAI API Key missing.";
export const MSG_AI_ERROR        = "I'm having trouble connecting to my brain right now. Please try again later.";
export const MSG_STORAGE_OFFLINE = "I'm temporarily unavailable — storage is offline. Please try again shortly.";
export const MSG_RATE_LIMITED    = "⚠️ You are sending messages too quickly. Please wait a moment before trying again.";
