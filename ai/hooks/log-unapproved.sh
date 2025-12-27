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

COMMAND_NAME=$(echo "$COMMAND" | awk '{print $1}')
if [[ -z "$COMMAND_NAME" || "$COMMAND_NAME" =~ ^[A-Z_]+=.* ]]; then
  exit 0
fi

LOG_FILE="${HOME}/.claude/permission-prompts.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') | Bash(${COMMAND_NAME}:*) | ${COMMAND:0:200}" >> "$LOG_FILE"
