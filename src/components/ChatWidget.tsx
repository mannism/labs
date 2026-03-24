"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ExternalLink, Link, Send } from "lucide-react";

/** Shape of a single chat bubble in the messages list. */
interface ChatMessage {
    role: "user" | "assistant";
    /** Raw accumulated text while streaming; final parsed HTML once done. */
    text: string;
    /** True while SSE chunks are still arriving — renders blinking cursor. */
    streaming?: boolean;
    /** True while waiting for the first chunk — renders bouncing dots. */
    loading?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_CHAT_API_URL ?? "https://twin.dianaismail.me";
const TELEGRAM_BOT = "https://t.me/deeismbot";

/**
 * Converts a plain-text AI response to safe HTML.
 * HTML entities are escaped first to prevent XSS; the content source is the
 * AI backend (not user input), so dangerouslySetInnerHTML is safe here.
 * Ported verbatim from telegram-digital-twin/app/interfaces/web/static/script.js.
 */
function parseMarkdown(text: string, sessionId: string | null): string {
    let html = text;

    // 1. Escape HTML entities to prevent injection
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Inject session ID into Telegram bot links for seamless auto-pairing
    if (sessionId) {
        html = html.replace(
            /https:\/\/t\.me\/deeismbot/g,
            `${TELEGRAM_BOT}?start=${sessionId}`
        );
    }

    // 2. Markdown-style links [label](url) — must precede bare URL detection
    html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // 3. Bare URLs — negative lookbehind avoids double-linking href="…" values
    html = html.replace(/(?<!href=")(https?:\/\/[^\s<"'),\]]+)/g, (url) => {
        const stripped = url.replace(/[.,!?;:]+$/, "");
        const trailing = url.slice(stripped.length);
        return `<a href="${stripped}" target="_blank" rel="noopener noreferrer">${stripped}</a>${trailing}`;
    });

    // 4. Bold / italic
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

    // 5. Bullet lists
    html = html.replace(/^\s*[-•]\s(.*)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, "<ul>$&</ul>");

    // 6. Newlines → <br>
    html = html.replace(/\n/g, "<br>");

    return html;
}

/**
 * FloatingChatWidget — AI Diana
 *
 * A fixed-position chat widget that streams responses from the Digital Twin
 * FastAPI backend via Server-Sent Events. Supports Telegram account linking
 * and auto-pairing from the `?connect=` URL query param.
 *
 * Styling uses CSS custom properties from globals.css so dark/light mode
 * is handled automatically without any additional state.
 */
export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkCode, setLinkCode] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    /** Accumulates SSE text chunks outside React state to avoid closure staleness. */
    const rawTextRef = useRef("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ── Session ID (SSR-safe: runs only on client) ───────────────────────────
    useEffect(() => {
        let id = localStorage.getItem("diana_twin_session_id");
        if (!id) {
            id = "web_" + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("diana_twin_session_id", id);
        }
        setSessionId(id);
    }, []);

    // ── Auto-scroll to latest message ────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── Telegram link code processing ────────────────────────────────────────
    const processLinkCode = useCallback(async (code: string) => {
        if (!code.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/api/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim() }),
            });
            const data = await res.json();
            if (data.success && data.linked_session_id) {
                localStorage.setItem("diana_twin_session_id", data.linked_session_id);
                setSessionId(data.linked_session_id);
                setIsOpen(true);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        text: "✅ Linked with Telegram! Your conversation history is now synced.",
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", text: `❌ ${data.message ?? "Could not link account."}` },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", text: "❌ Failed to connect to server." },
            ]);
        }
    }, []);

    // ── Auto-link from ?connect= URL param (runs after sessionId is ready) ──
    useEffect(() => {
        if (!sessionId) return;
        const params = new URLSearchParams(window.location.search);
        const connectCode = params.get("connect");
        if (connectCode) {
            window.history.replaceState({}, "", window.location.pathname);
            setTimeout(() => processLinkCode(connectCode), 500);
        }
    }, [sessionId, processLinkCode]);

    // ── SSE streaming send ───────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || !sessionId || isStreaming) return;

        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";

        setMessages((prev) => [
            ...prev,
            { role: "user", text },
            { role: "assistant", text: "", loading: true },
        ]);

        setIsStreaming(true);
        rawTextRef.current = "";

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);

        const showError = (msg: string) => {
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", text: msg };
                return updated;
            });
        };

        try {
            const response = await fetch(`${API_BASE}/api/chat/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId, text }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                showError("Server error. Please try again.");
                return;
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let firstChunk = true;

            /** Processes one complete `data: {...}` SSE event string. */
            function handleEvent(eventStr: string) {
                const line = eventStr.trim();
                if (!line.startsWith("data: ")) return;
                let payload: { type: string; text?: string };
                try {
                    payload = JSON.parse(line.slice(6));
                } catch {
                    return;
                }

                if (payload.type === "chunk" && payload.text) {
                    if (firstChunk) {
                        firstChunk = false;
                        rawTextRef.current = payload.text;
                    } else {
                        rawTextRef.current += payload.text;
                    }
                    const snap = rawTextRef.current;
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            role: "assistant",
                            text: snap,
                            streaming: true,
                        };
                        return updated;
                    });
                } else if (payload.type === "done") {
                    const finalHtml = parseMarkdown(rawTextRef.current, sessionId);
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: "assistant", text: finalHtml };
                        return updated;
                    });
                } else if (payload.type === "error") {
                    showError(payload.text ?? "Error processing request.");
                }
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split("\n\n");
                buffer = events.pop() ?? "";
                for (const eventStr of events) {
                    if (eventStr.trim()) handleEvent(eventStr);
                }
            }
            if (buffer.trim()) handleEvent(buffer);

        } catch (err) {
            clearTimeout(timeoutId);
            showError(
                err instanceof Error && err.name === "AbortError"
                    ? "Request timed out. Please try again."
                    : "Network error. Please try again."
            );
        } finally {
            setIsStreaming(false);
            rawTextRef.current = "";
        }
    }, [input, sessionId, isStreaming]);

    // ── Auto-resize textarea ─────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const telegramUrl = sessionId ? `${TELEGRAM_BOT}?start=${sessionId}` : TELEGRAM_BOT;

    return (
        <>
            {/* ── Floating toggle button ─────────────────────────────────── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        className="chat-toggle-btn"
                        onClick={() => setIsOpen(true)}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 260 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Open AI Diana chat"
                    >
                        <MessageCircle className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ── Chat window ────────────────────────────────────────────── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="chat-window"
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        role="dialog"
                        aria-label="AI Diana chat"
                    >
                        {/* Header */}
                        <div
                            style={{
                                borderBottom: "1px solid var(--border-subtle)",
                                padding: "1rem 1.25rem",
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <p
                                        className="font-display font-bold text-base"
                                        style={{ color: "var(--text-primary)", margin: 0 }}
                                    >
                                        AI Diana
                                    </p>
                                    <p
                                        className="font-mono"
                                        style={{ color: "var(--text-muted)", fontSize: "0.7rem", margin: 0 }}
                                    >
                                        Ask me anything
                                    </p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    {/* Open in Telegram */}
                                    <a
                                        href={telegramUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="card-icon-btn"
                                        title="Continue on Telegram"
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    {/* Toggle Telegram link input */}
                                    <button
                                        className="card-icon-btn"
                                        onClick={() => setShowLinkInput((v) => !v)}
                                        title="Link Telegram account"
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <Link className="w-4 h-4" />
                                    </button>
                                    {/* Close */}
                                    <button
                                        className="card-icon-btn"
                                        onClick={() => setIsOpen(false)}
                                        aria-label="Close chat"
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Inline Telegram link code input */}
                            <AnimatePresence>
                                {showLinkInput && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: "hidden" }}
                                    >
                                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                                            <input
                                                value={linkCode}
                                                onChange={(e) => setLinkCode(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        processLinkCode(linkCode);
                                                        setShowLinkInput(false);
                                                        setLinkCode("");
                                                    }
                                                }}
                                                placeholder="8-digit code from /connect"
                                                style={{
                                                    flex: 1,
                                                    background: "var(--tab-bg)",
                                                    border: "1px solid var(--border-subtle)",
                                                    borderRadius: "0.5rem",
                                                    padding: "0.375rem 0.625rem",
                                                    color: "var(--text-primary)",
                                                    fontSize: "0.75rem",
                                                    fontFamily: "var(--font-geist-mono)",
                                                    outline: "none",
                                                }}
                                            />
                                            <button
                                                className="drawer-btn-primary"
                                                style={{
                                                    borderRadius: "0.5rem",
                                                    padding: "0.375rem 0.875rem",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                }}
                                                onClick={() => {
                                                    processLinkCode(linkCode);
                                                    setShowLinkInput(false);
                                                    setLinkCode("");
                                                }}
                                            >
                                                Link
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Messages */}
                        <div
                            className="custom-scrollbar"
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "1rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem",
                            }}
                        >
                            {messages.length === 0 && (
                                <p
                                    style={{
                                        color: "var(--text-muted)",
                                        fontSize: "0.8rem",
                                        textAlign: "center",
                                        marginTop: "2rem",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    Hi! I&apos;m Diana&apos;s AI twin.
                                    <br />
                                    Ask me about her work, skills, or projects.
                                </p>
                            )}

                            {messages.map((msg, i) => {
                                if (msg.loading) {
                                    return (
                                        <div key={i} className="chat-msg-assistant">
                                            <div className="chat-loading-dots">
                                                <span /><span /><span />
                                            </div>
                                        </div>
                                    );
                                }
                                if (msg.role === "user") {
                                    return (
                                        <div key={i} className="chat-msg-user">
                                            {msg.text}
                                        </div>
                                    );
                                }
                                // Assistant — streaming: textContent (safe); done: innerHTML (HTML-escaped + markdown)
                                if (msg.streaming) {
                                    return (
                                        <div key={i} className="chat-msg-assistant streaming">
                                            {msg.text}
                                        </div>
                                    );
                                }
                                return (
                                    <div
                                        key={i}
                                        className="chat-msg-assistant"
                                        dangerouslySetInnerHTML={{ __html: msg.text }}
                                    />
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                borderTop: "1px solid var(--border-subtle)",
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything… (Enter to send)"
                                    rows={1}
                                    disabled={isStreaming}
                                    style={{
                                        flex: 1,
                                        resize: "none",
                                        background: "var(--tab-bg)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "0.75rem",
                                        padding: "0.625rem 0.875rem",
                                        color: "var(--text-primary)",
                                        fontSize: "0.875rem",
                                        fontFamily: "var(--font-open-sans)",
                                        outline: "none",
                                        lineHeight: "1.5",
                                        maxHeight: "100px",
                                        overflowY: "auto",
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isStreaming || !input.trim()}
                                    className="drawer-btn-primary"
                                    aria-label="Send message"
                                    style={{
                                        borderRadius: "0.75rem",
                                        padding: "0.625rem 0.875rem",
                                        flexShrink: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: isStreaming || !input.trim() ? 0.45 : 1,
                                        cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
                                    }}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
