"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import * as m from "framer-motion/m";
import { AnimatePresence } from "framer-motion";
import { MessageCircle, X, ExternalLink, Link, Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useTextScramble } from "./v2/useTextScramble";
import { useReducedMotion } from "./v2/useReducedMotion";

/** Shape of a single chat bubble in the messages list. */
interface ChatMessage {
    role: "user" | "assistant";
    /** Partial or final parsed HTML for the assistant; plain text for the user. */
    text: string;
    /** True while the typewriter animation is revealing the assistant response. */
    typewriter?: boolean;
    /** True while waiting for the first SSE chunk — renders bouncing dots. */
    loading?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_CHAT_API_URL ?? "";
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

    // 5. List handling — extract full list blocks, parse as a unit
    const listBlockRe =
        /((?:^[ \t]*(?:[-\u2022*]|\d+\.)\s+.*(?:\n(?![ \t]*(?:[-\u2022*]|\d+\.)\s)(?!\n).*)*\n?)+)/gm;

    html = html.replace(listBlockRe, (block) => {
        const items = block
            .split(/(?=^[ \t]*(?:[-\u2022*]|\d+\.)\s)/m)
            .map((s) => s.trim())
            .filter(Boolean);

        const lis = items
            .map((item) => {
                const content = item.replace(/^[ \t]*(?:[-\u2022*]|\d+\.)\s+/, "").replace(/\n/g, " ").trim();
                return `<li style="margin:0;padding:0">${content}</li>`;
            })
            .join("");

        return `<ul style="margin:0.4rem 0;padding-left:1.25rem;list-style:disc;display:flex;flex-direction:column;gap:0.2rem">${lis}</ul>`;
    });

    // 6. Paragraphs — double newlines become paragraph breaks, single newlines become <br>
    html = html.replace(/\n{2,}/g, '</p><p style="margin-top:0.4rem">');
    html = html.replace(/\n/g, "<br>");
    html = '<p style="margin:0">' + html + "</p>";

    // Clean up empty paragraphs
    html = html.replace(/<p[^>]*>\s*<\/p>/g, "");

    return html;
}

/**
 * FloatingChatWidget — AI Diana (v2 Speculative Interface)
 *
 * A fixed-position chat widget that streams responses from the Digital Twin
 * FastAPI backend via Server-Sent Events. SSE chunks are accumulated silently;
 * the full response is revealed with a typewriter character-by-character animation
 * once the complete response arrives. Supports Telegram account linking and
 * auto-pairing from the `?connect=` URL query param.
 *
 * Styled with v2 design tokens: white surfaces, chartreuse accent, Space Grotesk
 * typography, clinical aesthetic. CSS classes in globals.css, inline v2 tokens.
 */
