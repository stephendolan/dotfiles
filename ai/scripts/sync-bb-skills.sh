#!/usr/bin/env bash
# bb script automation entry point: sync ai/skillset.json into bb user skills.
# Runs on the bb server host from a clean checkout of dotfiles main, so manifest
# and script changes apply on the next run without updating the automation.
set -euo pipefail

cache="${XDG_CACHE_HOME:-$HOME/.cache}/bb-skill-sync"
checkout="$cache/dotfiles"

if [ -d "$checkout/.git" ]; then
  git -C "$checkout" fetch --quiet --depth 1 origin main
  git -C "$checkout" reset --quiet --hard FETCH_HEAD
else
  mkdir -p "$cache"
  git clone --quiet --depth 1 --branch main https://github.com/stephendolan/dotfiles.git "$checkout"
fi

exec python3 "$checkout/ai/scripts/sync-bb-skills.py" --manifest "$checkout/ai/skillset.json" --cache "$cache"
