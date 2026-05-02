/**
 * ChatWidgetLazy — code-split wrapper for ChatWidget.
 *
 * Defers ChatWidget from the critical-path JS bundle via next/dynamic with
 * ssr: false. The FAB has no meaningful SSR shape worth preserving, so the
 * loading fallback returns null — a 50–100ms gap before the launcher appears
 * is within the accepted UX tolerance (see brief-lazy-chatwidget.md).
 *
 * All ChatWidget behaviour (open/close, SSE stream, history, Telegram link
 * flow, ?connect= auto-pair, footer offset) is unchanged — this wrapper
 * adds no props, no state, and no logic of its own.
 */

import dynamic from "next/dynamic";

export const ChatWidgetLazy = dynamic(
  () => import("./ChatWidget").then((mod) => mod.ChatWidget),
  {
    ssr: false,
    loading: () => null,
  }
);
