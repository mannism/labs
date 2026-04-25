/**
 * EXP_009 — Agentic Reliability Dashboard
 * Shared types and Zod schemas for the task suite and runner engine.
 * All external data is validated at the API boundary using these schemas.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Model identifiers
// ---------------------------------------------------------------------------

export const MODEL_IDS = ['gpt-5.5', 'claude-opus-4-7', 'gemini-3.1-pro'] as const;

export type ModelId = (typeof MODEL_IDS)[number];

/** Runtime configuration for a single model. Env vars are resolved in config.ts. */
export interface ModelConfig {
  id: ModelId;
  /** Human-readable display label. */
  label: string;
  /** Provider used to route to the correct SDK. */
  provider: 'openai' | 'anthropic' | 'google';
  /**
   * Max tokens for the response. Keep low for tool-calling tasks to control
   * cost per run (~$2-5 for the full 20-task suite).
   */
  maxTokens: number;
  /** Per-task timeout in milliseconds. Hard-capped at 30 000 ms. */
  timeoutMs: number;
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  'gpt-5.5': {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    provider: 'openai',
    maxTokens: 1024,
    timeoutMs: 30_000,
  },
  'claude-opus-4-7': {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    provider: 'anthropic',
    maxTokens: 1024,
    timeoutMs: 30_000,
  },
  'gemini-3.1-pro': {
    id: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro',
    provider: 'google',
    maxTokens: 1024,
    timeoutMs: 30_000,
  },
};

// ---------------------------------------------------------------------------
// Task categories
// ---------------------------------------------------------------------------

export const TASK_CATEGORIES = [
  'simple_tool_call',
  'parallel_tool_calls',
  'chained_tool_calls',
  'structured_json',
  'multi_step',
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Tool definition (provider-agnostic subset)
// ---------------------------------------------------------------------------

const ToolParameterSchema: z.ZodType<ToolParameter> = z.lazy(() =>
  z.object({
    type: z.enum(['object', 'string', 'number', 'boolean', 'array']),
    description: z.string().optional(),
    properties: z.record(ToolParameterSchema).optional(),
    items: ToolParameterSchema.optional(),
    required: z.array(z.string()).optional(),
    enum: z.array(z.union([z.string(), z.number()])).optional(),
  }),
);

export interface ToolParameter {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  description?: string;
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
  required?: string[];
  enum?: (string | number)[];
}

const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: ToolParameterSchema,
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

/**
 * A single benchmark task.
 * Tasks are stored as JSON in src/data/experiments/exp_009/tasks/ and
 * validated against this schema at load time.
 */
export const TaskSchema = z.object({
  /** Unique task identifier, e.g. "task-001-simple-tool-call". */
  id: z.string(),
  category: z.enum(TASK_CATEGORIES),
  /** The prompt sent verbatim to each model. */
  prompt: z.string(),
  /**
   * Key that maps to a Zod schema in schemaRegistry (types.ts).
   * The runner uses this to validate the model's response.
   */
  expectedSchema: z.string(),
  /** Tool definitions provided to the model (optional for structured_json tasks). */
  toolDefinitions: z.array(ToolDefinitionSchema).optional(),
  /** Human-readable description of what this task tests. */
  description: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

// ---------------------------------------------------------------------------
// Task result
// ---------------------------------------------------------------------------

export const TaskResultSchema = z.object({
  taskId: z.string(),
  model: z.enum(MODEL_IDS),
  pass: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
  /** Raw response from the model, stringified. */
  rawResponse: z.string(),
  /** Populated when pass is false — Zod validation error messages. */
  validationErrors: z.array(z.string()).optional(),
  timestamp: z.string().datetime(),
});

export type TaskResult = z.infer<typeof TaskResultSchema>;

// ---------------------------------------------------------------------------
// Run summary (aggregate stats per model for a completed suite run)
// ---------------------------------------------------------------------------

export const RunSummarySchema = z.object({
  model: z.enum(MODEL_IDS),
  totalTasks: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  /** Pass rate as a decimal, e.g. 0.85 for 85%. */
  passRate: z.number().min(0).max(1),
  meanLatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
  /** Percentage of responses that were valid JSON where expected. */
  jsonValidityRate: z.number().min(0).max(1),
  completedAt: z.string().datetime(),
});

export type RunSummary = z.infer<typeof RunSummarySchema>;

// ---------------------------------------------------------------------------
// Expected-output schema registry
// Each task's `expectedSchema` key resolves to a Zod schema here.
// The runner calls schemaRegistry[task.expectedSchema].safeParse(parsed).
// ---------------------------------------------------------------------------

export const schemaRegistry: Record<string, z.ZodTypeAny> = {
  /** task-001: single weather tool call */
  weather_tool_call: z.object({
    tool_name: z.literal('get_weather'),
    arguments: z.object({
      location: z.string(),
      unit: z.enum(['celsius', 'fahrenheit']).optional(),
    }),
  }),

  /** task-002: parallel weather + currency tool calls */
  parallel_weather_currency: z.object({
    tool_calls: z
      .array(
        z.union([
          z.object({
            tool_name: z.literal('get_weather'),
            arguments: z.object({ location: z.string() }),
          }),
          z.object({
            tool_name: z.literal('get_exchange_rate'),
            arguments: z.object({
              from_currency: z.string().length(3),
              to_currency: z.string().length(3),
            }),
          }),
        ]),
      )
      .min(2),
  }),

  /** task-003: entity extraction into a strict schema */
  entity_extraction: z.object({
    entities: z.array(
      z.object({
        text: z.string(),
        type: z.enum(['person', 'organisation', 'location', 'date', 'product']),
        confidence: z.number().min(0).max(1),
      }),
    ),
  }),
};
