#!/usr/bin/env bash
set -euo pipefail

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl is unavailable; skipping Omarchy user timers"
  exit 0
fi

systemctl --user daemon-reload
systemctl --user enable --now mise-upgrade-all.timer
