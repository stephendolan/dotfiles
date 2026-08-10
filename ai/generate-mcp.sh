#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:a:h}"
SOURCE_FILE="${SCRIPT_DIR}/mcp.json"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Error: $SOURCE_FILE not found"
  exit 1
fi

if ! jq -e '.mcpServers | type == "object"' "$SOURCE_FILE" >/dev/null; then
  echo "Error: $SOURCE_FILE must contain an mcpServers object"
  exit 1
fi

BACKUP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/generate-mcp.XXXXXX")
CLAUDE_CONFIG_FILE="${HOME}/.claude.json"
CODEX_CONFIG_FILE="${CODEX_HOME:-${HOME}/.codex}/config.toml"
DESKTOP_CONFIG_FILE="${HOME}/Library/Application Support/Claude/claude_desktop_config.json"

backup_config() {
  local source_file="$1"
  local backup_name="$2"

  if [[ -f "$source_file" ]]; then
    cp -p "$source_file" "${BACKUP_DIR}/${backup_name}"
  else
    touch "${BACKUP_DIR}/${backup_name}.absent"
  fi
}

restore_config() {
  local destination_file="$1"
  local backup_name="$2"

  if [[ -f "${BACKUP_DIR}/${backup_name}.absent" ]]; then
    rm -f "$destination_file"
  else
    cp -p "${BACKUP_DIR}/${backup_name}" "$destination_file"
  fi
}

finish() {
  local exit_status=$?
  trap - EXIT

  if (( exit_status != 0 )); then
    echo "MCP sync failed; restoring client configuration" >&2
    restore_config "$CLAUDE_CONFIG_FILE" claude.json
    restore_config "$CODEX_CONFIG_FILE" codex-config.toml
    restore_config "$DESKTOP_CONFIG_FILE" claude-desktop-config.json
  fi

  rm -rf "$BACKUP_DIR"
  exit "$exit_status"
}

backup_config "$CLAUDE_CONFIG_FILE" claude.json
backup_config "$CODEX_CONFIG_FILE" codex-config.toml
backup_config "$DESKTOP_CONFIG_FILE" claude-desktop-config.json
trap finish EXIT

echo "Generating MCP configs from mcp.json..."

# Sync to Claude Code CLI (if available)
if command -v claude &>/dev/null; then
  echo "  -> Claude Code CLI"

  # Upsert managed servers without deleting client-specific configuration.
  jq -r '.mcpServers | keys[]' "$SOURCE_FILE" | while read -r name; do
    if claude mcp get "$name" &>/dev/null; then
      echo "     ~ $name (updating)"
      claude mcp remove "$name" -s user
    else
      echo "     + $name"
    fi

    server_json=$(jq -c ".mcpServers[\"$name\"]" "$SOURCE_FILE")
    claude mcp add-json --scope user "$name" "$server_json"
  done
else
  echo "  -> Claude Code CLI (not installed, skipping)"
fi

# Sync to Codex CLI (if available)
if command -v codex &>/dev/null; then
  echo "  -> Codex CLI"

  jq -r '.mcpServers | keys[]' "$SOURCE_FILE" | while read -r name; do
    server_json=$(jq -c ".mcpServers[\"$name\"]" "$SOURCE_FILE")
    server_command=$(echo "$server_json" | jq -r '.command // empty')
    server_url=$(echo "$server_json" | jq -r '.url // empty')
    server_args=("${(@f)$(echo "$server_json" | jq -r '.args[]?')}")
    server_env=("${(@f)$(echo "$server_json" | jq -r '(.env // {}) | to_entries[]? | select(.value != ("${" + .key + "}")) | "\(.key)=\(.value)"')}")
    bearer_token_env_var=$(echo "$server_json" | jq -r '.bearer_token_env_var // empty')

    if codex mcp get "$name" &>/dev/null; then
      echo "     ~ $name (updating)"
      codex mcp remove "$name"
    else
      echo "     + $name"
    fi

    if [[ -n "$server_url" ]]; then
      if [[ -n "$bearer_token_env_var" ]]; then
        codex mcp add "$name" --url "$server_url" --bearer-token-env-var "$bearer_token_env_var"
      else
        codex mcp add "$name" --url "$server_url"
      fi
      continue
    fi

    if [[ -z "$server_command" ]]; then
      echo "     ! $name (missing command/url, skipping)"
      continue
    fi

    codex_cmd=(codex mcp add "$name")
    if [[ -n "${server_env[1]-}" ]]; then
      for env_var in "${server_env[@]}"; do
        codex_cmd+=(--env "$env_var")
      done
    fi

    codex_cmd+=(-- "$server_command")
    if [[ -n "${server_args[1]-}" ]]; then
      codex_cmd+=("${server_args[@]}")
    fi

    "${codex_cmd[@]}"
  done
else
  echo "  -> Codex CLI (not installed, skipping)"
fi

# Sync to Claude Desktop (if present)
if [[ -f "$DESKTOP_CONFIG_FILE" ]]; then
  if pgrep -x Claude &>/dev/null; then
    echo "  -> Claude Desktop (running, skipping)"
    echo "     ! Quit Claude Desktop first; it rewrites this file on exit."
  else
    echo "  -> Claude Desktop"

    jq -r '.mcpServers | keys[]' "$SOURCE_FILE" | while read -r name; do
      if jq -e --arg name "$name" '.mcpServers | has($name)' "$DESKTOP_CONFIG_FILE" &>/dev/null; then
        echo "     ~ $name (updating)"
      else
        echo "     + $name"
      fi
    done

    desktop_tmp="${BACKUP_DIR}/desktop.json"
    jq --argjson servers "$(jq -c '.mcpServers' "$SOURCE_FILE")" \
      '.mcpServers = ((.mcpServers // {}) + $servers)' \
      "$DESKTOP_CONFIG_FILE" >"$desktop_tmp"
    mv "$desktop_tmp" "$DESKTOP_CONFIG_FILE"
  fi
else
  echo "  -> Claude Desktop (not installed, skipping)"
fi

echo ""
echo "Done!"
