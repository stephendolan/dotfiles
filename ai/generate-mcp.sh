#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:a:h}"
SOURCE_FILE="${SCRIPT_DIR}/mcp.json"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Error: $SOURCE_FILE not found"
  exit 1
fi

echo "Generating MCP configs from mcp.json..."

# Determine Claude Desktop config location based on platform
if [[ "$(uname)" == "Darwin" ]]; then
  CLAUDE_DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
else
  CLAUDE_DESKTOP_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"
fi

# 1. Generate Claude Desktop config
echo "  -> Claude Desktop: ${CLAUDE_DESKTOP_CONFIG}"
mkdir -p "$(dirname "$CLAUDE_DESKTOP_CONFIG")"
jq '{globalShortcut: ""} + .' "$SOURCE_FILE" | npx prettier --parser json > "$CLAUDE_DESKTOP_CONFIG"

# 2. Sync to Claude Code CLI (if available)
if command -v claude &>/dev/null; then
  echo "  -> Claude Code CLI"

  # Remove servers not in source file
  claude mcp list 2>/dev/null | grep -E '^[a-zA-Z0-9_-]+:' | cut -d: -f1 | while read -r name; do
    if ! jq -e ".mcpServers[\"$name\"]" "$SOURCE_FILE" &>/dev/null; then
      echo "     - $name"
      claude mcp remove "$name" -s user 2>/dev/null || true
    fi
  done

  # Add servers from source file
  jq -r '.mcpServers | keys[]' "$SOURCE_FILE" | while read -r name; do
    if claude mcp get "$name" &>/dev/null; then
      echo "     $name (exists)"
      continue
    fi

    server_json=$(jq -c ".mcpServers[\"$name\"]" "$SOURCE_FILE")
    echo "     + $name"
    claude mcp add-json --scope user "$name" "$server_json" 2>/dev/null || true
  done
else
  echo "  -> Claude Code CLI (not installed, skipping)"
fi

echo ""
echo "Done!"
