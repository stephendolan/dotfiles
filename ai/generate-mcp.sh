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

# 1. Merge into Claude Desktop config (preserves existing keys like preferences)
echo "  -> Claude Desktop: ${CLAUDE_DESKTOP_CONFIG}"
mkdir -p "$(dirname "$CLAUDE_DESKTOP_CONFIG")"
if [[ -f "$CLAUDE_DESKTOP_CONFIG" ]]; then
  jq -s '.[0] * .[1]' "$CLAUDE_DESKTOP_CONFIG" "$SOURCE_FILE" > "${CLAUDE_DESKTOP_CONFIG}.tmp"
  mv "${CLAUDE_DESKTOP_CONFIG}.tmp" "$CLAUDE_DESKTOP_CONFIG"
else
  cp "$SOURCE_FILE" "$CLAUDE_DESKTOP_CONFIG"
fi

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

# 3. Sync to Codex CLI (if available)
if command -v codex &>/dev/null; then
  echo "  -> Codex CLI"

  jq -r '.mcpServers | keys[]' "$SOURCE_FILE" | while read -r name; do
    server_json=$(jq -c ".mcpServers[\"$name\"]" "$SOURCE_FILE")
    server_command=$(echo "$server_json" | jq -r '.command // empty')
    server_url=$(echo "$server_json" | jq -r '.url // empty')
    server_args=("${(@f)$(echo "$server_json" | jq -r '.args[]?')}")
    server_env=("${(@f)$(echo "$server_json" | jq -r '(.env // {}) | to_entries[]? | "\(.key)=\(.value)"')}")
    bearer_token_env_var=$(echo "$server_json" | jq -r '.bearer_token_env_var // empty')

    if codex mcp get "$name" &>/dev/null; then
      echo "     ~ $name (updating)"
      codex mcp remove "$name" 2>/dev/null || true
    else
      echo "     + $name"
    fi

    if [[ -n "$server_url" ]]; then
      if [[ -n "$bearer_token_env_var" ]]; then
        codex mcp add "$name" --url "$server_url" --bearer-token-env-var "$bearer_token_env_var" 2>/dev/null || true
      else
        codex mcp add "$name" --url "$server_url" 2>/dev/null || true
      fi
      continue
    fi

    if [[ -z "$server_command" ]]; then
      echo "     ! $name (missing command/url, skipping)"
      continue
    fi

    codex_cmd=(codex mcp add "$name")
    if (( ${#server_env[@]} > 0 )); then
      for env_var in "${server_env[@]}"; do
        codex_cmd+=(--env "$env_var")
      done
    fi

    codex_cmd+=(-- "$server_command")
    if (( ${#server_args[@]} > 0 )); then
      codex_cmd+=("${server_args[@]}")
    fi

    "${codex_cmd[@]}" 2>/dev/null || true
  done
else
  echo "  -> Codex CLI (not installed, skipping)"
fi

echo ""
echo "Done!"
