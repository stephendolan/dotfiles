#!/usr/bin/env bash
set -euo pipefail

if ! command -v mise &>/dev/null; then
    echo "Error: mise not found. Install via Homebrew first."
    exit 1
fi

echo "Installing tools via mise..."
mise install --yes

echo "mise setup complete!"
