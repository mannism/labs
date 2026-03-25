/**
 * Redis interactions for the Digital Twin chat engine.
 *
 * Responsibilities:
 *   - Chat history: get, save, append (keyed by chatId — supports both
 *     Telegram integer IDs and web string session IDs for cross-platform sharing).
 *   - Rate limiting: sliding-window counter stored as a Redis sorted set.
 *   - OTP pairing codes: short-lived keys (TTL 600 s) for linking web ↔ Telegram.
 *
 * Every exported async function wraps Redis calls in try-catch so that a transient
 * connection error never propagates as an unhandled exception into the engine.
 *
 * Port of telegram-digital-twin/app/core/memory.py.
 */

import { getRedisClient } from "./redis";
import * as config from "./config";

const CHAT_PREFIX    = "sessions";
const PAIRING_PREFIX = "pairing_codes";

/** Shape of a session document stored in Redis. */
export interface ChatHistory {
    summary: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

/**
 * Sliding-window rate limit using a Redis sorted set keyed by chatId.
 * Checked before loading chat history (cheaper abort if blocked).
 * Returns true if the request is allowed, false if blocked.
 * Fails closed — Redis error or unavailability counts as blocked.
 */
export async function checkRateLimit(chatId: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    const now         = Date.now() / 1000; // seconds (matches Python time.time())
    const windowStart = now - config.RATE_LIMIT_WINDOW;
    const key         = `rate_limit:${chatId}`;

    try {
        const pipe = client.pipeline();
        pipe.zremrangebyscore(key, "-inf", windowStart.toString());
        pipe.zcard(key);
        const results = await pipe.exec();

        const count = (results?.[1]?.[1] as number) ?? 0;
        if (count >= config.RATE_LIMIT_COUNT) return false;

        // Allowed — record this request (member = timestamp string, score = timestamp)
        await client.zadd(key, now, String(now));
        await client.expire(key, config.RATE_LIMIT_WINDOW);
        return true;
    } catch (err) {
        console.error("[twin/memory] checkRateLimit error:", err);
        return false; // Fail closed on Redis errors
    }
}

// ── OTP rate limiting ─────────────────────────────────────────────────────────

/**
 * Rate limits OTP verification attempts per IP address.
 * Allows max 10 attempts per 10 minutes. Fails open if Redis is down.
 */
export async function checkOtpRateLimit(ip: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return true; // Fail open — OTP won't work anyway

    try {
        const key   = `otp_attempts:${ip}`;
        const count = await client.incr(key);
        if (count === 1) await client.expire(key, 600);
        return count <= 10;
    } catch (err) {
        console.error("[twin/memory] checkOtpRateLimit error:", err);
        return true; // Fail open
    }
}

// ── OTP pairing ───────────────────────────────────────────────────────────────

/**
 * Verifies a pairing code and returns the associated chatId if valid.
 * Deletes the code on first use (one-time token).
 */
export async function verifyPairingCode(code: string): Promise<string | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
        const key    = `${PAIRING_PREFIX}:${code}`;
        const chatId = await client.get(key);
        if (chatId) {
            await client.del(key);
            return chatId;
        }
        return null;
    } catch (err) {
        console.error("[twin/memory] verifyPairingCode error:", err);
        return null;
    }
}

// ── OTP pairing code generation ───────────────────────────────────────────────

/**
 * Generates an 8-digit OTP and stores it in Redis with a 600s TTL.
 * Used by the Telegram /connect command to initiate web ↔ Telegram session linking.
 * Returns "ERROR" if Redis is unavailable or throws (caller should check).
 */
export async function generatePairingCode(chatId: string): Promise<string> {
    const client = getRedisClient();
    if (!client) return "ERROR";

    try {
        const code = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
        await client.setex(`${PAIRING_PREFIX}:${code}`, 600, chatId);
        return code;
    } catch (err) {
        console.error("[twin/memory] generatePairingCode error:", err);
        return "ERROR";
    }
}

// ── Session aliasing (Web ↔ Telegram) ─────────────────────────────────────────

/**
 * Creates a permanent alias so the Telegram chat reads/writes the web session's
 * Redis key, enabling full history sync across both interfaces.
 */
export async function linkTelegramToWeb(
    telegramChatId: string,
    webSessionId: string
): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
        await client.set(`alias:${telegramChatId}`, webSessionId);
    } catch (err) {
        console.error("[twin/memory] linkTelegramToWeb error:", err);
    }
}

// ── Chat history ──────────────────────────────────────────────────────────────

/** Resolves an alias if one exists, otherwise returns the original chatId. */
async function getActualChatId(chatId: string): Promise<string> {
    const client = getRedisClient();
    if (!client) return chatId;

    try {
        const alias = await client.get(`alias:${chatId}`);
        return alias ?? chatId;
    } catch {
        return chatId;
    }
}

/**
 * Retrieves the chat document (history + summary) from Redis.
 * Returns an empty structure if no history exists or Redis is unavailable.
 */
export async function getChatHistory(chatId: string): Promise<ChatHistory> {
    const empty: ChatHistory = { summary: "", messages: [] };
    const client = getRedisClient();
    if (!client) return empty;

    try {
        const actualId = await getActualChatId(chatId);
        const raw      = await client.get(`${CHAT_PREFIX}:${actualId}`);
        if (!raw) return empty;
        return JSON.parse(raw) as ChatHistory;
    } catch (err) {
        console.error(`[twin/memory] getChatHistory error for ${chatId}:`, err);
        return empty;
    }
}

/**
 * Saves the chat history and summary to Redis with a 30-day rolling TTL.
 */
export async function saveChatHistory(chatId: string, data: ChatHistory): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
        const actualId = await getActualChatId(chatId);
        const key      = `${CHAT_PREFIX}:${actualId}`;
        await client.set(key, JSON.stringify(data));
        await client.expire(key, 30 * 24 * 3600);
    } catch (err) {
        console.error(`[twin/memory] saveChatHistory error for ${chatId}:`, err);
    }
}

/**
 * Appends a message to the local history structure (does not persist to Redis).
 * Call saveChatHistory() after the full exchange is complete.
 */
export function appendMessage(
    data: ChatHistory,
    role: "user" | "assistant",
    content: string
): void {
    data.messages.push({ role, content });
}
