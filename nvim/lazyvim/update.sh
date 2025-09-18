#!/bin/bash

# Update LazyVim plugins and commit changes if any

set -e

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> /tmp/lazyvim-update.log
}

log "Starting LazyVim update"

# Update plugins headlessly
nvim --headless "+Lazy! sync" +qa 2>&1 | tee -a /tmp/lazyvim-update.log

# Commit changes if any plugin files were updated
cd "$HOME/.dotfiles" || exit 1

if ! git diff --quiet nvim/lazy-lock.json nvim/lazyvim.json 2>/dev/null; then
    log "Plugin updates detected, committing"
    git add nvim/lazy-lock.json nvim/lazyvim.json
    git commit -m "chore(nvim): auto-update LazyVim plugins" -q
    log "Changes committed"
else
    log "No plugin updates"
fi

log "Update complete"