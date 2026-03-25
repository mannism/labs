/**
 * User-facing message strings for the Digital Twin chat engine.
 * All error messages and system replies are defined here so they can be
 * updated in one place without touching handler logic.
 * Port of telegram-digital-twin/app/core/messages.py (web-relevant strings only).
 */

// ── Media placeholders (Telegram) ────────────────────────────────────────────
// Sent to the AI when the user sends a non-text message, so it can respond
// gracefully rather than receiving nothing.

export const MEDIA_PHOTO    = "[User sent a PHOTO]";
export const MEDIA_VIDEO    = "[User sent a VIDEO]";
export const MEDIA_AUDIO    = "[User sent AUDIO]";
export const MEDIA_DOCUMENT = "[User sent a DOCUMENT]";

// ── Telegram command replies ──────────────────────────────────────────────────

export const MSG_WELCOME = (
    "👋 Hi! I'm AI Diana — an AI that knows her professional background inside out.\n\n" +
    "Ask me anything about her (my) experience, projects, or skills. You can also:\n" +
    "• /contact — get my email, LinkedIn, and website\n" +
    "• /connect — sync this chat with the web version\n\n" +
    "What would you like to know?"
);

export const MSG_SYNC_SUCCESS = (
    "✅ Successfully synced with your Web conversation!\n\n" +
    "I remember everything we just talked about. We can continue right here."
);

export const MSG_CONTACT = (
    "You can always find me here:\n" +
    "Email: dianaxismail@gmail.com\n" +
    "LinkedIn: https://www.linkedin.com/in/dee-ismail/\n" +
    "Website: https://dianaismail.me"
);

export const MSG_PAIRING_UNAVAILABLE = "Sorry, pairing is currently unavailable.";

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