export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkCode, setLinkCode] = useState("");
    const [bottomOffset, setBottomOffset] = useState(30);
    const prefersReducedMotion = useReducedMotion();

    /** Ghost-type scramble on the header title — re-triggers on each open via openCount key. */
    const { text: headerText } = useTextScramble("AI Diana", {
        speed: 25,
        delay: 100,
        enabled: isOpen,
    });

    /** Ref on the scrollable messages container — needed for explicit scrollTop math. */
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    /** Ref assigned to the latest user message div — scroll target after send. */
    const lastUserMsgRef = useRef<HTMLDivElement>(null);
    /** Accumulates SSE text chunks outside React state to avoid closure staleness. */
    const rawTextRef = useRef("");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    /** Active typewriter interval handle — cleared on completion or unmount. */
    const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Session ID (SSR-safe: runs only on client) ───────────────────────────
    useEffect(() => {
        let id = localStorage.getItem("diana_twin_session_id");
        if (!id) {
            id = "web_" + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("diana_twin_session_id", id);
        }
        setSessionId(id);
    }, []);


    // ── Cleanup typewriter interval on unmount ───────────────────────────────
    useEffect(() => {
        return () => {
            if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
        };
    }, []);

    // ── Focus input when chat opens ──────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen]);

    // ── Refocus input when response is complete ──────────────────────────────
    useEffect(() => {
        if (!isStreaming) {
            inputRef.current?.focus();
        }
    }, [isStreaming]);

    // ── Footer-aware bottom offset ────────────────────────────────────────────
    // Normally 30px from viewport bottom. When the footer scrolls into view,
    // lifts the widget above it (footerVisiblePx + 12px clearance).
    useEffect(() => {
        const CLEARANCE = 12;
        const update = () => {
            const footer = document.querySelector("footer");
            if (!footer) return;
            const footerVisible = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
            setBottomOffset(footerVisible > 0 ? footerVisible + CLEARANCE : 30);
        };
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });
        update();
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

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
                        text: "Linked with Telegram! Your conversation history is now synced.",
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", text: `${data.message ?? "Could not link account."}` },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", text: "Failed to connect to server." },
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

        // flushSync forces React to synchronously commit the new messages to the
        // DOM before continuing, so lastUserMsgRef.current is guaranteed to point
        // to the new user message bubble by the time we measure and scroll.
        flushSync(() => {
            setMessages((prev) => [
                ...prev,
                { role: "user", text },
                { role: "assistant", text: "", loading: true },
            ]);
        });

        const container = messagesContainerRef.current;
        const userMsg = lastUserMsgRef.current;
        if (container && userMsg) {
            container.scrollTo({
                top: container.scrollTop + userMsg.getBoundingClientRect().top - container.getBoundingClientRect().top,
                behavior: "smooth",
            });
        }

        setIsStreaming(true);
        rawTextRef.current = "";
        // Tracks whether the typewriter took ownership of cleanup (success path).
        // If false when finally runs, cleanup is done there instead (error path).
        let typewriterStarted = false;

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
                    // Accumulate silently — loading dots remain visible until "done"
                    rawTextRef.current += payload.text;

                } else if (payload.type === "done") {
                    const rawText = rawTextRef.current;
                    // Target ~80 ticks at 16ms ≈ 1.3s for any response length
                    const charsPerStep = Math.max(1, Math.ceil(rawText.length / 80));
                    let charIndex = 0;
                    typewriterStarted = true;

                    typewriterIntervalRef.current = setInterval(() => {
                        charIndex = Math.min(charIndex + charsPerStep, rawText.length);
                        // Re-parse on each tick so inline formatting (bold, links, lists)
                        // is correctly applied to the partial text as it grows.
                        const partialHtml = parseMarkdown(rawText.slice(0, charIndex), sessionId);
                        const complete = charIndex >= rawText.length;

                        setMessages((prev) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                role: "assistant",
                                text: partialHtml,
                                ...(complete ? {} : { typewriter: true }),
                            };
                            return updated;
                        });

                        if (complete) {
                            clearInterval(typewriterIntervalRef.current!);
                            typewriterIntervalRef.current = null;
                            setIsStreaming(false);
                            rawTextRef.current = "";
                        }
                    }, 16);

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
            // Typewriter owns cleanup on success; only run here on error/abort
            if (!typewriterStarted) {
                setIsStreaming(false);
                rawTextRef.current = "";
            }
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
                    <m.button
                        className={`chat-toggle-btn${!prefersReducedMotion ? " chat-toggle-glow" : ""}`}
                        style={{ bottom: bottomOffset }}
                        onClick={() => { trackEvent("chat_open", {}); setIsOpen(true); }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={prefersReducedMotion
                            ? { duration: 0 }
                            : { type: "spring", damping: 20, stiffness: 260 }
                        }
                        whileTap={{ scale: 0.9 }}
                        aria-label="Open AI Diana chat"
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="chat-toggle-label">Talk to AI Diana</span>
                    </m.button>
                )}
            </AnimatePresence>

            {/* ── Chat window ────────────────────────────────────────────── */}
            <AnimatePresence>
                {isOpen && (
                    <m.div
                        className="chat-window"
                        style={{ bottom: bottomOffset, transformOrigin: "bottom right" }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            transition: prefersReducedMotion
                                ? { duration: 0 }
                                : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.95,
                            transition: prefersReducedMotion
                                ? { duration: 0 }
                                : { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] },
                        }}
                        role="dialog"
                        aria-label="AI Diana chat"
                    >
                        {/* Header */}
                        <div
                            style={{
                                borderBottom: "1px solid var(--v2-border)",
                                padding: "1rem 1.25rem",
                                flexShrink: 0,
                                background: "var(--v2-bg-surface)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <h3
                                        style={{
                                            color: "var(--v2-text-primary)",
                                            margin: 0,
                                            fontFamily: "var(--v2-font-display)",
                                            fontSize: "var(--v2-font-size-lg)",
                                            fontWeight: 600,
                                            letterSpacing: "var(--v2-letter-spacing-tight)",
                                        }}
                                    >
                                        {headerText}
                                    </h3>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    {/* Open in Telegram */}
                                    <a
                                        href={telegramUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Continue on Telegram"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0.375rem",
                                            borderRadius: "0.375rem",
                                            color: "var(--v2-text-secondary)",
                                            background: "transparent",
                                            border: "1px solid transparent",
                                            transition: "color 0.2s ease, background 0.2s ease, border-color 0.2s ease",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = "var(--v2-text-primary)";
                                            e.currentTarget.style.background = "var(--v2-bg-secondary)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = "var(--v2-text-secondary)";
                                            e.currentTarget.style.background = "transparent";
                                        }}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    {/* Toggle Telegram link input */}
                                    <button
                                        onClick={() => setShowLinkInput((v) => !v)}
                                        title="Link Telegram account"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0.375rem",
                                            borderRadius: "0.375rem",
                                            color: "var(--v2-text-secondary)",
                                            background: "transparent",
                                            border: "1px solid transparent",
                                            transition: "color 0.2s ease, background 0.2s ease",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = "var(--v2-text-primary)";
                                            e.currentTarget.style.background = "var(--v2-bg-secondary)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = "var(--v2-text-secondary)";
                                            e.currentTarget.style.background = "transparent";
                                        }}
                                    >
                                        <Link className="w-4 h-4" />
                                    </button>
                                    {/* Close */}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        aria-label="Close chat"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0.375rem",
                                            borderRadius: "0.375rem",
                                            color: "var(--v2-text-secondary)",
                                            background: "transparent",
                                            border: "1px solid transparent",
                                            transition: "color 0.2s ease, background 0.2s ease",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = "var(--v2-text-primary)";
                                            e.currentTarget.style.background = "var(--v2-bg-secondary)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = "var(--v2-text-secondary)";
                                            e.currentTarget.style.background = "transparent";
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Inline Telegram link code input */}
                            <AnimatePresence>
                                {showLinkInput && (
                                    <m.div
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
                                                    background: "var(--v2-bg-primary)",
                                                    border: "1px solid var(--v2-border)",
                                                    borderRadius: "0.375rem",
                                                    padding: "0.375rem 0.625rem",
                                                    color: "var(--v2-text-primary)",
                                                    fontSize: "var(--v2-font-size-xs)",
                                                    fontFamily: "var(--v2-font-mono)",
                                                    outline: "none",
                                                    letterSpacing: "0.05em",
                                                }}
                                            />
                                            <button
                                                style={{
                                                    borderRadius: "0.375rem",
                                                    padding: "0.375rem 0.875rem",
                                                    fontSize: "var(--v2-font-size-xs)",
                                                    fontFamily: "var(--v2-font-mono)",
                                                    fontWeight: 600,
                                                    textTransform: "uppercase" as const,
                                                    letterSpacing: "var(--v2-letter-spacing-wide)",
                                                    background: "var(--v2-accent)",
                                                    color: "var(--v2-text-primary)",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    transition: "opacity 0.2s ease",
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
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Messages */}
                        <div
                            ref={messagesContainerRef}
                            className="chat-scrollbar"
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "1rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem",
                                background: "var(--v2-bg-primary)",
                            }}
                        >
                            {messages.length === 0 && (
                                <p
                                    style={{
                                        color: "var(--v2-text-tertiary)",
                                        fontSize: "var(--v2-font-size-sm)",
                                        fontFamily: "var(--v2-font-body)",
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
                                // Loading: bouncing dots while SSE accumulates
                                if (msg.loading) {
                                    return (
                                        <div key={i} className="chat-msg-assistant">
                                            <div className="chat-loading-dots">
                                                <span /><span /><span />
                                            </div>
                                        </div>
                                    );
                                }

                                // User message — ref assigned to all user divs; last one wins,
                                // naturally pointing to the most recently sent message
                                if (msg.role === "user") {
                                    return (
                                        <div key={i} ref={lastUserMsgRef} className="chat-msg-user">
                                            {msg.text}
                                        </div>
                                    );
                                }

                                // Assistant — both typewriter (partial) and final HTML are
                                // pre-escaped by parseMarkdown before any markup is injected.
                                // The `typewriter` class adds the blinking cursor via CSS ::after.
                                return (
                                    <div
                                        key={i}
                                        className={`chat-msg-assistant${msg.typewriter ? " typewriter" : ""}`}
                                        dangerouslySetInnerHTML={{ __html: msg.text }}
                                    />
                                );
                            })}
                        </div>

                        {/* Input area */}
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                borderTop: "1px solid var(--v2-border)",
                                flexShrink: 0,
                                background: "var(--v2-bg-surface)",
                            }}
                        >
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isStreaming ? "Thinking..." : "Ask anything... (Enter to send)"}
                                    maxLength={600}
                                    rows={1}
                                    disabled={isStreaming}
                                    style={{
                                        flex: 1,
                                        resize: "none",
                                        background: "var(--v2-bg-primary)",
                                        border: "1px solid var(--v2-border)",
                                        borderRadius: "0.5rem",
                                        padding: "0.625rem 0.875rem",
                                        color: "var(--v2-text-primary)",
                                        fontSize: "var(--v2-font-size-sm)",
                                        fontFamily: "var(--v2-font-body)",
                                        outline: "none",
                                        lineHeight: "1.5",
                                        maxHeight: "100px",
                                        overflowY: "auto",
                                        transition: "border-color 0.2s ease",
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "var(--v2-border-accent)";
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "var(--v2-border)";
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isStreaming || !input.trim()}
                                    aria-label="Send message"
                                    style={{
                                        borderRadius: "0.5rem",
                                        padding: "0.625rem 0.875rem",
                                        flexShrink: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "var(--v2-accent)",
                                        color: "var(--v2-text-primary)",
                                        border: "none",
                                        opacity: isStreaming || !input.trim() ? 0.45 : 1,
                                        cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
                                        transition: "opacity 0.2s ease",
                                    }}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </>
    );
}
