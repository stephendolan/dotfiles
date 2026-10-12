#!/usr/bin/env bash
set -euo pipefail

if [[ -x "$HOME/.local/bin/mise" ]]; then
  mise_bin="$HOME/.local/bin/mise"
else
  mise_bin="$(command -v mise)"
fi

"$mise_bin" __tool-update --help >/dev/null
"$mise_bin" config set --global bootstrap.services.mise-tool-update.builtin tool-update
"$mise_bin" --cd "$HOME" bootstrap services apply --yes
"$mise_bin" --cd "$HOME" bootstrap services status --missing
