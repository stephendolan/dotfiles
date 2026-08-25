# Omarchy user configuration

This directory contains public, declarative user overrides from `~/.config`.
Omarchy's package-owned defaults under `/usr/share/omarchy` are intentionally
not copied or modified.

Tracked:

- Hyprland bindings, input, and display-scale overrides
- Omarchy shell layout and idle preferences
- The preferred default AI agent
- User-owned Omarchy shell plugins
- A launch-only Codex wrapper that never blocks app-server startup on updates
- A daily user timer for all mise-managed tools (the automated equivalent of
  Omarchy's `mup` alias)
- A global mise declaration for Node, Claude, Codex, and GitHub CLI so their
  shims work consistently in agent and BB workspaces

Not tracked:

- Secrets, tokens, credentials, account data, or runtime state
- Machine history, logs, caches, generated backups, or plugin data
- Package-owned defaults, stock themes, or sample hooks
- Hardware identifiers or network configuration

On Omarchy, `./install` automatically selects `install.omarchy.conf.yaml` and
links only these user overrides plus the repository's AI configuration. The
full shell, terminal, editor, package, and development-tool dotfiles profile is
not applied.

The mise timer deliberately uses `--no-prune`, allowing already-running agents
to keep their current binaries while new processes pick up the latest version.
Full system package updates remain under Omarchy's native `omarchy update`
workflow because it owns snapshots, migrations, privileged package changes,
and restart prompts.
