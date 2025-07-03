#!/usr/bin/env bash
set -euo pipefail

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGES_FILE="${BASEDIR}/apt/packages.txt"

if [[ ! "$OSTYPE" == "linux-gnu"* ]] || ! command -v apt-get &> /dev/null; then
    echo "This script is only for Debian/Ubuntu systems with apt"
    exit 0
fi

echo "Installing apt packages from packages.txt..."

# Update package list
sudo apt-get update

# Read packages from file, skip comments and empty lines
while IFS= read -r package || [ -n "$package" ]; do
    # Skip comments and empty lines
    [[ -z "$package" || "$package" =~ ^[[:space:]]*# ]] && continue
    
    # Remove leading/trailing whitespace
    package=$(echo "$package" | xargs)
    
    if dpkg -l "$package" &> /dev/null; then
        echo "✓ $package (already installed)"
    else
        echo "Installing $package..."
        sudo apt-get install -y "$package"
    fi
done < "$PACKAGES_FILE"

echo "All apt packages installed!"