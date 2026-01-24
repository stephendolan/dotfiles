# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a dotfiles repository that uses DotBot for automated installation and symlink management. It's primarily designed for macOS development environments and uses a clean, uniform tool-based organization structure.

## Repository Structure

The repository groups related tools into top-level categories:

```
ai/                 # AI tools configuration (Claude Code)
dev/                # Development tools
  git/              # Git configuration
  nvim/             # Neovim editor (LazyVim)
  psql/             # PostgreSQL client
  pspg/             # PostgreSQL pager
  rails/            # Rails generator defaults
packages/           # Package managers
  apt/              # Debian/Ubuntu packages
  asdf/             # Version manager
  homebrew/         # macOS/Linux packages
shell/              # Shell environment
  atuin/            # Shell history
  bat/              # Cat replacement
  ghostty/          # Terminal emulator
  ripgrep/          # Search tool
  starship/         # Prompt
  zsh/              # Shell-specific configs
scripts/            # Installation scripts
dotbot/             # DotBot submodule
```

Each tool directory contains a `config` or `config.toml` file plus any additional tool-specific files.

## Installation and Updates

```bash
# Install dotfiles (run from repository root)
./install

# Update git submodules (DotBot)
git submodule update --init --recursive
```

## Architecture and Key Concepts

### DotBot Configuration

The `install.conf.yaml` file controls all symlink creation and installation steps. It maps the repository structure to where tools expect their configs:

- `dev/git/config` → `~/.gitconfig`
- `shell/config` → `~/.zshrc`
- `shell/starship/config.toml` → `~/.config/starship.toml`
- etc.

When adding new tools:

1. Create config in the appropriate category (`dev/`, `shell/`, `packages/`)
2. Update `install.conf.yaml` to create the appropriate symlink
3. Run `./install` to apply changes

### Platform-Specific Configuration

- Common environment variables live in `shell/zshenv` (loaded by all shells)
- Platform-specific configuration in `shell/zsh/mac` (conditionally symlinked via DotBot)
- Conditional installation based on platform using DotBot's `if` conditions

### Modern Tool Stack

- **Shell**: Zsh with Starship prompt (no Oh My Zsh)
- **Editor**: Neovim with LazyVim
- **Terminal**: Ghostty
- **Package Manager**: Homebrew
- **Version Manager**: ASDF
- **History**: Atuin
- **Search**: Ripgrep with FZF integration

### Local Overrides

The system supports local configuration overrides through `.zshrc.local`, which is sourced at the end of `.zshrc` if it exists. This allows machine-specific customizations without modifying the repository.

### AI Tools Configuration

The `ai/` directory contains configuration for Claude Code and other AI editors:

- `ai/AGENTS.md` - Shared instructions (symlinked as `~/.claude/CLAUDE.md` and `~/.config/AGENTS.md`)
- `ai/agents/*.md` - Agent prompts that define specialized subagent behavior
- `ai/skills/*/SKILL.md` - Skill prompts that define workflows (slash commands) and domain expertise
- `ai/hooks/*.sh` - Hook scripts for Claude Code lifecycle events
- `ai/mcp.json` - MCP server definitions (source of truth)
- `ai/generate-mcp.sh` - Generates MCP configs for Claude Desktop and Claude Code CLI

These .md files are executable code, not documentation. They define agent behavior and should be treated like source code when reviewing or refining.

## Development Notes

### Homebrew Integration

The installation script manages Homebrew packages via `packages/homebrew/Brewfile.mac` (or `.linux`). Lock files and local settings are automatically ignored via global gitignore.

### Database Tools

- PostgreSQL configuration with pspg as the default pager
- Optimized psql configuration for better formatting and usability

### Code Quality

```bash
# Lint shell scripts
docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:stable **/*.sh

# Format YAML files
npx prettier --write "**/*.{yaml,yml}"
```

When making changes to this repository, ensure all modifications maintain the uniform tool directory structure and are tested on a fresh system to verify the installation process remains functional.
