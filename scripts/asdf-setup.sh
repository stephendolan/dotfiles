#!/usr/bin/env bash
set -euo pipefail

# Source ASDF (brew-setup.sh runs before this script)
ASDF_SCRIPT="$(brew --prefix asdf 2>/dev/null)/libexec/asdf.sh"
if [[ -f "$ASDF_SCRIPT" ]]; then
    # shellcheck source=/dev/null
    source "$ASDF_SCRIPT"
else
    echo "ERROR: ASDF not found. Ensure brew-setup.sh completed successfully."
    exit 1
fi

echo "Setting up ASDF with common plugins..."

# Install common ASDF plugins with full URLs (since short-name repo is disabled)
declare -A PLUGINS=(
    ["nodejs"]="https://github.com/asdf-vm/asdf-nodejs.git"
    ["python"]="https://github.com/danhper/asdf-python.git"
    ["ruby"]="https://github.com/asdf-vm/asdf-ruby.git"
    ["golang"]="https://github.com/kennyp/asdf-golang.git"
    ["rust"]="https://github.com/code-lever/asdf-rust.git"
    ["crystal"]="https://github.com/asdf-community/asdf-crystal.git"
)

for plugin in "${!PLUGINS[@]}"; do
    if ! asdf plugin list | grep -q "^${plugin}$"; then
        echo "Installing ASDF plugin: ${plugin}"
        asdf plugin add "${plugin}" "${PLUGINS[$plugin]}"
    else
        echo "ASDF plugin already installed: ${plugin}"
    fi
done

# Install versions from .tool-versions if they exist
if [[ -f ~/.tool-versions ]]; then
    echo "Installing versions from .tool-versions..."
    asdf install
else
    echo "No .tool-versions file found, skipping version installation"
fi

echo "ASDF setup complete!"