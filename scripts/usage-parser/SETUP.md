# Usage Tracking Pipeline — Setup Guide

## Overview

Local pipeline that parses Claude Code JSONL session logs, aggregates daily usage by model tier, estimates costs, and writes records directly to a Notion database. Runs daily at 3:00am via macOS launchd.

## Architecture

```
~/.claude/projects/**/*.jsonl
        |
  index.ts (parser + Notion writer)
        |
  Notion: Usage Tracking DB
```

Scheduled by launchd (`com.dianaismail.usage-parser`), runs at 3:00am daily. If the machine is asleep, launchd fires the job on wake. The high-water mark ensures no data is lost.

---

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Parser + Notion writer |
| `run.sh` | Shell wrapper — loads .env, runs parser, logs output |
| `.env` | Notion API key and database ID (gitignored) |

## Logs

- `~/.claude/logs/usage-parser-stdout.json` — last run's JSON output
- `~/.claude/logs/usage-parser-stderr.log` — last run's progress/errors
- `~/.claude/logs/usage-parser-launchd.out` — launchd stdout
- `~/.claude/logs/usage-parser-launchd.err` — launchd stderr

## High-Water Mark

Stored at `~/.claude/usage-hwm.json`. Delete this file to trigger a full re-backfill of all historical data.

---

## Manual Run

```bash
cd /Users/mann/Documents/GitHub/labs

# Dry run (no Notion writes)
DRY_RUN=1 npx tsx scripts/usage-parser/index.ts

# Full run
source scripts/usage-parser/.env
export NOTION_API_KEY NOTION_USAGE_DB_ID
npx tsx scripts/usage-parser/index.ts
```

## launchd Management

```bash
# Check status
launchctl list | grep usage-parser

# Unload (stop scheduling)
launchctl unload ~/Library/LaunchAgents/com.dianaismail.usage-parser.plist

# Reload (after plist changes)
launchctl unload ~/Library/LaunchAgents/com.dianaismail.usage-parser.plist
launchctl load ~/Library/LaunchAgents/com.dianaismail.usage-parser.plist

# Manual trigger (test)
launchctl start com.dianaismail.usage-parser
```

---

## Notion Database

- **Name:** Usage Tracking
- **Location:** Command Center
- **ID:** `3471040c-1cf4-81ff-9784-cbb12bf1abe3`

## Pricing Reference

Costs are estimated using Anthropic published rates (as of April 2026):

| Model tier | Input | Output | Cache write (1h) | Cache read |
|---|---|---|---|---|
| Opus 4.x | $5/MTok | $25/MTok | $10/MTok | $0.50/MTok |
| Sonnet 4.6 | $3/MTok | $15/MTok | $6/MTok | $0.30/MTok |
| Haiku 4.5 | $1/MTok | $5/MTok | $2/MTok | $0.10/MTok |

All cost figures are **estimated** — actual billing may differ due to subscription plans, batch discounts, or volume tiers.
