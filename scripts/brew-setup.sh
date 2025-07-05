#!/bin/bash
set -euo pipefail

echo "🍺 Setting up Homebrew..."

# Install Homebrew if not present
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
    
    # Add Homebrew to PATH for this session
    if [[ $(uname) == "Darwin" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    fi
fi

echo "Updating Homebrew..."
brew update

echo "Installing packages from Brewfile..."
if [[ $(uname) == "Darwin" ]]; then
    BREWFILE="${HOME}/.dotfiles/homebrew/Brewfile.mac"
else
    BREWFILE="${HOME}/.dotfiles/homebrew/Brewfile.linux"
fi
brew bundle --file="$BREWFILE"

echo "Upgrading outdated packages..."
brew upgrade

echo "Cleaning up old versions..."
brew cleanup

echo "✅ Homebrew setup complete!"