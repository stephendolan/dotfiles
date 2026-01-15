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

echo "Claude Code setup complete!"
