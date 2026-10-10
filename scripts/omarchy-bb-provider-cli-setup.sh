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

remove_omarchy_mise_wrapper pi

# Keep old installs available to running processes while removing them from
# mise's active tool set. New processes resolve BB's npm-managed binary.
mise unuse -g --no-prune pi >/dev/null 2>&1 || true

# mise's `node@latest` has a version-specific global npm prefix. Reinstall Pi
# after a Node upgrade so BB never points at a retired prefix. Codex is a mise
# tool (see omarchy-mise-tools-setup.sh) and needs no reinstall.
mise exec node@latest -- npm install --global --no-fund --no-audit \
  @earendil-works/pi-coding-agent@latest >/dev/null
