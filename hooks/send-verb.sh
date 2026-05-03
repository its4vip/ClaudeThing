#!/usr/bin/env bash
# PreToolUse hook — Claude Code passes hook context as JSON on stdin.
# Extracts tool_name, maps to a verb, POSTs to the ClaudeThing plugin.
# Fails silently if the plugin is not running.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { process.stdout.write(JSON.parse(d).tool_name || '') }
    catch { process.stdout.write('') }
  });
")

VERB=$(node "$SCRIPT_DIR/map-verb.js" "$TOOL_NAME" 2>/dev/null || printf 'Thinking')

curl -sf --max-time 1 \
  -X POST http://localhost:7891/status \
  -H 'Content-Type: application/json' \
  --data-raw "$(printf '{"source":"code","verb":"%s"}' "$VERB")" \
  >/dev/null 2>&1 || true
