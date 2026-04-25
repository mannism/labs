# EXP_009 — Agentic Reliability Dashboard: Runner Engine

Backend implementation for the EXP_009 benchmark. Runs identical agentic tasks against GPT-5.5, Claude Opus 4.7, and Gemini 3.1 Pro, then validates each response against a strict Zod schema to produce pass/fail, latency, and JSON validity data.

---

## Task Categories

| Category | What it tests |
|---|---|
| `simple_tool_call` | Single tool call with correct parameter extraction |
| `parallel_tool_calls` | Multiple independent tool calls issued in one turn |
| `chained_tool_calls` | Tool call whose output feeds into a second tool call |
| `structured_json` | Strict JSON generation without a tool call |
| `multi_step` | Multi-turn reasoning with tool use and context retention |

---

## How the Runner Works

`runner.ts` exports one function: `runTask(task, modelConfig) → Promise<TaskResult>`.

For each invocation it will:

1. Start a latency timer.
2. Dispatch to the correct SDK (OpenAI / Anthropic / Google) based on `modelConfig.provider`.
3. Apply a 30 s per-task timeout with `Promise.race`.
4. Parse the raw response into a JS object.
5. Validate the parsed object against `schemaRegistry[task.expectedSchema]` (Zod `safeParse`).
6. Return a `TaskResult` with `pass`, `latencyMs`, `rawResponse`, and any `validationErrors`.

Provider SDK calls are wrapped in try/catch. A caught error returns `pass: false` with the error message in `validationErrors` — it does not throw.

---

## How to Add a Task

1. Create a new JSON file in `src/data/experiments/exp_009/tasks/` following the naming convention `task-NNN-<slug>.json`.
2. The file must conform to the `Task` type (`src/lib/experiments/exp_009/types.ts`).
3. If the task needs a new expected-output shape, add a Zod schema to `schemaRegistry` in `types.ts` and reference it by key in `expectedSchema`.
4. No code changes to `runner.ts` are needed — tasks are loaded dynamically.

---

## Day 2 TODO

- [ ] Implement `runTask` body: OpenAI SDK dispatch with tool-call extraction
- [ ] Implement Anthropic SDK dispatch (tool_use block parsing)
- [ ] Implement Google AI SDK dispatch
- [ ] Add 30 s timeout wrapper using `Promise.race`
- [ ] Wire env var resolution via `src/lib/twin/config.ts` (or a new `exp_009/config.ts`)
- [ ] Add exponential backoff + jitter for provider 429s
- [ ] Implement task loader: reads all JSON files from the tasks directory and validates with `TaskSchema`
- [ ] Implement `POST /api/experiments/exp_009/run` route handler stub
- [ ] Implement `GET /api/experiments/exp_009/results` SSE stream stub
