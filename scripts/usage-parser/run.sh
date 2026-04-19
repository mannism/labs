#!/bin/bash
# Usage parser runner — loads .env and executes the parser
# Called by launchd daily at 3:00am SGT (19:00 UTC)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LABS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$HOME/.claude/logs"

mkdir -p "$LOG_DIR"

# Load environment variables
set -a
source "$SCRIPT_DIR/.env"
set +a

# Run the parser, log stderr to file
cd "$LABS_DIR"
npx tsx scripts/usage-parser/index.ts \
  > "$LOG_DIR/usage-parser-stdout.json" \
  2> "$LOG_DIR/usage-parser-stderr.log"
