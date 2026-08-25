#!/usr/bin/env bash
set -euo pipefail

export MISE_QUIET=1

MARKETPLACE="dotfiles"
MARKETPLACE_SOURCE="stephendolan/dotfiles"
PLUGIN="stephendolan@dotfiles"

if ! command -v codex >/dev/null 2>&1; then
    echo "Codex CLI is not installed; skipping plugin setup."
    exit 0
fi

if ! codex plugin marketplace list --json | jq -e --arg name "$MARKETPLACE" \
    '.marketplaces[] | select(.name == $name)' >/dev/null; then
    echo "Adding Codex marketplace: $MARKETPLACE_SOURCE"
    codex plugin marketplace add "$MARKETPLACE_SOURCE"
else
    echo "Refreshing Codex marketplace: $MARKETPLACE"
    codex plugin marketplace upgrade "$MARKETPLACE"
fi

if ! codex plugin list --marketplace "$MARKETPLACE" --json | jq -e --arg id "$PLUGIN" \
    '.installed[] | select(.pluginId == $id)' >/dev/null; then
    echo "Installing Codex plugin: $PLUGIN"
    codex plugin add "$PLUGIN"
fi

echo "Codex plugin setup complete!"
