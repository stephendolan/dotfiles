#!/usr/bin/env bash
set -euo pipefail

echo "Setting up ASDF with common plugins..."

# Install common ASDF plugins with full URLs (since short-name repo is disabled)
declare -A PLUGINS=(
    ["nodejs"]="https://github.com/asdf-vm/asdf-nodejs.git"
    ["python"]="https://github.com/danhper/asdf-python.git"
    ["ruby"]="https://github.com/asdf-vm/asdf-ruby.git"
    ["golang"]="https://github.com/kennyp/asdf-golang.git"
    ["rust"]="https://github.com/code-lever/asdf-rust.git"
)

for plugin in "${!PLUGINS[@]}"; do
    if ! asdf plugin list | grep -q "^${plugin}$"; then
        echo "Installing ASDF plugin: ${plugin}"
        asdf plugin add "${plugin}" "${PLUGINS[$plugin]}"
    else
        echo "ASDF plugin already installed: ${plugin}"
    fi
done

# Install Node.js plugin keyring (required for verification)
if asdf plugin list | grep -q "^nodejs$"; then
    echo "Setting up Node.js keyring..."
    bash -c '${ASDF_DATA_DIR:=$HOME/.asdf}/plugins/nodejs/bin/import-release-team-keyring' || true
fi

# Install versions from .tool-versions if they exist
if [[ -f ~/.tool-versions ]]; then
    echo "Installing versions from .tool-versions..."
    asdf install
else
    echo "No .tool-versions file found, skipping version installation"
fi

echo "ASDF setup complete!"