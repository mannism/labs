/**
 * n8n Workflow: Daily Claude Usage Tracking
 *
 * This file is the source definition for the n8n workflow.
 * It is NOT executed directly — it is passed to create_workflow_from_code.
 *
 * Workflow steps:
 *  1. Schedule trigger: 3:00 AM SGT (19:00 UTC) daily
 *  2. Execute the parser script, capture stdout JSON
 *  3. Parse and loop over each day aggregate
 *  4. Create a page in the "Usage Tracking" Notion DB for each day
 *  5. On error: post to Slack #updates
 *
 * Required n8n credentials:
 *  - Notion API (Internal Integration) named "Notion (Usage Tracking)"
 *  - Slack OAuth named "Slack (Diana Labs)"
 *
 * Required env on the n8n host (set in docker-compose.yml or .env):
 *  - NOTION_USAGE_DB_ID: the database ID from setup-notion-db.ts
 *
 * Note: N8N_BLOCK_ENV_ACCESS_IN_NODE must be false for the Code node to read
 * NOTION_USAGE_DB_ID from process.env.
 */

import {
  WorkflowBuilder,
  NodeBuilder,
  createWorkflow,
} from "@n8n/workflow-sdk";

// ─── Workflow definition ──────────────────────────────────────────────────────

const workflow = createWorkflow({
  name: "Daily Claude Usage Tracking",
  nodes: [
    // 1. Schedule trigger — 19:00 UTC = 03:00 SGT
    NodeBuilder.scheduleTrigger({
      id: "schedule-trigger",
      name: "Daily 3am SGT",
      rule: {
        interval: [
          {
            field: "cronExpression",
            expression: "0 19 * * *",
          },
        ],
      },
    }),

    // 2. Run the parser script, capture stdout
    NodeBuilder.executeCommand({
      id: "run-parser",
      name: "Run Usage Parser",
      command:
        "cd /Users/mann/Documents/GitHub/labs && npx tsx scripts/usage-parser/index.ts",
    }),

    // 3. Parse JSON output and split into items (one per day)
    NodeBuilder.code({
      id: "parse-output",
      name: "Parse Parser Output",
      jsCode: `
// Parse the parser's stdout (JSON array of day aggregates)
// The Execute Command node exposes stdout as items[0].json.stdout
const stdout = $input.first().json.stdout;

if (!stdout || stdout.trim() === '') {
  throw new Error('Parser produced no output');
}

let parsed;
try {
  parsed = JSON.parse(stdout);
} catch (e) {
  throw new Error('Parser output is not valid JSON: ' + e.message);
}

if (!Array.isArray(parsed)) {
  throw new Error('Parser output is not an array');
}

if (parsed.length === 0) {
  // No new data — return a sentinel item so downstream handles gracefully
  return [{ json: { _noData: true } }];
}

// Emit one item per day aggregate
return parsed.map(day => ({ json: day }));
      `,
    }),

    // 4. Filter out the no-data sentinel
    NodeBuilder.if({
      id: "has-data",
      name: "Has New Data?",
      conditions: {
        options: { caseSensitive: false, leftValue: "", typeValidation: "strict" },
        conditions: [
          {
            id: "condition-1",
            leftValue: "={{ $json._noData }}",
            rightValue: true,
            operator: {
              type: "boolean",
              operation: "notEquals",
            },
          },
        ],
        combinator: "and",
      },
    }),

    // 5. Create a Notion page for each day aggregate
    NodeBuilder.notion({
      id: "create-notion-page",
      name: "Create Usage Record in Notion",
      resource: "databasePage",
      operation: "create",
      databaseId: {
        __rl: true,
        value: "={{ $env.NOTION_USAGE_DB_ID }}",
        mode: "id",
      },
      propertiesUi: {
        propertyValues: [
          // Title / Date field
          {
            key: "Date",
            title: "={{ $json.date }}",
          },
          { key: "Opus Tokens In", numberValue: "={{ $json.opusTokensIn }}" },
          { key: "Opus Tokens Out", numberValue: "={{ $json.opusTokensOut }}" },
          {
            key: "Sonnet Tokens In",
            numberValue: "={{ $json.sonnetTokensIn }}",
          },
          {
            key: "Sonnet Tokens Out",
            numberValue: "={{ $json.sonnetTokensOut }}",
          },
          { key: "Haiku Tokens In", numberValue: "={{ $json.haikuTokensIn }}" },
          {
            key: "Haiku Tokens Out",
            numberValue: "={{ $json.haikuTokensOut }}",
          },
          { key: "Total Tokens", numberValue: "={{ $json.totalTokens }}" },
          { key: "Opus Sessions", numberValue: "={{ $json.opusSessions }}" },
          {
            key: "Sonnet Sessions",
            numberValue: "={{ $json.sonnetSessions }}",
          },
          { key: "Haiku Sessions", numberValue: "={{ $json.haikuSessions }}" },
          {
            key: "Estimated Cost USD",
            numberValue: "={{ $json.estimatedCostUsd }}",
          },
          {
            key: "Model Split",
            textContent: "={{ $json.modelSplitPct }}",
          },
          {
            key: "Pipeline Status",
            selectValue: "={{ $json.pipelineStatus }}",
          },
        ],
      },
    }),

    // 6. Error handler — post to Slack on failure
    NodeBuilder.slack({
      id: "slack-error",
      name: "Slack Error Alert",
      resource: "message",
      operation: "post",
      channel: "#claude",
      text: ":red_circle: *Usage Tracking Pipeline Failed*\n\nError: {{ $json.error?.message ?? 'Unknown error' }}\nTime: {{ $now.toISO() }}",
    }),
  ],

  connections: [
    { from: "schedule-trigger", to: "run-parser" },
    { from: "run-parser", to: "parse-output" },
    { from: "parse-output", to: "has-data" },
    // true branch (has data) → create Notion page
    { from: "has-data", to: "create-notion-page", outputIndex: 0 },
    // Error paths → Slack alert
    { from: "run-parser", to: "slack-error", outputIndex: "error" },
    { from: "parse-output", to: "slack-error", outputIndex: "error" },
    { from: "create-notion-page", to: "slack-error", outputIndex: "error" },
  ],
});

export default workflow;
