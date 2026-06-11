#!/usr/bin/env bash
set -euo pipefail

# Sync Tuple triggers between this repo (canonical, public) and the live
# trigger directories. The Tuple trigger runner does not follow symlinks, so
# the live dirs must hold real files; this script keeps them in step.
#
#   tuple-triggers-sync.sh             repo -> live (default; used by ./install)
#   tuple-triggers-sync.sh --capture   live -> repo (pull in edits made live)
#
# Runtime artifacts (logs, locks, .DS_Store) never sync in either direction.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXCLUDES=(--exclude 'triggers.log*' --exclude '.vault-lock' --exclude '.DS_Store')

sync_pair() {
    local repo_side="$1" live_side="$2"
    [ -d "${repo_side}" ] || return 0
    mkdir -p "${live_side}"
    if [ "${MODE}" = "capture" ]; then
        rsync -a --delete "${EXCLUDES[@]}" "${live_side}/" "${repo_side}/"
        echo "captured ${live_side} -> ${repo_side}"
    else
        rsync -a "${EXCLUDES[@]}" "${repo_side}/" "${live_side}/"
        echo "deployed ${repo_side} -> ${live_side}"
    fi
}

MODE="deploy"
[ "${1:-}" = "--capture" ] && MODE="capture"

sync_pair "${REPO_DIR}/tuple/triggers" "${HOME}/.tuple/triggers"
sync_pair "${REPO_DIR}/tuple/triggers-staging" "${HOME}/.tuplestaging/triggers"
