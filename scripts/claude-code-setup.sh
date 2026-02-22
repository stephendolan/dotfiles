#!/usr/bin/env bash
set -euo pipefail

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
    "EveryInc/compound-engineering-plugin"
    "stephendolan/dotfiles"
    "stephendolan/private-family-skills"
)

PLUGINS=(
    "compound-engineering@every-marketplace"
    "personal@dotfiles"
    "family@private-family-skills"
)

for marketplace in "${MARKETPLACES[@]}"; do
    if ! claude plugin marketplace list 2>/dev/null | grep -q "$marketplace"; then
        echo "Adding marketplace: $marketplace"
        claude plugin marketplace add "$marketplace" 2>/dev/null || true
    fi
done

PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"
for plugin in "${PLUGINS[@]}"; do
    if ! grep -q "\"$plugin\"" "$PLUGINS_FILE" 2>/dev/null; then
        echo "Installing plugin: $plugin"
        claude plugin install "$plugin" 2>/dev/null || true
    fi
done

echo "Claude Code setup complete!"
