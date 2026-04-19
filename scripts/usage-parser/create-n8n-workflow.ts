/**
 * n8n Workflow Creator — Daily Claude Usage Tracking
 *
 * Creates the usage tracking workflow in n8n via the REST API.
 * Run after setup-notion-db.ts has been executed and the Notion
 * credential has been configured in n8n.
 *
 * Prerequisites:
 *   - n8n is running at http://localhost:5678
 *   - N8N_API_KEY env var set (generate at n8n Settings → API)
 *   - "Notion (Usage Tracking)" credential exists in n8n
 *   - "Slack (Diana Labs)" credential exists in n8n
 *   - NOTION_USAGE_DB_ID is set as an n8n env variable
 *
 * Usage:
 *   N8N_API_KEY=xxx N8N_HOST=http://localhost:5678 npx tsx scripts/usage-parser/create-n8n-workflow.ts
 */

const N8N_HOST = process.env["N8N_HOST"] ?? "http://localhost:5678";
const N8N_API_KEY = process.env["N8N_API_KEY"];

if (!N8N_API_KEY) {
  process.stderr.write(
    "ERROR: N8N_API_KEY not set. Generate one at n8n Settings → API Keys.\n"
  );
  process.exit(1);
}

/**
 * n8n workflow definition.
 *
 * Schedule: cron 0 19 * * * = 19:00 UTC = 03:00 SGT
 *
 * Error handling: n8n's continue-on-fail is NOT used here — we let the
 * workflow fail hard and rely on the n8n error workflow to send Slack alerts.
 * The Slack alert node is wired to an error trigger workflow (separate).
 */
