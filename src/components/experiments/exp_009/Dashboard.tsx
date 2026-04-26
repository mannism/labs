"use client";

/**
 * Dashboard — main orchestrator for EXP_009 Agentic Reliability Dashboard.
 *
 * Owns:
 *   - Run trigger (POST /api/experiments/exp_009/run)
 *   - SSE subscription via useExp009Stream
 *   - Elapsed timer (setInterval, cleared on run completion)
 *   - Cooldown state: reads localStorage on mount, writes on 200/429, passes
 *     cooldownStartedAt down to ControlsStrip which drives the countdown label.
 *   - aria-live region for screen reader announcements of SSE events
 *   - Layout: sticky ControlsStrip (RUN button + status) → 3-column task grid → MetricsRow
 *
 * Design pattern: RUN SUITE button lives inside ControlsStrip (inside the dark canvas).
 * The input-type pill in ExperimentDetail is a passive descriptive tag only — no event bridge.
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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Total tasks in the suite (shown in controls; updated from SSE done event) */
const PLACEHOLDER_TASK_COUNT = 20;

/** localStorage key for persisting the cooldown start timestamp across page loads. */
const COOLDOWN_LS_KEY = 'exp009:lastRunAt';

/**
 * Cooldown window in ms — must match RATE_LIMIT_WINDOW_SECONDS in rate-limiter.ts.
 * Kept local to avoid importing a server-only module into a client component.
 */
const COOLDOWN_WINDOW_MS = 180_000;

/** Stale-value guard: ignore lastRunAt values older than 1 hour. */
const COOLDOWN_MAX_AGE_MS = 3_600_000;

// ─── localStorage helpers ─────────────────────────────────────────────────────

/**
 * Safely read the cooldown start time from localStorage.
 * Returns null if localStorage is unavailable (SSR, privacy mode) or the
 * value is absent, invalid, or stale (> 1 hour old).
 */
function readCooldownStartedAt(): number | null {
  try {
    const raw = localStorage.getItem(COOLDOWN_LS_KEY);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return null;
    if (Date.now() - ts > COOLDOWN_MAX_AGE_MS) return null;
    // Only return if still within the active window.
    if (Date.now() - ts >= COOLDOWN_WINDOW_MS) return null;
    return ts;
  } catch {
    // localStorage not available (SSR guard, privacy mode, etc.)
    return null;
  }
}

/**
 * Safely write the cooldown start timestamp to localStorage.
 * No-ops silently on unavailability — in-memory state handles the session.
 */
function writeCooldownStartedAt(ts: number): void {
  try {
    localStorage.setItem(COOLDOWN_LS_KEY, String(ts));
  } catch {
    // Privacy mode or storage quota — degraded gracefully.
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Dashboard() {
  // ── Run state ────────────────────────────────────────────────────────────
  const [runId, setRunId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // ── Cooldown state ───────────────────────────────────────────────────────
  /**
   * Epoch ms when the active cooldown window started.
   * Null = no cooldown. ControlsStrip derives seconds-remaining from this.
   * Initialised to null; set from localStorage on mount (useEffect below).
   */
  const [cooldownStartedAt, setCooldownStartedAt] = useState<number | null>(null);

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

  // ── Cooldown: read localStorage on mount ────────────────────────────────
  useEffect(() => {
    // Runs client-side only (component is dynamically imported with ssr:false).
    // Restores cooldown state across page refreshes and tab opens.
    const restored = readCooldownStartedAt();
    if (restored !== null) {
      setCooldownStartedAt(restored);
    }
  }, []);

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

      if (response.status === 429) {
        // Server-enforced rate limit. Parse retryAfterSeconds from the body so
        // the client cooldown reflects the server's remaining window, not a
        // fresh 180s — important if this tab was idle while another tab ran.
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          retryAfterSeconds?: number;
        };
        const retryAfter = typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : 180;
        // Reconstruct lastRunAt from retryAfterSeconds so the countdown is accurate:
        //   lastRunAt = now - (COOLDOWN_WINDOW_MS - retryAfterSeconds * 1000)
        const reconstructed = Date.now() - (COOLDOWN_WINDOW_MS - retryAfter * 1000);
        setCooldownStartedAt(reconstructed);
        writeCooldownStartedAt(reconstructed);
        throw new Error("Rate limit reached. Please wait for the cooldown to expire.");
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `POST /run failed: ${response.status}`);
      }

      const data = (await response.json()) as { runId: string };

      // ── Record cooldown start — server has accepted the run ──────────────
      // Write before setting runId so ControlsStrip enters cooldown state
      // immediately, even if the SSE stream is slow to connect.
      const now = Date.now();
      setCooldownStartedAt(now);
      writeCooldownStartedAt(now);

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

      {/* ── Controls strip (sticky) — RUN button, status badge, timer, error ── */}
      <ControlsStrip
        status={startError ? "error" : status}
        isStarting={isStarting}
        totalTasks={displayTotalTasks}
        elapsedSeconds={elapsedSeconds}
        onRunClick={handleRunClick}
        error={displayError}
        cooldownStartedAt={cooldownStartedAt}
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
