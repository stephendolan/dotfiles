#!/bin/bash
# Logs Bash commands for allow-list refinement (PreToolUse hook)

HOOK_INPUT=$(cat)
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name')

if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // empty')
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

COMMAND_ONELINE=$(echo "$COMMAND" | tr '\n' ' ' | sed 's/  */ /g')
# Extract command name from first line only (use basename if it's a path)
FIRST_WORD=$(echo "$COMMAND" | head -1 | awk '{print $1}' | sed 's/^[(]//')
COMMAND_NAME=$(basename "$FIRST_WORD" 2>/dev/null || echo "$FIRST_WORD")
if [[ -z "$COMMAND_NAME" || "$COMMAND_NAME" =~ ^[A-Z_]+=.* ]]; then
  exit 0
fi

LOG_FILE="${HOME}/.claude/permission-prompts.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') | Bash(${COMMAND_NAME}:*) | ${COMMAND_ONELINE:0:200}" >> "$LOG_FILE"