const WORKFLOW_DEFINITION = {
  name: "Daily Claude Usage Tracking",
  active: true,
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
  },
  nodes: [
    {
      id: "a1b2c3d4-0001-0000-0000-000000000001",
      name: "Daily 3am SGT",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: "0 19 * * *",
            },
          ],
        },
      },
    },
    {
      id: "a1b2c3d4-0002-0000-0000-000000000002",
      name: "Run Usage Parser",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [460, 300],
      parameters: {
        // Uses the full path so this works regardless of n8n's working directory
        command:
          "cd /Users/mann/Documents/GitHub/labs && npx tsx scripts/usage-parser/index.ts",
      },
    },
    {
      id: "a1b2c3d4-0003-0000-0000-000000000003",
      name: "Parse Parser Output",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [680, 300],
      parameters: {
        mode: "runOnceForAllItems",
        jsCode: `// Parse the parser's JSON stdout into one item per day aggregate
const stdout = ($input.first().json.stdout ?? '').trim();

if (!stdout) {
  // Parser ran but produced no output (no new data) — emit nothing to stop the workflow
  return [];
}

let parsed;
try {
  parsed = JSON.parse(stdout);
} catch (e) {
  throw new Error('Parser output is not valid JSON: ' + e.message + '\\nRaw: ' + stdout.slice(0, 200));
}

if (!Array.isArray(parsed)) {
  throw new Error('Parser output must be a JSON array, got: ' + typeof parsed);
}

if (parsed.length === 0) {
  return [];
}

// Emit one item per day so the Notion node runs once per record
return parsed.map(day => ({ json: day }));`,
      },
    },
    {
      id: "a1b2c3d4-0004-0000-0000-000000000004",
      name: "Create Usage Record in Notion",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [900, 300],
      parameters: {
        resource: "databasePage",
        operation: "create",
        databaseId: {
          __rl: true,
          // Reads from n8n environment variable set in n8n Settings → Variables
          value: "={{ $env.NOTION_USAGE_DB_ID }}",
          mode: "id",
        },
        // Map the date field as the page title
        title: "={{ $json.date }}",
        propertiesUi: {
          propertyValues: [
            {
              key: "Opus Tokens In",
              type: "number",
              numberValue: "={{ $json.opusTokensIn }}",
            },
            {
              key: "Opus Tokens Out",
              type: "number",
              numberValue: "={{ $json.opusTokensOut }}",
            },
            {
              key: "Sonnet Tokens In",
              type: "number",
              numberValue: "={{ $json.sonnetTokensIn }}",
            },
            {
              key: "Sonnet Tokens Out",
              type: "number",
              numberValue: "={{ $json.sonnetTokensOut }}",
            },
            {
              key: "Haiku Tokens In",
              type: "number",
              numberValue: "={{ $json.haikuTokensIn }}",
            },
            {
              key: "Haiku Tokens Out",
              type: "number",
              numberValue: "={{ $json.haikuTokensOut }}",
            },
            {
              key: "Total Tokens",
              type: "number",
              numberValue: "={{ $json.totalTokens }}",
            },
            {
              key: "Opus Sessions",
              type: "number",
              numberValue: "={{ $json.opusSessions }}",
            },
            {
              key: "Sonnet Sessions",
              type: "number",
              numberValue: "={{ $json.sonnetSessions }}",
            },
            {
              key: "Haiku Sessions",
              type: "number",
              numberValue: "={{ $json.haikuSessions }}",
            },
            {
              key: "Estimated Cost USD",
              type: "number",
              numberValue: "={{ $json.estimatedCostUsd }}",
            },
            {
              key: "Model Split",
              type: "rich_text",
              textContent: "={{ $json.modelSplitPct }}",
            },
            {
              key: "Pipeline Status",
              type: "select",
              selectValue: "={{ $json.pipelineStatus }}",
            },
          ],
        },
      },
      // Credential name must match exactly what's configured in n8n
      credentials: {
        notionApi: {
          name: "Notion (Usage Tracking)",
        },
      },
    },
    {
      id: "a1b2c3d4-0005-0000-0000-000000000005",
      name: "Slack Error Alert",
      type: "n8n-nodes-base.slack",
      typeVersion: 2.2,
      position: [680, 500],
      parameters: {
        resource: "message",
        operation: "post",
        select: "channel",
        channelId: {
          __rl: true,
          value: "#claude",
          mode: "name",
        },
        text: ":red_circle: *Usage Tracking Pipeline Failed*\n\n*Error:* {{ $json.error?.message ?? 'Unknown' }}\n*Workflow:* Daily Claude Usage Tracking\n*Time:* {{ $now.toISO() }}",
        otherOptions: {},
      },
      credentials: {
        slackApi: {
          name: "Slack (Diana Labs)",
        },
      },
    },
    // Error trigger — fires when any node in this workflow errors
    {
      id: "a1b2c3d4-0006-0000-0000-000000000006",
      name: "Error Trigger",
      type: "n8n-nodes-base.errorTrigger",
      typeVersion: 1,
      position: [460, 500],
      parameters: {},
    },
  ],
  connections: {
    "Daily 3am SGT": {
      main: [[{ node: "Run Usage Parser", type: "main", index: 0 }]],
    },
    "Run Usage Parser": {
      main: [[{ node: "Parse Parser Output", type: "main", index: 0 }]],
    },
    "Parse Parser Output": {
      main: [
        [{ node: "Create Usage Record in Notion", type: "main", index: 0 }],
      ],
    },
    "Error Trigger": {
      main: [[{ node: "Slack Error Alert", type: "main", index: 0 }]],
    },
  },
};

/**
 * POST the workflow to n8n via the public REST API.
 */
async function createWorkflow(): Promise<void> {
  process.stderr.write(
    `[create-workflow] Connecting to n8n at ${N8N_HOST}...\n`
  );

  const response = await fetch(`${N8N_HOST}/api/v1/workflows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": N8N_API_KEY!,
    },
    body: JSON.stringify(WORKFLOW_DEFINITION),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to create workflow (HTTP ${response.status}): ${errorBody}`
    );
  }

  const result = (await response.json()) as {
    id: string;
    name: string;
    active: boolean;
  };

  process.stderr.write(`[create-workflow] Workflow created successfully!\n`);
  process.stderr.write(`[create-workflow] ID:     ${result.id}\n`);
  process.stderr.write(`[create-workflow] Name:   ${result.name}\n`);
  process.stderr.write(`[create-workflow] Active: ${result.active}\n`);
  process.stderr.write(
    `[create-workflow] View at: ${N8N_HOST}/workflow/${result.id}\n`
  );

  process.stdout.write(JSON.stringify({ workflowId: result.id }) + "\n");
}

createWorkflow().catch((err: unknown) => {
  process.stderr.write(`[create-workflow] FATAL: ${String(err)}\n`);
  process.exit(1);
});
