/**
 * ChatInput — prompt entry field for the Generative UI Renderer.
 *
 * Single-line input with:
 *   - 200 character limit with live character count
 *   - Submit on Enter or button click
 *   - Disabled state during active renders
 *   - Descriptive placeholder text
 *   - Full keyboard accessibility
 */

"use client";

import { useState, useCallback, type KeyboardEvent, type FormEvent } from "react";

const MAX_LENGTH = 200;

interface ChatInputProps {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  disabled,
  placeholder = "Describe a UI layout — e.g. 'A dashboard with revenue stats, a line chart, and a recent transactions list'",
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const remaining = MAX_LENGTH - value.length;
  const canSubmit = value.trim().length > 0 && !disabled;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!canSubmit) return;
      onSubmit(value.trim());
      setValue("");
    },
    [canSubmit, onSubmit, value]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Describe a UI layout to generate"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-xs)",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "var(--v2-space-sm)",
          alignItems: "center",
        }}
      >
        {/* Text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={MAX_LENGTH}
          placeholder={placeholder}
          aria-label="Describe a UI layout"
          aria-describedby="gen-ui-char-count"
          style={{
            flex: 1,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--exp-glass-border)",
            borderRadius: "2px",
            fontFamily: "var(--v2-font-body)",
            fontSize: "var(--v2-font-size-sm)",
            color: disabled ? "var(--exp-glass-text-muted)" : "var(--exp-glass-text)",
            outline: "none",
            transition: "border-color 0.2s ease",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = "var(--v2-accent)";
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--exp-glass-border)";
          }}
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Generate UI"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 20px",
            background: canSubmit ? "var(--v2-accent)" : "rgba(255,255,255,0.06)",
            color: canSubmit ? "var(--v2-text-primary)" : "var(--exp-glass-text-muted)",
            border: "none",
            borderRadius: "2px",
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background 0.2s ease, color 0.2s ease",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {disabled ? "RENDERING…" : "GENERATE"}
        </button>
      </div>

      {/* Character count — shown when nearing limit */}
      <p
        id="gen-ui-char-count"
        aria-live="polite"
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: remaining <= 20 ? "var(--exp-status-beta)" : "var(--exp-glass-text-muted)",
          margin: 0,
          textAlign: "right",
          opacity: remaining < MAX_LENGTH ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        {remaining} remaining
      </p>
    </form>
  );
}
