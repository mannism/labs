/**
 * Telegram Bot API client for the Digital Twin.
 *
 * Uses native fetch() (Node.js 18+) — no additional HTTP client dependency.
 * Port of telegram-digital-twin/app/interfaces/telegram/client.py.
 *
 * Both functions fail silently if TELEGRAM_TOKEN is not configured,
 * so they are safe to import even in environments without the bot.
 */

import { TELEGRAM_TOKEN } from "./config";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

/**
 * Sends a "typing..." indicator while a response is being generated.
 * Non-critical — errors are swallowed to avoid failing the webhook response.
 */
export async function sendTypingAction(chatId: number | string): Promise<void> {
    if (!TELEGRAM_TOKEN) return;
    try {
        await fetch(`${TELEGRAM_API}/sendChatAction`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ chat_id: chatId, action: "typing" }),
            signal:  AbortSignal.timeout(5_000),
        });
    } catch {
        // Non-critical — typing indicator failure should not affect message delivery
    }
}

/**
 * Sends a text message to a Telegram chat.
 * Uses Markdown parse mode to match the Digital Twin's formatting behavior.
 */
export async function sendMessage(chatId: number | string, text: string): Promise<void> {
    if (!TELEGRAM_TOKEN) {
        console.error("[twin/telegram] TELEGRAM_TOKEN is not set.");
        return;
    }
    try {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
            signal:  AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
            console.error(`[twin/telegram] sendMessage failed: ${res.status} ${res.statusText}`);
        }
    } catch (err) {
        console.error("[twin/telegram] sendMessage error:", err);
    }
}
