"use client";

/**
 * MetricsRow — aggregate stats section rendered below the task grid.
 *
 * Three metric cards (one per model) in a 3-column grid on desktop,
 * stacked single column on mobile (<768px).
 *
 * Each card shows:
 *   - Pass rate (colour coded: green >80%, yellow 50–80%, red <50%)
 *   - Mean latency (ms)
 *   - P95 latency (ms)
 *   - Passed / total count
 *
 * Rendered only once results are present — grayed-out skeleton state
 * is handled by the parent Dashboard (metrics section hidden pre-run).
 */

import { useMemo } from "react";
import type { TaskResult, ModelId, ModelConfig } from "@/lib/experiments/exp_009/types";
import { MODEL_CONFIGS, MODEL_IDS } from "@/lib/experiments/exp_009/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricsRowProps {
  /** All received results. Empty array renders a grayed-out placeholder. */
  results: TaskResult[];
  /** Whether the run is still in progress (affects heading copy). */
  isRunning: boolean;
}

interface ModelMetrics {
  config: ModelConfig;
  totalTasks: number;
  passed: number;
  failed: number;
  passRate: number;
  meanLatencyMs: number;
  p95LatencyMs: number;
}

// ─── Model brand colours ──────────────────────────────────────────────────────

const MODEL_BRAND_COLOUR: Record<ModelId, string> = {
  "gpt-5.5": "var(--model-gpt-55-brand)",
  "claude-opus-4-7": "var(--model-claude-brand)",
  "gemini-3.1-pro": "var(--model-gemini-brand)",
};

// ─── Aggregate computation ────────────────────────────────────────────────────

/** Compute p95 latency from a sorted (ascending) array of latency values. */
function computeP95(sortedLatencies: number[]): number {
  if (sortedLatencies.length === 0) return 0;
  const idx = Math.ceil(sortedLatencies.length * 0.95) - 1;
  return sortedLatencies[Math.max(0, idx)] ?? 0;
}

function computeMetrics(results: TaskResult[]): ModelMetrics[] {
  return MODEL_IDS.map((modelId) => {
    const config = MODEL_CONFIGS[modelId];
    const modelResults = results.filter((r) => r.model === modelId);
    const passed = modelResults.filter((r) => r.pass).length;
    const failed = modelResults.length - passed;
    const passRate = modelResults.length > 0 ? passed / modelResults.length : 0;

    const latencies = modelResults.map((r) => r.latencyMs).sort((a, b) => a - b);
    const meanLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((sum, v) => sum + v, 0) / latencies.length)
        : 0;
    const p95LatencyMs = computeP95(latencies);

    return {
      config,
      totalTasks: modelResults.length,
      passed,
      failed,
      passRate,
      meanLatencyMs,
      p95LatencyMs,
    };
  });
}

// ─── Pass-rate colour ─────────────────────────────────────────────────────────

function passRateColour(rate: number): string {
  if (rate > 0.8) return "#22C55E";
  if (rate >= 0.5) return "#F59E0B";
  return "#EF4444";
}

// ─── MetricRow item ───────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  colour,
}: {
  label: string;
  value: string;
  colour?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--v2-space-sm) 0",
        borderTop: "1px solid rgba(255, 255, 255, 0.04)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-sm)",
          fontWeight: 600,
          color: colour ?? "var(--exp-glass-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MetricsRow({ results, isRunning }: MetricsRowProps) {
  const metrics = useMemo(() => computeMetrics(results), [results]);

  return (
    <section
      aria-label="Aggregate benchmark metrics"
      style={{
        background: "var(--exp-glass-bg)",
        borderTop: "1px solid var(--exp-glass-border)",
        padding: "var(--v2-space-2xl) 1.5rem",
        marginTop: "var(--v2-space-3xl)",
      }}
    >
      {/* Section heading */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--exp-glass-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          margin: "0 0 var(--v2-space-lg) 0",
        }}
      >
        {isRunning ? "Live Metrics (partial)" : "Aggregate Results"}
      </p>

      {/* 3-column grid — collapses to 1 column on mobile via .exp-009-metrics-grid */}
      <div className="exp-009-metrics-grid">
        {metrics.map((m) => {
          const brandColour = MODEL_BRAND_COLOUR[m.config.id];
          const hasData = m.totalTasks > 0;

          return (
            <div
              key={m.config.id}
              style={{
                padding: "var(--v2-space-lg)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--exp-glass-border)",
                borderRadius: "0.375rem",
                borderLeft: `3px solid ${brandColour}`,
                opacity: hasData ? 1 : 0.4,
              }}
            >
              {/* Model header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--v2-space-xs)",
                  marginBottom: "var(--v2-space-md)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: brandColour,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-sm)",
                    fontWeight: 600,
                    color: "var(--exp-glass-text)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--v2-letter-spacing-wide)",
                  }}
                >
                  {m.config.label}
                </span>
              </div>

              {hasData ? (
                <>
                  <MetricRow
                    label="Pass Rate"
                    value={`${Math.round(m.passRate * 100)}%`}
                    colour={passRateColour(m.passRate)}
                  />
                  <MetricRow
                    label="Passed / Total"
                    value={`${m.passed} / ${m.totalTasks}`}
                    colour={m.failed > 0 ? "#EF4444" : "#22C55E"}
                  />
                  <MetricRow
                    label="Mean Latency"
                    value={`${m.meanLatencyMs} ms`}
                  />
                  <MetricRow
                    label="P95 Latency"
                    value={`${m.p95LatencyMs} ms`}
                  />
                </>
              ) : (
                <p
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--exp-glass-text-muted)",
                    margin: 0,
                    textAlign: "center",
                    paddingTop: "var(--v2-space-sm)",
                  }}
                >
                  No results yet
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
