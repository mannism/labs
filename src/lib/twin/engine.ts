/**
 * The core chat engine for the Digital Twin.
 *
 * Orchestrates the full message flow for web requests:
 *   Input → Redis guard → Rate limit → History → OpenAI stream → Summarize → Save
 *
 * Key design decisions (ported from telegram-digital-twin/app/core/engine.py):
 *   - Rate limit is checked before loading history (cheaper abort if blocked).
 *   - Tiered context: always-injected files + on-demand files via keyword matching.
 *   - Interface signal informs the model it is on "web".
 *   - Conversation state signal prevents re-greeting on follow-up turns.
 *   - Only the streaming path is implemented — the ChatWidget uses /api/chat/stream only.
 */

import OpenAI from "openai";
import * as config  from "./config";
import * as memory  from "./memory";
import * as prompts from "./prompts";
import * as MESSAGES from "./messages";
import { getRedisClient } from "./redis";

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

type OAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/** Formats a dict payload as an SSE data line. */
function sse(payload: Record<string, unknown>): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Builds the full OpenAI message array.
 *
 * Message construction order (same 6 steps as Python engine.py):
 *   1. System prompt (with always-injected context, hot-reloaded via mtime cache)
 *   2. On-demand context (injected when keywords match)
 *   3. Interface signal ("The user is chatting via web.")
 *   4. Previous conversation summary (if any)
 *   5. Conversation state signal (prevents repeated greetings on continuing sessions)
 *   6. Recent message history
 */
function buildApiMessages(
    userText: string,
    history: memory.ChatHistory,
    iface: string
): OAIMessage[] {
    const msgs: OAIMessage[] = [];

    // 1. System prompt
    msgs.push({ role: "system", content: prompts.getSystemPrompt() });

    // 2. On-demand context
    for (const key of prompts.checkOnDemandKeywords(userText)) {
        const extra = prompts.getOnDemandContext(key);
        if (extra) {
            msgs.push({ role: "system", content: `Additional Context:\n${extra}` });
        }
    }

    // 3. Interface signal
    msgs.push({ role: "system", content: `The user is chatting via ${iface}.` });

    // 4. Previous summary (compressed older history)
    if (history.summary) {
        msgs.push({ role: "system", content: `Previous Conversation Summary: ${history.summary}` });
    }

    // 5. Conversation state signal — prevents re-greeting on continuing sessions
    if (history.messages.length > 0) {
        msgs.push({
            role: "system",
            content:
                "This is a CONTINUING conversation. Do NOT use an opening salutation or introduction. " +
                "Respond directly to the user's latest message.",
        });
    }

    // 6. Recent message history
    for (const msg of history.messages) {
        msgs.push({ role: msg.role, content: msg.content });
    }

    return msgs;
}

/**
 * Summarizes older messages when the count exceeds SUMMARISATION_THRESHOLD.
 * Retains the last 4 messages (2 exchanges) for conversational continuity.
 * Mutates the history object in place; caller must save afterwards.
 */
async function summarizeMemory(history: memory.ChatHistory): Promise<void> {
    if (history.messages.length < config.SUMMARISATION_THRESHOLD) return;

    const retainCount = 4;
    if (history.messages.length <= retainCount) return;

    const toSummarize = history.messages.slice(0, -retainCount);
    const toKeep      = history.messages.slice(-retainCount);

    let text = `Previous Summary: ${history.summary || "None"}\n\nRecent Conversation to Append:\n`;
    for (const msg of toSummarize) {
        text += `${msg.role}: ${msg.content}\n`;
    }

    try {
        const completion = await openai.chat.completions.create({
            model:                config.OPENAI_MODEL,
            messages:             [
                { role: "system", content: prompts.getSummarisePrompt() },
                { role: "user",   content: text },
            ],
            max_completion_tokens: 400,
            temperature:           0.3,
        });
        history.summary  = completion.choices[0].message.content ?? "";
        history.messages = toKeep;
    } catch (err) {
        console.error("[twin/engine] summarization error:", err);
        // Non-fatal — leave history unchanged and continue
    }
}

