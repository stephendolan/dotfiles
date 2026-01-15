#!/bin/bash
# Claude Code pre-commit hook
# Runs Biome to validate files before committing

set -e

if command -v biome &> /dev/null; then
  biome ci .
elif command -v npx &> /dev/null; then
  npx @biomejs/biome ci .
else
  echo "Warning: Biome not found, skipping lint check"
  exit 0
fi
