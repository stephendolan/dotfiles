#!/bin/bash
set -euo pipefail

echo "🤖 Setting up DotBot..."

# Initialize and update the dotbot submodule
echo "Updating DotBot submodule..."
git submodule update --init --recursive dotbot

echo "✅ DotBot setup complete!"