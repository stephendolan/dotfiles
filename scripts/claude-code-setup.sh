#!/usr/bin/env bash
set -euo pipefail

export MISE_QUIET=1

echo "Setting up Claude Code..."

if command -v claude &> /dev/null; then
    echo "Claude Code is already installed"
    echo "Current version: $(claude --version 2>/dev/null || echo 'unknown')"
else
    echo "Installing Claude Code using official install script..."
    curl -fsSL https://claude.ai/install.sh | bash
fi

# Install plugins from marketplaces
MARKETPLACES=(
    "dotfiles|stephendolan/dotfiles"
    "private-skills|stephendolan/private-family-skills"
)

PLUGINS=(
    "stephendolan@dotfiles"
    "personal@private-skills"
)

for marketplace_entry in "${MARKETPLACES[@]}"; do
    marketplace_name="${marketplace_entry%%|*}"
    marketplace_source="${marketplace_entry#*|}"
    if ! claude plugin marketplace list --json | jq -e --arg name "$marketplace_name" \
        'any(.[]; .name == $name)' >/dev/null; then
        echo "Adding marketplace: $marketplace_source"
        claude plugin marketplace add "$marketplace_source"
    else
        echo "Refreshing marketplace: $marketplace_name"
        claude plugin marketplace update "$marketplace_name"
    fi
done

for plugin in "${PLUGINS[@]}"; do
    if ! claude plugin list --json | jq -e --arg id "$plugin" \
        'any(.[]; .id == $id)' >/dev/null; then
        echo "Installing plugin: $plugin"
        claude plugin install "$plugin"
        claude plugin list --json | jq -e --arg id "$plugin" \
            'any(.[]; .id == $id)' >/dev/null || {
            echo "Plugin installation did not register: $plugin" >&2
            exit 1
        }
    fi
done

# Fold tracked settings into the live (Claude Code-owned) settings file
python3 "$(dirname "$0")/../ai/scripts/merge-claude-settings.py"

echo "Claude Code setup complete!"
