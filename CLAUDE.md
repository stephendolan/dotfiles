# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a dotfiles repository that uses DotBot for automated installation and symlink management. It's primarily designed for macOS development environments and uses a clean, uniform tool-based organization structure.

## Repository Structure

The repository follows a consistent pattern where each tool gets its own directory:

```
alacritty/          # Terminal emulator configuration
asdf/               # Version manager configuration
claude/             # Claude Code configuration (agents, commands, skills)
git/                # Git configuration
homebrew/           # Homebrew package management
mcfly/              # History tool configuration
nvim/               # Neovim editor configuration
psql/               # PostgreSQL client configuration
pspg/               # PostgreSQL pager configuration
rails/              # Rails generator configuration
ripgrep/            # Search tool configuration
shell/              # Shell and zsh configuration
starship/           # Prompt configuration
```

Each tool directory contains:

- `config` or `config.toml` - Main configuration file
- Additional tool-specific files as needed

## Installation and Updates

```bash
# Install dotfiles (run from repository root)
./install

# Update git submodules (DotBot)
git submodule update --init --recursive
```

## Architecture and Key Concepts

### DotBot Configuration

The `install.conf.yaml` file controls all symlink creation and installation steps. It maps the clean repository structure to the messy reality of where tools expect their configs:

- `git/config` → `~/.gitconfig`
- `shell/config` → `~/.zshrc`
- `starship/config.toml` → `~/.config/starship.toml`
- etc.

When adding new tools:

1. Create `newtool/config` directory and file
2. Update `install.conf.yaml` to create the appropriate symlink
3. Run `./install` to apply changes

### Platform-Specific Configuration

- Shell configurations support macOS and Linux variants in `shell/zsh/`
- Conditional installation based on platform using DotBot's `if` conditions

### Modern Tool Stack

- **Shell**: Zsh with Starship prompt (no Oh My Zsh)
- **Editor**: Neovim with LazyVim
- **Terminal**: Alacritty
- **Package Manager**: Homebrew
- **Version Manager**: ASDF
- **History**: McFly
- **Search**: Ripgrep with FZF integration

### Local Overrides

The system supports local configuration overrides through `.zshrc.local`, which is sourced at the end of `.zshrc` if it exists. This allows machine-specific customizations without modifying the repository.

### Claude Code Configuration

The `claude/` directory contains executable definitions for Claude Code:

- `claude/agents/*.md` - Agent prompts that define specialized behavior
- `claude/commands/*.md` - Slash command prompts that define workflows
- `claude/skills/*.md` - Skill prompts that define domain expertise

**Important**: These .md files are executable code, not documentation. They define agent behavior and should be treated like source code when reviewing or refining:

- Use `code-refiner` for logic, clarity, and removing over-engineering
- Use `documentation-refiner` for structure, formatting, and readability
- Both refiners should review these files as they serve dual purposes

## Development Notes

### Homebrew Integration

The installation script manages Homebrew packages via `homebrew/Brewfile`. Lock files and local settings are automatically ignored via global gitignore.

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
