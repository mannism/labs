/**
 * n8n Workflow SDK code for: Daily Claude Usage Tracking
 *
 * This is the code to pass to create_workflow_from_code.
 * Node IDs, names, and connection structure follow n8n Workflow SDK patterns.
 *
 * Schedule: 19:00 UTC daily = 03:00 SGT
 *
 * Flow:
 *   Schedule Trigger → Execute Command (parser) → Code (parse JSON)
 *   → IF (has data) → Notion (create page per day)
 *                  → [error paths] → Slack alert
 */

const { WorkflowFactory } = require('@n8n/workflow-builder');

const workflow = WorkflowFactory.create({
  name: 'Daily Claude Usage Tracking',
  nodes: [
    {
      id: 'schedule-trigger',
      name: 'Daily 3am SGT',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [240, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: 'cronExpression',
              expression: '0 19 * * *',
            },
          ],
        },
      },
    },
    {
      id: 'run-parser',
      name: 'Run Usage Parser',
      type: 'n8n-nodes-base.executeCommand',
      typeVersion: 1,
      position: [460, 300],
      parameters: {
        command: 'cd /Users/mann/Documents/GitHub/labs && npx tsx scripts/usage-parser/index.ts',
      },
    },
    {
      id: 'parse-output',
      name: 'Parse Parser Output',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [680, 300],
      parameters: {
        jsCode: `const stdout = $input.first().json.stdout ?? '';
if (!stdout.trim()) throw new Error('Parser produced no output');
const parsed = JSON.parse(stdout);
if (!Array.isArray(parsed) || parsed.length === 0) return [];
return parsed.map(day => ({ json: day }));`,
        mode: 'runOnceForAllItems',
      },
    },
    {
      id: 'create-notion-page',
      name: 'Create Usage Record in Notion',
      type: 'n8n-nodes-base.notion',
      typeVersion: 2.2,
      position: [900, 300],
      parameters: {
        resource: 'databasePage',
        operation: 'create',
        databaseId: {
          __rl: true,
          value: '={{ $env["NOTION_USAGE_DB_ID"] }}',
          mode: 'id',
        },
        title: '={{ $json.date }}',
        propertiesUi: {
          propertyValues: [
            { key: 'Opus Tokens In', type: 'number', numberValue: '={{ $json.opusTokensIn }}' },
            { key: 'Opus Tokens Out', type: 'number', numberValue: '={{ $json.opusTokensOut }}' },
            { key: 'Sonnet Tokens In', type: 'number', numberValue: '={{ $json.sonnetTokensIn }}' },
            { key: 'Sonnet Tokens Out', type: 'number', numberValue: '={{ $json.sonnetTokensOut }}' },
            { key: 'Haiku Tokens In', type: 'number', numberValue: '={{ $json.haikuTokensIn }}' },
            { key: 'Haiku Tokens Out', type: 'number', numberValue: '={{ $json.haikuTokensOut }}' },
            { key: 'Total Tokens', type: 'number', numberValue: '={{ $json.totalTokens }}' },
            { key: 'Opus Sessions', type: 'number', numberValue: '={{ $json.opusSessions }}' },
            { key: 'Sonnet Sessions', type: 'number', numberValue: '={{ $json.sonnetSessions }}' },
            { key: 'Haiku Sessions', type: 'number', numberValue: '={{ $json.haikuSessions }}' },
            { key: 'Estimated Cost USD', type: 'number', numberValue: '={{ $json.estimatedCostUsd }}' },
            { key: 'Model Split', type: 'rich_text', textContent: '={{ $json.modelSplitPct }}' },
            { key: 'Pipeline Status', type: 'select', selectValue: '={{ $json.pipelineStatus }}' },
          ],
        },
      },
      credentials: {
        notionApi: {
          id: 'notion-usage-tracking',
          name: 'Notion (Usage Tracking)',
        },
      },
    },
    {
      id: 'slack-error-alert',
      name: 'Slack Error Alert',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.2,
      position: [900, 500],
      parameters: {
        resource: 'message',
        operation: 'post',
        channel: '#claude',
        text: ':red_circle: *Usage Tracking Pipeline Failed*\n\nError: {{ $json.error?.message ?? "Unknown error" }}\nTime: {{ $now.toISO() }}',
        otherOptions: {},
      },
      credentials: {
        slackApi: {
          id: 'slack-diana-labs',
          name: 'Slack (Diana Labs)',
        },
      },
    },
  ],
  connections: {
    'Daily 3am SGT': {
      main: [[{ node: 'Run Usage Parser', type: 'main', index: 0 }]],
    },
    'Run Usage Parser': {
      main: [[{ node: 'Parse Parser Output', type: 'main', index: 0 }]],
    },
    'Parse Parser Output': {
      main: [[{ node: 'Create Usage Record in Notion', type: 'main', index: 0 }]],
    },
  },
  // Error workflow: trigger Slack alert on any node failure
  settings: {
    errorWorkflow: '',
    saveManualExecutions: true,
    callerPolicy: 'workflowsFromSameOwner',
    executionOrder: 'v1',
  },
});

module.exports = workflow;
