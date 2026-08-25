# Dotfiles

Personal dotfiles managed with [DotBot](https://github.com/anishathalye/dotbot).

## Install

```bash
git clone https://github.com/stephendolan/dotfiles.git ~/.dotfiles
cd ~/.dotfiles
./install
```

On Omarchy, `./install` automatically uses the narrow
`install.omarchy.conf.yaml` profile. It installs the shared AI configuration
and the public user overrides in `omarchy/`, while leaving Omarchy's shell,
terminal, editor, packages, themes, and package-owned defaults alone. Set
`DOTFILES_INSTALL_CONFIG=install.conf.yaml` only when the full dotfiles profile
is explicitly wanted.

## Structure

- `ai/` - Claude Code configuration (agents, commands, skills)
- `dev/` - Development tools (git, nvim, psql, rails)
- `packages/` - Package managers (mise, homebrew)
- `omarchy/` - Public Omarchy user overrides and shell plugins
- `shell/` - Shell environment (zsh, starship, atuin, ripgrep)
- `scripts/` - Installation scripts

The Omarchy profile also enables a daily user timer for every mise-managed
tool. This is the unattended equivalent of Omarchy's `mup` alias; full system
updates continue to run through `omarchy update`.
