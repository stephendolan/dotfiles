#!/usr/bin/env bash
set -euo pipefail

# Rename tmux session based on first user prompt.
# Bails immediately if not in tmux or already renamed.

[ -z "${TMUX:-}" ] && exit 0
[[ "$(tmux display-message -p '#S')" =~ ^[0-9]+$ ]] || exit 0

name=$(jq -r '.prompt' | tr -cs 'a-zA-Z0-9 ' ' ' | awk '{for(i=1;i<=3&&i<=NF;i++) printf "%s-",$i}' | sed 's/-$//' | tr '[:upper:]' '[:lower:]' | cut -c1-30)

[ -n "$name" ] && tmux rename-session "$name"
exit 0
