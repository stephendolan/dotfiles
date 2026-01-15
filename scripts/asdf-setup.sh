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
install_plugin() {
    local plugin="$1"
    local url="$2"
    if ! asdf plugin list | grep -q "^${plugin}$"; then
        echo "Installing ASDF plugin: ${plugin}"
        asdf plugin add "${plugin}" "${url}"
    else
        echo "ASDF plugin already installed: ${plugin}"
    fi
}

install_plugin nodejs "https://github.com/asdf-vm/asdf-nodejs.git"
install_plugin python "https://github.com/danhper/asdf-python.git"
install_plugin ruby "https://github.com/asdf-vm/asdf-ruby.git"
install_plugin golang "https://github.com/kennyp/asdf-golang.git"
install_plugin rust "https://github.com/code-lever/asdf-rust.git"
install_plugin crystal "https://github.com/asdf-community/asdf-crystal.git"

# Install versions from .tool-versions if they exist
if [[ -f ~/.tool-versions ]]; then
    echo "Installing versions from .tool-versions..."
    asdf install
else
    echo "No .tool-versions file found, skipping version installation"
fi

echo "ASDF setup complete!"