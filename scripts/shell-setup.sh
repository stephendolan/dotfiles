#!/bin/bash
set -euo pipefail

echo "🐚 Setting up shell..."

# Get the path to zsh from Homebrew
if [[ $(uname) == "Darwin" ]]; then
  ZSH_PATH="/bin/zsh"
else
  ZSH_PATH="/home/linuxbrew/.linuxbrew/bin/zsh"
fi

# Check if zsh is installed
if ! command -v zsh &>/dev/null; then
  echo "❌ Zsh not found. Please ensure Homebrew packages are installed first."
  exit 1
fi

# Add Homebrew's zsh to /etc/shells if not already there
if ! grep -q "$ZSH_PATH" /etc/shells 2>/dev/null; then
  if sudo -n true 2>/dev/null; then
    echo "Adding $ZSH_PATH to /etc/shells..."
    echo "$ZSH_PATH" | sudo tee -a /etc/shells >/dev/null
  else
    echo "Skipping /etc/shells update (no sudo access)"
  fi
fi

# Check if current shell is already zsh
CURRENT_SHELL=$(echo $SHELL)
if [[ "$CURRENT_SHELL" != "$ZSH_PATH" ]]; then
  echo "Changing default shell to $ZSH_PATH..."

  # First try regular chsh
  if chsh -s "$ZSH_PATH" 2>/dev/null; then
    echo "✅ Default shell changed to Zsh. Please log out and back in for changes to take effect."
  elif sudo -n true 2>/dev/null; then
    echo "Regular chsh failed. Trying with sudo..."
    if sudo chsh -s "$ZSH_PATH" "$USER"; then
      echo "✅ Default shell changed to Zsh using sudo."
    else
      echo "⚠️  Could not change default shell. Run: sudo usermod -s $ZSH_PATH $USER"
    fi
  else
    echo "⚠️  Skipping shell change (no sudo access). Run: sudo usermod -s $ZSH_PATH $USER"
  fi
else
  echo "✅ Zsh is already your default shell."
fi

echo "✅ Shell setup complete!"

