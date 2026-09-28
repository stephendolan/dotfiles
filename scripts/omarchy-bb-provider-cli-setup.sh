#!/usr/bin/env bash
set -euo pipefail

remove_omarchy_mise_wrapper() {
  local command=$1
  local wrapper="$HOME/.local/bin/$command"
  local legacy_target="$HOME/.dotfiles/omarchy/bin/$command"

  if [[ -L $wrapper && $(readlink "$wrapper") == "$legacy_target" ]]; then
    unlink "$wrapper"
  elif [[ -f $wrapper ]] && grep -Eq "^mise use -g( --quiet)? \"$command\"" "$wrapper"; then
    unlink "$wrapper"
  fi
}

remove_omarchy_mise_wrapper codex
remove_omarchy_mise_wrapper pi

# Keep old installs available to running processes while removing them from
# mise's active tool set. New processes resolve BB's npm-managed binaries.
mise unuse -g --no-prune codex >/dev/null 2>&1 || true
mise unuse -g --no-prune pi >/dev/null 2>&1 || true

# mise's `node@latest` has a version-specific global npm prefix. Reinstall the
# provider CLIs after a Node upgrade so BB never points at a retired prefix.
mise exec node@latest -- npm install --global --no-fund --no-audit \
  @openai/codex@latest \
  @earendil-works/pi-coding-agent@latest >/dev/null
