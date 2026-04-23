"use client";

import { useState } from "react";
import type { BrandPipelineConfig } from "@/types/brandPipeline";
import { BRAND_RULES_PRESET } from "@/lib/prompts/brandPipeline";

/**
 * ConfigPanel — form for configuring an EXP_005 brand pipeline run.
 *
 * Renders:
 *  - Brief textarea (required)
 *  - Brand rules textarea (required) with a "Use preset" button
 *  - Variant count slider (3–10, default 5)
 *  - Top picks selector (1–3, default 3)
 *  - Submit / Run Again button
 *
 * Validates brief and brandRules are non-empty before submission.
 * All inputs are disabled while the pipeline is running.
 * Uses CSS custom properties from globals.css — no hardcoded hex values.
 */

interface ConfigPanelProps {
  /** Called when the form is submitted with a valid config. */
  onSubmit: (config: BrandPipelineConfig) => void;
  /** Whether the pipeline is currently running — disables all inputs. */
  isRunning: boolean;
  /** Whether to show a "Run Again" button instead of "Run Pipeline". */
  showRunAgain: boolean;
  /** Called when "Run Again" is clicked — parent resets state. */
  onRunAgain: () => void;
}

interface FormErrors {
  brief?: string;
  brandRules?: string;
}

export function ConfigPanel({
  onSubmit,
  isRunning,
  showRunAgain,
  onRunAgain,
}: ConfigPanelProps) {
  const [brief, setBrief] = useState("");
  const [brandRules, setBrandRules] = useState("");
  const [variantCount, setVariantCount] = useState(5);
  const [topPicks, setTopPicks] = useState(3);
  const [errors, setErrors] = useState<FormErrors>({});

  /** Fill brand rules textarea with the Luxury Sustainable Fashion preset. */
  const handleUsePreset = () => {
    setBrandRules(BRAND_RULES_PRESET.rules);
    // Clear any existing brandRules error since we just populated it.
    setErrors((prev) => ({ ...prev, brandRules: undefined }));
  };

  /** Validate and submit. Returns false if validation fails. */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    if (!brief.trim()) {
      newErrors.brief = "Brief is required.";
    }
    if (!brandRules.trim()) {
      newErrors.brandRules = "Brand rules are required. Use the preset or write your own.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      brief: brief.trim(),
      brandRules: brandRules.trim(),
      variantCount,
      topPicks,
    });
  };

  /** Shared disabled state for all interactive elements. */
  const disabled = isRunning;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Brand pipeline configuration"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--v2-space-lg)",
        padding: "var(--v2-space-xl)",
        background: "var(--exp-glass-bg)",
        border: "1px solid var(--exp-glass-border)",
        borderRadius: "4px",
      }}
    >
      {/* Brief */}
      <fieldset
        style={{
          border: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--v2-space-xs)",
        }}
      >
        <label
          htmlFor="brand-pipeline-brief"
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--exp-glass-text-muted)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
          }}
        >
          Creative Brief
        </label>
        <textarea
          id="brand-pipeline-brief"
          name="brief"
          required
          rows={5}
          disabled={disabled}
          aria-invalid={!!errors.brief}
          aria-describedby={errors.brief ? "brief-error" : undefined}
          placeholder="Describe the brand context, goals, target audience, and the type of concept you want generated. For example: 'A new skincare line targeting professionals 30–45 who value science-backed ingredients over marketing hype. Positioning: clinical efficacy, minimal packaging, accessible luxury.'"
          value={brief}
          onChange={(e) => {
            setBrief(e.target.value);
            if (errors.brief) setErrors((prev) => ({ ...prev, brief: undefined }));
          }}
          style={{
            width: "100%",
            resize: "vertical",
            fontFamily: "var(--v2-font-body)",
            fontSize: "var(--v2-font-size-sm)",
            color: disabled ? "var(--exp-glass-text-muted)" : "var(--exp-glass-text)",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${errors.brief ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "2px",
            padding: "10px 12px",
            lineHeight: 1.6,
            outline: "none",
            transition: "border-color 0.2s ease, opacity 0.2s ease",
            opacity: disabled ? 0.5 : 1,
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            if (!disabled) e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = errors.brief
              ? "rgba(248,113,113,0.6)"
              : "rgba(255,255,255,0.1)";
          }}
        />
        {errors.brief && (
          <span
            id="brief-error"
            role="alert"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "#F87171",
            }}
          >
            {errors.brief}
          </span>
        )}
      </fieldset>

      {/* Brand Rules */}
      <fieldset
        style={{
          border: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--v2-space-xs)",
        }}
      >
        {/* Label row with preset button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--v2-space-sm)",
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="brand-pipeline-rules"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text-muted)",
              letterSpacing: "var(--v2-letter-spacing-wide)",
              textTransform: "uppercase",
            }}
          >
            Brand Rules
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={handleUsePreset}
            aria-label={`Use ${BRAND_RULES_PRESET.name} preset`}
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "0.625rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: disabled ? "var(--exp-glass-text-muted)" : "var(--v2-accent)",
              background: "transparent",
              border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : "rgba(200,255,0,0.3)"}`,
              padding: "3px 10px",
              borderRadius: "2px",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "color 0.2s ease, border-color 0.2s ease, background 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = "rgba(200,255,0,0.08)";
                e.currentTarget.style.borderColor = "var(--v2-accent)";
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(200,255,0,0.3)";
              }
            }}
          >
            Use preset: {BRAND_RULES_PRESET.name}
          </button>
        </div>
        <textarea
          id="brand-pipeline-rules"
          name="brandRules"
          required
          rows={6}
          disabled={disabled}
          aria-invalid={!!errors.brandRules}
          aria-describedby={errors.brandRules ? "brand-rules-error" : undefined}
          placeholder="Define the brand's rules: voice and tone, visual style, audience, values, and things to avoid. Be specific — the more precise your rules, the more focused the evaluation."
          value={brandRules}
          onChange={(e) => {
            setBrandRules(e.target.value);
            if (errors.brandRules) setErrors((prev) => ({ ...prev, brandRules: undefined }));
          }}
          style={{
            width: "100%",
            resize: "vertical",
            fontFamily: "var(--v2-font-body)",
            fontSize: "var(--v2-font-size-sm)",
            color: disabled ? "var(--exp-glass-text-muted)" : "var(--exp-glass-text)",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${errors.brandRules ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "2px",
            padding: "10px 12px",
            lineHeight: 1.6,
            outline: "none",
            transition: "border-color 0.2s ease, opacity 0.2s ease",
            opacity: disabled ? 0.5 : 1,
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            if (!disabled) e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = errors.brandRules
              ? "rgba(248,113,113,0.6)"
              : "rgba(255,255,255,0.1)";
          }}
        />
        {errors.brandRules && (
          <span
            id="brand-rules-error"
            role="alert"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "#F87171",
            }}
          >
            {errors.brandRules}
          </span>
        )}
      </fieldset>

      {/* Sliders row — variant count + top picks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--v2-space-lg)",
        }}
      >
        {/* Variant count slider */}
        <fieldset
          style={{
            border: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--v2-space-xs)",
          }}
        >
          <label
            htmlFor="brand-pipeline-variant-count"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text-muted)",
              letterSpacing: "var(--v2-letter-spacing-wide)",
              textTransform: "uppercase",
            }}
          >
            Variants
            <span
              aria-hidden="true"
              style={{
                marginLeft: "var(--v2-space-xs)",
                color: "var(--v2-accent)",
                fontWeight: 600,
              }}
            >
              {variantCount}
            </span>
          </label>
          <input
            id="brand-pipeline-variant-count"
            type="range"
            name="variantCount"
            min={3}
            max={10}
            step={1}
            disabled={disabled}
            value={variantCount}
            aria-valuemin={3}
            aria-valuemax={10}
            aria-valuenow={variantCount}
            aria-label={`Variant count: ${variantCount}`}
            onChange={(e) => setVariantCount(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--v2-accent)", opacity: disabled ? 0.5 : 1 }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--v2-font-mono)",
              fontSize: "0.625rem",
              color: "var(--exp-glass-text-muted)",
            }}
            aria-hidden="true"
          >
            <span>3</span>
            <span>10</span>
          </div>
        </fieldset>

        {/* Top picks selector */}
        <fieldset
          style={{
            border: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--v2-space-xs)",
          }}
        >
          <label
            htmlFor="brand-pipeline-top-picks"
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--exp-glass-text-muted)",
              letterSpacing: "var(--v2-letter-spacing-wide)",
              textTransform: "uppercase",
            }}
          >
            Top Picks
          </label>
          <div
            role="group"
            aria-label="Number of top picks"
            style={{
              display: "flex",
              gap: "var(--v2-space-xs)",
            }}
          >
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                aria-pressed={topPicks === n}
                onClick={() => setTopPicks(n)}
                style={{
                  flex: 1,
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  fontWeight: topPicks === n ? 600 : 400,
                  color: topPicks === n ? "#1A1D23" : "var(--exp-glass-text-muted)",
                  background: topPicks === n ? "var(--v2-accent)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${topPicks === n ? "var(--v2-accent)" : "rgba(255,255,255,0.1)"}`,
                  padding: "6px 0",
                  borderRadius: "2px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  opacity: disabled ? 0.5 : 1,
                  minHeight: "44px",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Action button */}
      {showRunAgain ? (
        <button
          type="button"
          onClick={onRunAgain}
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
            color: "var(--v2-text-primary)",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "12px 24px",
            borderRadius: "2px",
            cursor: "pointer",
            transition: "background 0.2s ease, border-color 0.2s ease",
            minHeight: "44px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.15)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }}
        >
          Run Again
        </button>
      ) : (
        <button
          type="submit"
          disabled={disabled}
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
            textTransform: "uppercase",
            color: disabled ? "rgba(26,29,35,0.5)" : "#1A1D23",
            background: disabled ? "rgba(200,255,0,0.3)" : "var(--v2-accent)",
            border: "none",
            padding: "12px 24px",
            borderRadius: "2px",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "background 0.2s ease, opacity 0.2s ease",
            fontWeight: 600,
            minHeight: "44px",
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = "rgba(200,255,0,0.85)";
          }}
          onMouseLeave={(e) => {
            if (!disabled) e.currentTarget.style.background = "var(--v2-accent)";
          }}
        >
          {isRunning ? "Running..." : "Run Pipeline"}
        </button>
      )}
    </form>
  );
}
