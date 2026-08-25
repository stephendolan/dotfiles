#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_SETTINGS="${SCRIPT_DIR}/../ai/claude-settings.json"
TARGET_DIR="${HOME}/.claude"
TARGET_SETTINGS="${TARGET_DIR}/settings.json"

command -v jq >/dev/null 2>&1 || { echo "jq is required to merge Claude settings" >&2; exit 1; }
jq -e 'type == "object"' "$SOURCE_SETTINGS" >/dev/null
mkdir -p "$TARGET_DIR"

if [[ ! -e "$TARGET_SETTINGS" ]]; then
    install -m 600 "$SOURCE_SETTINGS" "$TARGET_SETTINGS"
    exit 0
fi

jq -e 'type == "object"' "$TARGET_SETTINGS" >/dev/null
SETTINGS_TMP="$(mktemp "${TARGET_DIR}/settings.json.tmp.XXXXXX")"
trap 'rm -f "$SETTINGS_TMP"' EXIT

# Repository settings are defaults; existing machine-local values win. jq's
# object multiplication merges nested objects, so unrelated hook groups and
# marketplace entries are preserved.
jq -s '.[0] * .[1]' "$SOURCE_SETTINGS" "$TARGET_SETTINGS" > "$SETTINGS_TMP"
chmod --reference="$TARGET_SETTINGS" "$SETTINGS_TMP"
mv "$SETTINGS_TMP" "$TARGET_SETTINGS"
trap - EXIT
