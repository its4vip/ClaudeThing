#!/usr/bin/env bash
# Stop hook — clears the Claude Code slot in the ClaudeThing plugin.
# Fails silently if the plugin is not running.
curl -sf --max-time 1 \
  -X POST http://localhost:7891/status \
  -H 'Content-Type: application/json' \
  -d '{"source":"code","verb":null}' \
  >/dev/null 2>&1 || true
