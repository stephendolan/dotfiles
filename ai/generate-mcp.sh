#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:a:h}"
SOURCE_FILE="${SCRIPT_DIR}/mcp.json"
DOTFILES_DIR="${SCRIPT_DIR:h}"

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
jq '{globalShortcut: ""} + .' "$SOURCE_FILE" > "$CLAUDE_DESKTOP_CONFIG"

# 2. Generate OpenCode config (update mcp section only)
OPENCODE_CONFIG="${SCRIPT_DIR}/opencode/config.json"
echo "  -> OpenCode: ${OPENCODE_CONFIG}"

# Transform mcpServers to opencode format
# - Remote servers (using mcp-remote): extract URL, convert to type: "remote"
# - Local servers: convert to type: "local" with command array
# - Env vars: ${VAR} -> {env:VAR}
opencode_mcp=$(jq '
  .mcpServers | to_entries | map(
    .key as $name |
    .value as $server |
    
    # Check if this is a remote server (uses mcp-remote)
    if ($server.args | index("mcp-remote")) then
      # Extract URL (first arg after mcp-remote)
      ($server.args | to_entries | map(select(.value == "mcp-remote")) | .[0].key + 1) as $url_idx |
      $server.args[$url_idx] as $url |
      
      # Check for --header Authorization
      (if ($server.args | index("--header")) then
        ($server.args | to_entries | map(select(.value == "--header")) | .[0].key + 1) as $header_idx |
        $server.args[$header_idx] |
        if startswith("Authorization:") then
          # Strip "Authorization: " prefix and convert ${VAR} to {env:VAR}
          ltrimstr("Authorization: ") | gsub("\\$\\{(?<v>[^}]+)\\}"; "{env:\(.v)}")
        else
          null
        end
      else
        null
      end) as $auth |
      
      {
        key: $name,
        value: (
          {type: "remote", url: $url} +
          if $auth then {headers: {Authorization: $auth}} else {} end
        )
      }
    else
      # Local server - convert command + args to command array
      # Also convert env vars
      {
        key: $name,
        value: (
          {
            type: "local",
            command: ([$server.command] + $server.args)
          } +
          if $server.env then
            {
              environment: ($server.env | to_entries | map({
                key: .key,
                value: (.value | gsub("\\$\\{(?<v>[^}]+)\\}"; "{env:\(.v)}") | gsub("\\$(?<v>[A-Z_]+)"; "{env:\(.v)}"))
              }) | from_entries)
            }
          else {} end
        )
      }
    end
  ) | from_entries
' "$SOURCE_FILE")

# Read existing opencode config and update mcp section
if [[ -f "$OPENCODE_CONFIG" ]]; then
  jq --argjson mcp "$opencode_mcp" '.mcp = $mcp' "$OPENCODE_CONFIG" > "${OPENCODE_CONFIG}.tmp"
  mv "${OPENCODE_CONFIG}.tmp" "$OPENCODE_CONFIG"
else
  echo "  Warning: OpenCode config not found at ${OPENCODE_CONFIG}"
fi

# 3. Sync to Claude Code CLI (if available)
if command -v claude &>/dev/null; then
  echo "  -> Claude Code CLI"
  
  jq -r '.mcpServers | keys[]' "$SOURCE_FILE" | while read -r name; do
    # Check if server already exists
    if claude mcp get "$name" &>/dev/null; then
      echo "     $name (exists, skipping)"
      continue
    fi
    
    # Get server config as JSON
    server_json=$(jq -c ".mcpServers[\"$name\"]" "$SOURCE_FILE")
    
    echo "     + $name"
    claude mcp add-json --scope user "$name" "$server_json" 2>/dev/null || true
  done
else
  echo "  -> Claude Code CLI (not installed, skipping)"
fi

echo ""
echo "Done!"
