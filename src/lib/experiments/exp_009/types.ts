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

// Zod v4: ZodType<Output, Input> — Input defaults to Output for non-transformed schemas.
// The explicit annotation is required to break the circular type reference in z.lazy.
const ToolParameterSchema: z.ZodType<ToolParameter, ToolParameter> = z.lazy(() =>
  z.object({
    type: z.enum(['object', 'string', 'number', 'boolean', 'array']),
    description: z.string().optional(),
    // z.record in Zod v4 requires two args: key schema + value schema.
    properties: z.record(z.string(), ToolParameterSchema).optional(),
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
  /**
   * Whether this task originated from a real production orchestration pattern
   * ('production') or was authored as a representative synthetic example
   * ('synthetic'). Used to filter and label tasks in the dashboard.
   */
  source: z.enum(['synthetic', 'production']),
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
// API request / response shapes
// ---------------------------------------------------------------------------

/**
 * Request body for POST /api/experiments/exp_009/run.
 * taskIds: subset of task IDs to run; omit/empty → run all loaded tasks.
 * modelIds: subset of model IDs to run; omit/empty → run all three models.
 */
export const RunRequestSchema = z.object({
  taskIds: z.array(z.string()).optional(),
  modelIds: z.array(z.enum(MODEL_IDS)).optional(),
});

export type RunRequest = z.infer<typeof RunRequestSchema>;

/**
 * Response body for POST /api/experiments/exp_009/run.
 * runId is used to subscribe to the SSE stream at GET /results?runId=<runId>.
 */
export const RunResponseSchema = z.object({
  runId: z.string(),
});

export type RunResponse = z.infer<typeof RunResponseSchema>;

/**
 * SSE event shapes for GET /api/experiments/exp_009/results.
 *
 * Clients receive two event types:
 *   event: task_result  — emitted for each completed TaskResult
 *   event: done         — emitted once all tasks across all models are complete
 *   event: error        — emitted if the run fails fatally before completing
 */
export const SseTaskResultEventSchema = z.object({
  type: z.literal('task_result'),
  data: TaskResultSchema,
});

export const SseDoneEventSchema = z.object({
  type: z.literal('done'),
  runId: z.string(),
  totalResults: z.number().int().nonnegative(),
});

export const SseErrorEventSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export type SseTaskResultEvent = z.infer<typeof SseTaskResultEventSchema>;
export type SseDoneEvent = z.infer<typeof SseDoneEventSchema>;
export type SseErrorEvent = z.infer<typeof SseErrorEventSchema>;

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
  // -------------------------------------------------------------------------
  // simple_tool_call (tasks 001, 004, 005)
  // -------------------------------------------------------------------------

  /** task-001: single weather tool call */
  weather_tool_call: z.object({
    tool_name: z.literal('get_weather'),
    arguments: z.object({
      location: z.string(),
      unit: z.enum(['celsius', 'fahrenheit']).optional(),
    }),
  }),

  /** task-004: single CRM contact lookup by email */
  crm_contact_lookup: z.object({
    tool_name: z.literal('lookup_contact'),
    arguments: z.object({
      email: z.string().email(),
    }),
  }),

  /** task-005: single CMS page fetch by slug */
  cms_page_fetch: z.object({
    tool_name: z.literal('fetch_page'),
    arguments: z.object({
      slug: z.string(),
      locale: z.string().optional(),
    }),
  }),

  // -------------------------------------------------------------------------
  // parallel_tool_calls (tasks 002, 006, 007)
  // -------------------------------------------------------------------------

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

  /** task-006: parallel user profile + subscription plan lookups */
  parallel_user_subscription: z.object({
    tool_calls: z
      .array(
        z.union([
          z.object({
            tool_name: z.literal('get_user_profile'),
            arguments: z.object({ user_id: z.string() }),
          }),
          z.object({
            tool_name: z.literal('get_subscription_plan'),
            arguments: z.object({ account_id: z.string() }),
          }),
        ]),
      )
      .min(2),
  }),

  /** task-007: parallel inventory check + shipping estimate */
  parallel_inventory_shipping: z.object({
    tool_calls: z
      .array(
        z.union([
          z.object({
            tool_name: z.literal('check_inventory'),
            arguments: z.object({ sku: z.string(), warehouse_id: z.string().optional() }),
          }),
          z.object({
            tool_name: z.literal('estimate_shipping'),
            arguments: z.object({ destination_postcode: z.string(), weight_kg: z.number() }),
          }),
        ]),
      )
      .min(2),
  }),

  // -------------------------------------------------------------------------
  // chained_tool_calls (tasks 008, 009, 010)
  // -------------------------------------------------------------------------
  //
  // Chained tasks ask the model to plan a multi-step sequence in a single
  // turn. The runner returns { tool_calls: [...] } for all tool-calling
  // categories. For chained tasks the model must emit both calls in the
  // correct order without executing them. We validate the full tool_calls
  // array shape — both tool names and required arguments must be present.
  //
  // Note: because no real tool execution occurs, the model cannot actually
  // thread a real draft_id or slug from step 1 into step 2. The schema
  // accepts any non-empty string for those pass-through fields — the
  // structural planning (correct tool names + argument keys) is what's
  // being tested, not runtime values.

  /**
   * task-008: plan a two-step chain — get_user_profile then get_billing_status.
   * Validates that both tool calls are present in the correct order with the
   * required argument keys populated.
   */
  chained_user_org_billing: z.object({
    tool_calls: z
      .tuple([
        z.object({
          tool_name: z.literal('get_user_profile'),
          arguments: z.object({ user_id: z.string() }),
        }),
        z.object({
          tool_name: z.literal('get_billing_status'),
          arguments: z.object({ org_id: z.string() }),
        }),
      ]),
  }),

  /**
   * task-009: plan a two-step CMS chain — search_articles then fetch_article.
   * Validates both calls are present in order with required argument keys.
   */
  chained_cms_search_fetch: z.object({
    tool_calls: z
      .tuple([
        z.object({
          tool_name: z.literal('search_articles'),
          arguments: z.object({ tag: z.string(), limit: z.number().int().positive().optional() }),
        }),
        z.object({
          tool_name: z.literal('fetch_article'),
          arguments: z.object({ slug: z.string() }),
        }),
      ]),
  }),

  /**
   * task-010: plan a two-step email chain — create_email_draft then schedule_email.
   * Validates both calls are in order with the required argument keys.
   * draft_id in step 2 must be a non-empty string (runtime value unknown at plan time).
   */
  chained_draft_schedule: z.object({
    tool_calls: z
      .tuple([
        z.object({
          tool_name: z.literal('create_email_draft'),
          arguments: z.object({
            to: z.string().email(),
            subject: z.string(),
            body: z.string(),
          }),
        }),
        z.object({
          tool_name: z.literal('schedule_email'),
          arguments: z.object({
            draft_id: z.string().min(1),
            send_at: z.string().datetime(),
          }),
        }),
      ]),
  }),

  // -------------------------------------------------------------------------
  // structured_json (tasks 003, 011, 012)
  // -------------------------------------------------------------------------

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

  /** task-011: classify a support ticket into category, priority, and sentiment */
  support_ticket_classification: z.object({
    category: z.enum(['billing', 'technical', 'account', 'feature_request', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    sentiment: z.enum(['positive', 'neutral', 'negative']),
    suggested_team: z.string(),
    summary: z.string().max(200),
  }),

  /**
   * task-012: parse a free-text job posting into a structured vacancy record.
   * Tests JSON fidelity across multiple fields with type constraints.
   */
  job_posting_parse: z.object({
    title: z.string(),
    location: z.string(),
    employment_type: z.enum(['full_time', 'part_time', 'contract', 'internship']),
    remote_policy: z.enum(['on_site', 'hybrid', 'remote']),
    salary_range: z
      .object({
        min: z.number().nonnegative(),
        max: z.number().nonnegative(),
        currency: z.string().length(3),
      })
      .optional(),
    required_skills: z.array(z.string()).min(1),
    seniority: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
  }),

  // -------------------------------------------------------------------------
  // multi_step (tasks 013, 014, 015)
  // -------------------------------------------------------------------------

  /**
   * task-013: ingest a webhook payload, validate required fields, then decide
   * which downstream action to route it to. Tests conditional branching
   * within a structured output — the model must reason about the payload
   * before emitting the routing decision.
   */
  webhook_routing: z.object({
    payload_valid: z.boolean(),
    validation_errors: z.array(z.string()),
    route_to: z.enum(['crm_sync', 'billing_update', 'notification', 'discard']),
    reason: z.string(),
  }),

  /**
   * task-014: given a candidate CV summary and a job spec, produce a structured
   * shortlisting decision with justification and recommended interview questions.
   * Tests multi-criteria reasoning output under a strict schema.
   */
  candidate_shortlist: z.object({
    decision: z.enum(['shortlist', 'hold', 'reject']),
    match_score: z.number().min(0).max(100),
    strengths: z.array(z.string()).min(1).max(5),
    gaps: z.array(z.string()),
    interview_questions: z.array(z.string()).min(2).max(5),
    summary: z.string().max(300),
  }),

  /**
   * task-015: analyse a set of API error logs, identify the root cause category,
   * and produce an incident triage record with suggested remediation steps.
   * Tests analytical reasoning + structured multi-field output.
   */
  incident_triage: z.object({
    root_cause_category: z.enum([
      'rate_limit',
      'auth_failure',
      'upstream_timeout',
      'malformed_payload',
      'config_error',
      'unknown',
    ]),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    affected_services: z.array(z.string()).min(1),
    remediation_steps: z.array(z.string()).min(1).max(6),
    requires_escalation: z.boolean(),
  }),
};
