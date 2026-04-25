#!/bin/bash
# Usage parser runner — loads .env and executes the parser
# Called by launchd daily at 3:00am SGT
# Parses Claude Code JSONL session logs, writes daily aggregates to Notion

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOME="/Users/mann"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LABS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$HOME/.claude/logs"

mkdir -p "$LOG_DIR"

# Load environment variables (NOTION_API_KEY, NOTION_USAGE_DB_ID)
set -a
source "$SCRIPT_DIR/.env"
set +a

# Run the parser, log stderr to file
cd "$LABS_DIR"
npx tsx scripts/usage-parser/index.ts \
  > "$LOG_DIR/usage-parser-stdout.json" \
  2> "$LOG_DIR/usage-parser-stderr.log"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Daily parser complete" >> "$LOG_DIR/usage-parser-stderr.log"
