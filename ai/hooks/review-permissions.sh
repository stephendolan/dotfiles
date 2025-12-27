#!/bin/bash
set -euo pipefail

LOG_FILE="${HOME}/.claude/permission-prompts.log"

if [[ ! -f "$LOG_FILE" ]]; then
  echo "No permission prompts logged yet."
  exit 0
fi

if [[ "${1:-}" == "--clear" ]]; then
  rm "$LOG_FILE"
  echo "Cleared permission log."
  exit 0
fi

echo "=== Command patterns by frequency ==="
awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2}' "$LOG_FILE" \
  | sort | uniq -c | sort -rn

echo ""
echo "=== Recent prompts (last 10) ==="
tail -10 "$LOG_FILE"

echo ""
echo "To clear: $0 --clear"
echo "To add patterns: edit ~/.dotfiles/ai/claude-settings.json"
