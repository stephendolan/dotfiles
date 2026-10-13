#!/usr/bin/env bash
set -euo pipefail

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl is unavailable; skipping Omarchy user timers"
  exit 0
fi

systemctl --user daemon-reload
systemctl --user enable --now mise-upgrade-all.timer
systemctl --user enable --now ensure-balanced-power-profile.service
systemctl --user enable --now ensure-balanced-power-profile.path
systemctl --user enable --now browseros-neo.service
systemctl --user enable --now browseros-neo-update.timer
systemctl --user enable --now browseros-neo-tailnet.service
