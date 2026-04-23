"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandPipelineConfig, VariantResult } from "@/types/brandPipeline";
import { useEventStream } from "@/hooks/useEventStream";
import { ConfigPanel } from "./ConfigPanel";
import { ExecutionTrace } from "./ExecutionTrace";
import { ResultPanel } from "./ResultPanel";

/**
 * BrandPipelineExperiment — top-level component for EXP_005.
 *
 * Manages the three visual states:
 *  1. Config  — ConfigPanel visible, trace and results hidden
 *  2. Running — ConfigPanel disabled, ExecutionTrace streaming, results hidden
 *  3. Done    — ConfigPanel shows "Run Again", ExecutionTrace scrollable, ResultPanel visible
 *
 * Flow:
 *  - User submits ConfigPanel → POST /api/experiments/brand-pipeline/run
 *  - Response yields { jobId } → connect SSE stream to /api/experiments/brand-pipeline/stream/[jobId]
 *  - Events flow through useEventStream into ExecutionTrace
 *  - On pipeline_done: extract VariantResult[] and pass to ResultPanel
 *  - On pipeline_error or fetch failure: show error in trace, enable "Try Again" (Run Again)
 *
 * No external state management — all state lives in this component.
 * Responsive: ConfigPanel stacks above trace on mobile (single column),
 * side-by-side on wider viewports (two-column grid).
 */

/** Pipeline states. */
type PipelinePhase = "config" | "running" | "done" | "error";

/** POST /api/experiments/brand-pipeline/run response shape. */
interface RunResponse {
  jobId: string;
}

export function BrandPipelineExperiment() {
  const [phase, setPhase] = useState<PipelinePhase>("config");
  const [results, setResults] = useState<VariantResult[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { events, status, connect, reset } = useEventStream();

  /** Submit the config → POST run → connect SSE. */
  const handleSubmit = useCallback(
    async (config: BrandPipelineConfig) => {
      setSubmitError(null);
      reset();
      setResults([]);
      setPhase("running");

      try {
        const response = await fetch("/api/experiments/brand-pipeline/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            body.error ?? `Pipeline start failed (${response.status})`
          );
        }

        const { jobId } = (await response.json()) as RunResponse;
        connect(`/api/experiments/brand-pipeline/stream/${jobId}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start pipeline";
        setSubmitError(message);
        setPhase("error");
      }
    },
    [connect, reset]
  );

  /**
   * Watch for terminal SSE events and update phase / results.
   * Runs in useEffect to avoid setState during render.
   */
  useEffect(() => {
    if (phase !== "running") return;

    const doneEvent = events.find((e) => e.type === "pipeline_done");
    if (doneEvent && doneEvent.type === "pipeline_done") {
      setResults(doneEvent.results);
      setPhase("done");
      return;
    }

    const errorEvent = events.find((e) => e.type === "pipeline_error");
    if (errorEvent) {
      setPhase("error");
    }
  }, [events, phase]);

  /** Reset everything and return to the config form. */
  const handleRunAgain = useCallback(() => {
    reset();
    setResults([]);
    setSubmitError(null);
    setPhase("config");
  }, [reset]);

  const isRunning = phase === "running";
  const showTrace = phase === "running" || phase === "done" || phase === "error";
  const showResults = phase === "done" && results.length > 0;
  const showRunAgain = phase === "done" || phase === "error";

  return (
    <div
      style={{
        width: "100%",
        padding: "var(--v2-space-xl) var(--v2-space-lg)",
        background: "var(--exp-canvas-bg)",
        minHeight: "clamp(480px, 70vh, 900px)",
        boxSizing: "border-box",
      }}
    >
      {/*
        Two-column layout on wider screens:
          Left: ConfigPanel (fixed width ~380px)
          Right: ExecutionTrace + ResultPanel (fills remaining space)
        On mobile (< 768px): single column, ConfigPanel on top.
      */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showTrace ? "minmax(280px, 380px) 1fr" : "1fr",
          gap: "var(--v2-space-xl)",
          maxWidth: "1200px",
          margin: "0 auto",
          alignItems: "start",
        }}
        className="brand-pipeline-layout"
      >
        {/* Left column: Config */}
        <div>
          {/* Submit error banner (shown when POST fails before SSE starts) */}
          {submitError && (
            <div
              role="alert"
              style={{
                marginBottom: "var(--v2-space-md)",
                padding: "10px 14px",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: "2px",
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "#F87171",
              }}
            >
              {submitError}
            </div>
          )}
          <ConfigPanel
            onSubmit={handleSubmit}
            isRunning={isRunning}
            showRunAgain={showRunAgain}
            onRunAgain={handleRunAgain}
          />
        </div>

        {/* Right column: Execution trace + results (only when active) */}
        {showTrace && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--v2-space-lg)",
            }}
          >
            <ExecutionTrace
              events={events}
              isStreaming={status === "streaming" || status === "connecting"}
            />
            {showResults && <ResultPanel results={results} />}
          </div>
        )}
      </div>

      {/*
        Responsive override: collapse to single column on narrow viewports.
        Injected inline to keep the component self-contained.
      */}
      <style>{`
        @media (max-width: 767px) {
          .brand-pipeline-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
