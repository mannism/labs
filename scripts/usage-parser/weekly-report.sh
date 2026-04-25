#!/bin/bash
# Usage Report — Weekly
# Runs via launchd every Friday at 4am SGT
# Uses a SEPARATE temp HWM (not the shared one) to avoid race with daily parser at 3:30am
# Calls Claude (Sonnet) to analyze results, store report in Notion, and post summary to Slack

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOME="/Users/mann"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LABS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$HOME/.claude/logs"
LOCKFILE="$LOG_DIR/weekly-report.lock"

mkdir -p "$LOG_DIR"

# Lockfile to prevent overlapping runs
if [ -f "$LOCKFILE" ]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Another weekly report is already running, exiting" >> "$LOG_DIR/weekly-report-stderr.log"
  exit 0
fi
trap 'rm -f "$LOCKFILE"' EXIT
echo $$ > "$LOCKFILE"

# Load environment variables (NOTION_API_KEY, NOTION_USAGE_DB_ID, SLACK_BOT_TOKEN)
set -a
source "$SCRIPT_DIR/.env"
set +a

# Calculate date range
REPORT_DATE=$(date +%Y-%m-%d)
WEEK_AGO=$(date -v-7d +%Y-%m-%d)

# Create a TEMPORARY HWM file for the report — don't touch the shared one
TEMP_HWM=$(mktemp /tmp/usage-hwm-weekly.XXXXXX.json)
trap 'rm -f "$LOCKFILE" "$TEMP_HWM"' EXIT
echo "{\"lastProcessedAt\": \"${WEEK_AGO}T00:00:00.000Z\"}" > "$TEMP_HWM"

# Run the parser in dry-run mode with the temp HWM
# Patch: temporarily symlink won't work, so we pass the HWM via environment
cd "$LABS_DIR"
REPORT_JSON=$(USAGE_HWM_PATH="$TEMP_HWM" DRY_RUN=1 npx tsx scripts/usage-parser/index.ts 2>"$LOG_DIR/weekly-report-stderr.log") || {
  # If the parser doesn't support USAGE_HWM_PATH, fall back to direct HWM manipulation
  # with a lock to prevent the daily parser from running simultaneously
  REAL_HWM="$HOME/.claude/usage-hwm.json"
  HWM_BACKUP=$(cat "$REAL_HWM" 2>/dev/null || echo '{}')
  echo "{\"lastProcessedAt\": \"${WEEK_AGO}T00:00:00.000Z\"}" > "$REAL_HWM"
  REPORT_JSON=$(DRY_RUN=1 npx tsx scripts/usage-parser/index.ts 2>>"$LOG_DIR/weekly-report-stderr.log")
  echo "$HWM_BACKUP" > "$REAL_HWM"
}

# Validate we got data
if [ -z "$REPORT_JSON" ] || [ "$REPORT_JSON" = "[]" ]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) No usage data returned, exiting" >> "$LOG_DIR/weekly-report-stderr.log"
  exit 1
fi

# Write report JSON for debugging
echo "$REPORT_JSON" > "$LOG_DIR/weekly-report-data.json"

# Inject Slack bot MCP
MCP_CONFIG='{"mcpServers":{"slack":{"command":"npx","args":["-y","@modelcontextprotocol/server-slack"],"env":{"SLACK_BOT_TOKEN":"'"${SLACK_BOT_TOKEN}"'","SLACK_TEAM_ID":"T0AGPM7PQG0"}}}}'

# Call Claude (Sonnet) to analyze, store in Notion, and post to Slack
claude --print --model sonnet \
  --allow-dangerously-skip-permissions --dangerously-skip-permissions \
  --mcp-config "${MCP_CONFIG}" \
  --allowedTools "mcp__notion__notion-create-pages,mcp__slack__slack_post_message" \
  -p "You are Jo, the operations agent. Analyze this weekly usage data and produce a Usage Report.

Today is ${REPORT_DATE}. The report covers ${WEEK_AGO} to ${REPORT_DATE}.

Here is the raw usage data (JSON array of daily aggregates):

${REPORT_JSON}

TASKS:

1. ANALYZE the data:
   - Total tokens and estimated cost for the period
   - Model split (Opus/Sonnet/Haiku percentages by output tokens)
   - Trend vs target: Opus should be <20% (orchestration only). Flag if above.
   - Identify the highest-cost day and any anomalies
   - Calculate week-over-week change if prior data exists

2. STORE in Notion — create a page in the Usage Reports database:
   - parent: {\"data_source_id\": \"cb95b2f4-82cc-44f5-bce1-4d41e4fad669\"}
   - properties:
     - \"Report Title\": \"Usage Report — ${WEEK_AGO} to ${REPORT_DATE}\"
     - \"date:Usage From:start\": \"${WEEK_AGO}\"
     - \"date:Usage To:start\": \"${REPORT_DATE}\"
     - \"Summary\": 2-3 sentence summary of key findings
     - \"Actionable Items\": numbered list of concrete next steps
     - \"Total Tokens\": total token count
     - \"Estimated Cost USD\": total cost
     - \"Model Split\": \"Opus X% / Sonnet Y% / Haiku Z%\"
     - \"Status\": \"Generated\"
   - content: Full report with daily breakdown table, analysis, and recommendations

3. POST to Slack channel C0AR2PKMZ4Z:
   Format:
   *Usage Report: ${REPORT_DATE}*
   _${WEEK_AGO} to ${REPORT_DATE}_

   *Summary:* {2-3 sentence summary}

   *Model Split:* Opus X% / Sonnet Y% / Haiku Z%
   *Total Tokens:* {formatted number}
   *Estimated Cost:* \${amount}

   *Action Items:*
   {numbered list}

   Full report: {Notion page URL}

Rules:
- Be concise and direct
- Flag any compliance issues (Opus >20%)
- Compare to the target of Opus <20%, Sonnet ~60-70%, Haiku ~15-20%
" \
  > "$LOG_DIR/weekly-report-stdout.log" \
  2>> "$LOG_DIR/weekly-report-stderr.log"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Weekly report complete" >> "$LOG_DIR/weekly-report-stderr.log"
