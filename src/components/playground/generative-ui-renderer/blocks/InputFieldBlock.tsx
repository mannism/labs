/**
 * InputFieldBlock — labeled input field preview.
 * Non-interactive in the renderer — this represents a layout preview element.
 * Renders a visible label + styled input shell so the layout reads correctly.
 * Uses Speculative Interface v2 design tokens only — no hardcoded hex.
 */

import type { InputFieldProps } from "@/lib/schemas/uiBlocks";

interface InputFieldBlockProps {
  props: InputFieldProps;
  /** Unique id suffix for label/input association within the canvas. */
  id: string;
}

/** Display hint text per input type when no placeholder is provided. */
const TYPE_PLACEHOLDERS: Record<string, string> = {
  text: "Enter text…",
  email: "you@example.com",
  password: "••••••••",
};

export function InputFieldBlock({ props, id }: InputFieldBlockProps) {
  const inputId = `gen-ui-input-${id}`;
  const placeholder =
    props.placeholder ?? TYPE_PLACEHOLDERS[props.type ?? "text"] ?? "Enter value…";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-xs)",
      }}
    >
      {/* Visible label */}
      <label
        htmlFor={inputId}
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          textTransform: "uppercase",
        }}
      >
        {props.label}
      </label>

      {/* Input shell — read-only, decorative, represents layout structure */}
      <input
        id={inputId}
        type={props.type ?? "text"}
        placeholder={placeholder}
        readOnly
        aria-readonly="true"
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--exp-glass-border)",
          borderRadius: "2px",
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-sm)",
          color: "var(--exp-glass-text-muted)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
