#!/usr/bin/env bash
set -euo pipefail

if ! command -v mise >/dev/null 2>&1; then
  echo "mise is unavailable; skipping global AI tool setup"
  exit 0
fi

# Keep Node globally active so Node-based CLIs such as bb work through mise's
# normal shims in any workspace. Declaring the managed AI CLIs together also
# ensures the daily upgrade timer sees all of them. Codex, pnpm, and yarn are
# mise tools rather than npm -g or corepack installs so a Node upgrade cannot
# strand them in a retired Node prefix.
MISE_MINIMUM_RELEASE_AGE=0 mise use -g \
  node@latest \
  claude@latest \
  codex@latest \
  gh@latest \
  pnpm@latest \
  yarn@latest
