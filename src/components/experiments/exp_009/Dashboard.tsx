"use client";

/**
 * Dashboard — main orchestrator for EXP_009 Agentic Reliability Dashboard.
 *
 * Owns:
 *   - Run trigger (POST /api/experiments/exp_009/run)
 *   - SSE subscription via useExp009Stream
 *   - Elapsed timer (setInterval, cleared on run completion)
 *   - aria-live region for screen reader announcements of SSE events
 *   - Layout: sticky ControlsStrip → 3-column task grid → MetricsRow
 *
 * Architecture:
 *   - Results are stored flat in `results[]`; per-column views are derived via Map
 *   - Task IDs are derived from the first arriving results so we handle any task set
 *   - "hasStarted" becomes true on first result arrival; drives skeleton → live switch
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useExp009Stream } from "@/hooks/useExp009Stream";
import { MODEL_CONFIGS, MODEL_IDS } from "@/lib/experiments/exp_009/types";
import type { ModelId } from "@/lib/experiments/exp_009/types";
import { ControlsStrip } from "./ControlsStrip";
import { ModelColumn } from "./ModelColumn";
import { MetricsRow } from "./MetricsRow";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Total tasks in the suite (shown in controls; updated from SSE done event) */
const PLACEHOLDER_TASK_COUNT = 20;

// ─── Component ────────────────────────────────────────────────────────────────

export function Dashboard() {
  // ── Run state ────────────────────────────────────────────────────────────
  const [runId, setRunId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // ── Elapsed timer ────────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── SSE stream ───────────────────────────────────────────────────────────
  const { results, status, error: streamError, totalResults } = useExp009Stream(runId);

  // ── aria-live announcements ref ──────────────────────────────────────────
  const announcementRef = useRef<HTMLDivElement | null>(null);

  // ── Derived task list (ordered by first appearance across all models) ────
  /**
   * We collect unique task IDs as they arrive so the column ordering matches
   * task execution order rather than a hardcoded list.
   * Uses a ref to track insertion order without re-renders.
   */
  const taskIdOrderRef = useRef<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);

  // ── Results indexed per model ────────────────────────────────────────────
  const resultsByModel = new Map<ModelId, Map<string, import("@/lib/experiments/exp_009/types").TaskResult>>();
  for (const modelId of MODEL_IDS) {
    resultsByModel.set(modelId, new Map());
  }
  for (const result of results) {
    const map = resultsByModel.get(result.model);
    if (map) map.set(result.taskId, result);
  }

  // ── Sync task ID ordering from incoming results ──────────────────────────
  useEffect(() => {
    let changed = false;
    for (const result of results) {
      if (!taskIdOrderRef.current.includes(result.taskId)) {
        taskIdOrderRef.current.push(result.taskId);
        changed = true;
      }
    }
    if (changed) setTaskIds([...taskIdOrderRef.current]);
  }, [results]);

  // ── Running task IDs (results not yet complete) ──────────────────────────
  // For EXP_009 the runner reports a task_result only when it finishes,
  // so we can't know which specific task is "mid-flight". Instead we show
  // "running" for the most recent task per model that hasn't completed yet.
  // In practice the SSE stream delivers results as they complete so this
  // approximation gives a correct visual state.
  const runningTaskIds = new Set<string>();
  if (status === "streaming") {
    for (const modelId of MODEL_IDS) {
      const completed = resultsByModel.get(modelId)!;
      // Mark the first pending task in the ordered list as "running".
      const firstPending = taskIdOrderRef.current.find((id) => !completed.has(id));
      if (firstPending) runningTaskIds.add(firstPending);
    }
  }

  // ── "Has started" — first result received ───────────────────────────────
  const hasStarted = results.length > 0 || status === "connecting" || status === "streaming";

  // ── Elapsed timer management ─────────────────────────────────────────────
  useEffect(() => {
    if (status === "connecting" || status === "streaming") {
      // Start timer if not already running
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1_000);
      }
    } else {
      // Clear timer on done, error, or idle
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  // ── aria-live announcements for SSE results ──────────────────────────────
  useEffect(() => {
    if (results.length === 0) return;
    const latest = results[results.length - 1];
    if (!latest || !announcementRef.current) return;

    const modelLabel = MODEL_CONFIGS[latest.model]?.label ?? latest.model;
    const outcome = latest.pass ? "PASSED" : "FAILED";
    announcementRef.current.textContent = `Task ${latest.taskId} on ${modelLabel}: ${outcome} in ${latest.latencyMs} milliseconds`;

    // Clear after 2 seconds to avoid screen reader verbosity.
    const timer = setTimeout(() => {
      if (announcementRef.current) announcementRef.current.textContent = "";
    }, 2_000);

    return () => clearTimeout(timer);
  }, [results]);

  // ── Run trigger ──────────────────────────────────────────────────────────
  const handleRunClick = useCallback(async () => {
    if (isStarting || status === "connecting" || status === "streaming") return;

    setIsStarting(true);
    setStartError(null);
    setElapsedSeconds(0);
    taskIdOrderRef.current = [];
    setTaskIds([]);

    try {
      const response = await fetch("/api/experiments/exp_009/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Empty body → run all tasks against all models
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `POST /run failed: ${response.status}`);
      }

      const data = (await response.json()) as { runId: string };
      setRunId(data.runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start run";
      setStartError(message);
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, status]);

  // Combined error: start error takes precedence over stream error.
  const displayError = startError ?? streamError;

  // Total tasks: from done event if available, else from results, else placeholder.
  const displayTotalTasks =
    totalResults > 0
      ? totalResults
      : results.length > 0
        ? PLACEHOLDER_TASK_COUNT
        : PLACEHOLDER_TASK_COUNT;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--exp-canvas-bg)",
        color: "var(--exp-glass-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Hidden aria-live region — screen reader announcements for SSE events */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-label="Task results updates"
        style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
        id="results-announcements"
      />

      {/* ── Controls strip (sticky) ──────────────────────────── */}
      <ControlsStrip
        status={startError ? "error" : status}
        isStarting={isStarting}
        totalTasks={displayTotalTasks}
        elapsedSeconds={elapsedSeconds}
        onRunClick={handleRunClick}
        error={displayError}
      />

      {/* ── Task grid ────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          maxWidth: "80rem",
          width: "100%",
          margin: "0 auto",
          padding: "var(--v2-space-lg) 1.5rem",
        }}
      >
        {/* Page title (visually hidden equivalent — for SR context) */}
        <h2
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
          }}
        >
          Agentic Reliability Benchmark — Task Results
        </h2>

        {/* 3-column task grid — responsive via .exp-009-task-grid CSS class */}
        <div
          className="exp-009-task-grid"
          style={{
            marginBottom: "var(--v2-space-3xl)",
          }}
        >
          {MODEL_IDS.map((modelId) => (
            <ModelColumn
              key={modelId}
              config={MODEL_CONFIGS[modelId]}
              taskIds={taskIds.length > 0 ? taskIds : Array.from({ length: PLACEHOLDER_TASK_COUNT }, (_, i) => `task-${String(i + 1).padStart(3, "0")}-placeholder`)}
              resultsByTaskId={resultsByModel.get(modelId) ?? new Map()}
              runningTaskIds={runningTaskIds}
              hasStarted={hasStarted}
            />
          ))}
        </div>

        {/* ── Aggregate metrics ─────────────────────────────── */}
        <MetricsRow
          results={results}
          isRunning={status === "streaming" || status === "connecting"}
        />
      </div>
    </div>
  );
}
