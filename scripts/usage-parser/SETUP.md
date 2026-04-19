# Usage Tracking Pipeline — Setup Guide

## Overview

Three-part pipeline that parses Claude Code JSONL session logs, aggregates daily usage by model tier, estimates costs, and writes records to a Notion database via a daily n8n workflow.

## Architecture

```
~/.claude/projects/**/*.jsonl
        ↓
  index.ts (parser)           — runs via n8n Execute Command node
        ↓
  stdout: JSON array           — one object per day
        ↓
  n8n Code node               — splits into items
        ↓
  n8n Notion node             — creates page per day in Usage Tracking DB
        ↓
  Notion: Usage Tracking DB
```

Error path: any failure → Slack #claude alert.

---

## Part 1: Parser (done, committed)

File: `scripts/usage-parser/index.ts`

**Test run:**
```bash
cd /Users/mann/Documents/GitHub/labs
npx tsx scripts/usage-parser/index.ts
```

- Outputs JSON array to stdout, progress/errors to stderr
- High-water mark at `~/.claude/usage-hwm.json` — delete to re-backfill
- Skips files with schema mismatches (logs warning, doesn't crash)

---

## Part 2: Notion Database Setup

**Prerequisites:**
1. Create a Notion internal integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Connect it to the "Command Center" page (open page → Share → Connections → add integration)
3. Copy the integration token

**Run:**
```bash
NOTION_API_KEY=secret_xxx npx tsx scripts/usage-parser/setup-notion-db.ts
```

This creates the "Usage Tracking" database under Command Center and outputs:
```
NOTION_USAGE_DB_ID=<database-id>
```

Add `NOTION_USAGE_DB_ID` to:
- Labs `.env` file (for local reference)
- n8n environment variables: n8n UI → Settings → Variables → add `NOTION_USAGE_DB_ID`

---

## Part 3: n8n Workflow Setup

**Prerequisites:**
1. n8n running at `http://localhost:5678` (docker-compose in `~/Documents/docker/n8n/`)
2. Notion credential configured in n8n:
   - n8n UI → Credentials → New → Notion API
   - Name it exactly: **"Notion (Usage Tracking)"**
   - Paste the integration token
3. Slack credential in n8n:
   - n8n UI → Credentials → New → Slack OAuth2 API
   - Name it: **"Slack (Diana Labs)"**
4. n8n API key:
   - n8n UI → Settings → API → Create API Key
5. `NOTION_USAGE_DB_ID` set in n8n Variables (Settings → Variables)

**Run:**
```bash
N8N_API_KEY=xxx npx tsx scripts/usage-parser/create-n8n-workflow.ts
```

Or create the workflow manually in n8n using `n8n-workflow-sdk.js` as reference.

**Workflow:** `Daily Claude Usage Tracking`
- Trigger: `0 19 * * *` UTC (03:00 SGT)
- On error: Slack alert to #claude

---

## Pricing reference

Costs are estimated using Anthropic published rates (as of April 2026):

| Model tier | Input | Output | Cache write (1h) | Cache read |
|---|---|---|---|---|
| Opus 4.x | $5/MTok | $25/MTok | $10/MTok | $0.50/MTok |
| Sonnet 4.6 | $3/MTok | $15/MTok | $6/MTok | $0.30/MTok |
| Haiku 4.5 | $1/MTok | $5/MTok | $2/MTok | $0.10/MTok |

All cost figures in the DB are **estimated** — actual billing may differ due to batch discounts, volume tiers, or model-specific overrides.
