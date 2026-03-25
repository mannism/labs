/**
 * POST /api/telegram — Telegram Bot webhook handler.
 *
 * Receives incoming updates from Telegram, validates the webhook secret,
 * routes built-in commands, and delegates regular messages to the core engine.
 *
 * Supported commands (exact port of telegram-digital-twin/app/interfaces/telegram/router.py):
 *   /start              — Welcome message for new users
 *   /start web_{id}     — Auto-pairs the Telegram chat with a web session (deep link)
 *   /contact            — Returns Diana's contact details
 *   /connect            — Generates an OTP deep link to sync with the web widget
 *   <anything else>     — Delegates to engine.processUserMessage() (non-streaming)
 *
 * No CORS headers — this endpoint is called by Telegram servers, not browsers.
 */

import { NextRequest }                              from "next/server";
import { processUserMessage }                       from "@/lib/twin/engine";
import { generatePairingCode, linkTelegramToWeb }   from "@/lib/twin/memory";
import { sendMessage, sendTypingAction }             from "@/lib/twin/telegram";
import { TELEGRAM_WEBHOOK_SECRET, LABS_URL }         from "@/lib/twin/config";
import {
    MEDIA_PHOTO, MEDIA_VIDEO, MEDIA_AUDIO, MEDIA_DOCUMENT,
    MSG_WELCOME, MSG_SYNC_SUCCESS, MSG_CONTACT,
    MSG_PAIRING_UNAVAILABLE, MSG_TOO_LONG,
} from "@/lib/twin/messages";

const MAX_INPUT_LENGTH = 1000;

// ── Telegram update types ─────────────────────────────────────────────────────

interface TelegramChat {
    id: number;
}

interface TelegramMessage {
    message_id: number;
    chat:       TelegramChat;
    text?:      string;
    photo?:     unknown[];
    video?:     unknown;
    audio?:     unknown;
    voice?:     unknown;
    document?:  unknown;
}

interface TelegramUpdate {
    update_id: number;
    message?:  TelegramMessage;
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
    // 1. Validate webhook secret (when configured)
    if (TELEGRAM_WEBHOOK_SECRET) {
        const secret = req.headers.get("x-telegram-bot-api-secret-token");
        if (secret !== TELEGRAM_WEBHOOK_SECRET) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    // 2. Parse update
    let update: TelegramUpdate;
    try {
        update = await req.json() as TelegramUpdate;
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!update.message) {
        return Response.json({ status: "ignored" });
    }

    const { chat, text, photo, video, audio, voice, document } = update.message;
    const chatId = String(chat.id);

    // 3. Determine user text — fall back to media placeholders if no text
    let userText = text;
    if (!userText) {
        if (photo)              userText = MEDIA_PHOTO;
        else if (video)         userText = MEDIA_VIDEO;
        else if (voice || audio) userText = MEDIA_AUDIO;
        else if (document)      userText = MEDIA_DOCUMENT;
        else {
            return Response.json({ status: "ignored" });
        }
    }

    // 4. Input length guard
    if (userText.length > MAX_INPUT_LENGTH) {
        await sendMessage(chatId, MSG_TOO_LONG);
        return Response.json({ status: "ignored" });
    }

    // 5. Command routing
    const cmd = userText.trim().toLowerCase();

    if (cmd === "/start") {
        await sendMessage(chatId, MSG_WELCOME);
        return Response.json({ status: "command_handled" });
    }

    if (cmd.startsWith("/start web_")) {
        const webSessionId = cmd.split(" ")[1]?.trim() ?? "";
        if (webSessionId) {
            await linkTelegramToWeb(chatId, webSessionId);
            await sendMessage(chatId, MSG_SYNC_SUCCESS);
        }
        return Response.json({ status: "command_handled" });
    }

    if (cmd === "/contact" || cmd === "contact me") {
        await sendMessage(chatId, MSG_CONTACT);
        return Response.json({ status: "command_handled" });
    }

    if (cmd === "/connect" || cmd === "connect") {
        const code = await generatePairingCode(chatId);
        if (code === "ERROR") {
            await sendMessage(chatId, MSG_PAIRING_UNAVAILABLE);
        } else {
            const deepLink =
                `Click this link to seamlessly continue our conversation on the Web:\n` +
                `${LABS_URL}?connect=${code}\n\n` +
                `This link expires in 10 minutes.`;
            await sendMessage(chatId, deepLink);
        }
        return Response.json({ status: "command_handled" });
    }

    // 6. Regular message → send typing indicator then call the engine
    await sendTypingAction(chatId);
    const result = await processUserMessage(chatId, userText, "telegram");

    await sendMessage(chatId, result.responseText);
    return Response.json({ status: result.status });
}