/**
 * Non-streaming variant of the chat engine — returns the full AI response.
 * Used by the Telegram webhook handler (Telegram can't consume SSE).
 * Same pre-flight checks (Redis guard, rate limit, history) as the streaming path.
 */
export async function processUserMessage(
    chatId: string,
    userText: string,
    iface: string = "telegram"
): Promise<{ status: "success" | "rate_limited" | "error"; responseText: string }> {
    // 0. Guard: Redis must be available
    if (!getRedisClient()) {
        return { status: "error", responseText: MESSAGES.MSG_STORAGE_OFFLINE };
    }

    // 1. Rate limit check
    const allowed = await memory.checkRateLimit(chatId);
    if (!allowed) {
        console.warn(`[twin/engine] rate limit exceeded for ${chatId}`);
        return { status: "rate_limited", responseText: MESSAGES.MSG_RATE_LIMITED };
    }

    // 2. Retrieve history and append user message
    const history = await memory.getChatHistory(chatId);
    memory.appendMessage(history, "user", userText);

    // 3. Build OpenAI message list
    const apiMessages = buildApiMessages(userText, history, iface);

    // 4. Single (non-streaming) OpenAI call
    let responseText: string;
    try {
        const completion = await openai.chat.completions.create({
            model:                config.OPENAI_MODEL,
            messages:             apiMessages,
            max_completion_tokens: 800,
            temperature:           0.7,
        });
        responseText = completion.choices[0]?.message?.content ?? MESSAGES.MSG_AI_ERROR;
    } catch (err) {
        console.error("[twin/engine] OpenAI error:", err);
        return { status: "error", responseText: MESSAGES.MSG_AI_ERROR };
    }

    // 5. Append assistant response, summarize if needed, and persist
    memory.appendMessage(history, "assistant", responseText);
    await summarizeMemory(history);
    await memory.saveChatHistory(chatId, history);

    return { status: "success", responseText };
}

/**
 * Streaming variant of the chat engine — yields SSE-formatted strings.
 *
 * SSE event shapes:
 *   {"type": "error",  "text": "..."}  — pre-flight failure; stream ends immediately
 *   {"type": "chunk",  "text": "..."}  — incremental token from OpenAI
 *   {"type": "done"}                   — stream complete, history saved
 */
export async function* processUserMessageStream(
    chatId: string,
    userText: string,
    iface: string = "web"
): AsyncGenerator<string> {
    // 0. Guard: Redis must be available (rate limiting requires it)
    if (!getRedisClient()) {
        yield sse({ type: "error", text: MESSAGES.MSG_STORAGE_OFFLINE });
        return;
    }

    // 1. Rate limit check (before loading full history — cheaper if blocked)
    const allowed = await memory.checkRateLimit(chatId);
    if (!allowed) {
        console.warn(`[twin/engine] rate limit exceeded for ${chatId}`);
        yield sse({ type: "error", text: MESSAGES.MSG_RATE_LIMITED });
        return;
    }

    // 2. Retrieve history and append the incoming user message
    const history = await memory.getChatHistory(chatId);
    memory.appendMessage(history, "user", userText);

    // 3. Build OpenAI message list
    const apiMessages = buildApiMessages(userText, history, iface);

    // 4. Stream OpenAI response, accumulating the full text for history
    let fullResponse = "";
    try {
        const stream = await openai.chat.completions.create({
            model:                config.OPENAI_MODEL,
            messages:             apiMessages,
            max_completion_tokens: 800,
            temperature:           0.7,
            stream:                true,
        });

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                fullResponse += delta;
                yield sse({ type: "chunk", text: delta });
            }
        }
    } catch (err) {
        console.error("[twin/engine] OpenAI streaming error:", err);
        yield sse({ type: "error", text: MESSAGES.MSG_AI_ERROR });
        return;
    }

    // 5. Append the assistant response, summarize if needed, and persist
    memory.appendMessage(history, "assistant", fullResponse);
    await summarizeMemory(history);
    await memory.saveChatHistory(chatId, history);

    yield sse({ type: "done" });
}
