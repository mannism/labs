/**
 * Redis interactions for the Digital Twin chat engine.
 *
 * Responsibilities:
 *   - Chat history: get, save, append (keyed by chatId — supports both
 *     Telegram integer IDs and web string session IDs for cross-platform sharing).
 *   - Rate limiting: sliding-window counter stored as a Redis sorted set.
 *   - OTP pairing codes: short-lived keys (TTL 600 s) for linking web ↔ Telegram.
 *
 * Port of telegram-digital-twin/app/core/memory.py (web-relevant functions only).
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
 * Fails closed — Redis down means no messages allowed.
 */
export async function checkRateLimit(chatId: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    const now         = Date.now() / 1000; // seconds (matches Python time.time())
    const windowStart = now - config.RATE_LIMIT_WINDOW;
    const key         = `rate_limit:${chatId}`;

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
}

// ── OTP rate limiting ─────────────────────────────────────────────────────────

/**
 * Rate limits OTP verification attempts per IP address.
 * Allows max 10 attempts per 10 minutes. Fails open if Redis is down.
 */
export async function checkOtpRateLimit(ip: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return true; // Fail open — OTP won't work anyway

    const key   = `otp_attempts:${ip}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, 600);
    return count <= 10;
}

// ── OTP pairing ───────────────────────────────────────────────────────────────

/**
 * Verifies a pairing code and returns the associated chatId if valid.
 * Deletes the code on first use (one-time token).
 */
export async function verifyPairingCode(code: string): Promise<string | null> {
    const client = getRedisClient();
    if (!client) return null;

    const key    = `${PAIRING_PREFIX}:${code}`;
    const chatId = await client.get(key);
    if (chatId) {
        await client.del(key);
        return chatId;
    }
    return null;
}

// ── Chat history ──────────────────────────────────────────────────────────────

/** Resolves an alias if one exists, otherwise returns the original chatId. */
async function getActualChatId(chatId: string): Promise<string> {
    const client = getRedisClient();
    if (!client) return chatId;
    const alias = await client.get(`alias:${chatId}`);
    return alias ?? chatId;
}

/**
 * Retrieves the chat document (history + summary) from Redis.
 * Returns an empty structure if no history exists or Redis is unavailable.
 */
export async function getChatHistory(chatId: string): Promise<ChatHistory> {
    const empty: ChatHistory = { summary: "", messages: [] };
    const client = getRedisClient();
    if (!client) return empty;

    const actualId = await getActualChatId(chatId);
    const raw      = await client.get(`${CHAT_PREFIX}:${actualId}`);
    if (!raw) return empty;

    try {
        return JSON.parse(raw) as ChatHistory;
    } catch {
        console.error(`[twin/memory] failed to parse history for ${chatId}`);
        return empty;
    }
}

/**
 * Saves the chat history and summary to Redis with a 30-day rolling TTL.
 */
export async function saveChatHistory(chatId: string, data: ChatHistory): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    const actualId = await getActualChatId(chatId);
    const key      = `${CHAT_PREFIX}:${actualId}`;
    await client.set(key, JSON.stringify(data));
    await client.expire(key, 30 * 24 * 3600);
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
