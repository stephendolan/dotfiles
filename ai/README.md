# AI Agent Configuration

Stephen's shared Claude Code, Codex, and Cursor configuration: a small set of
personal skills, runtime-neutral agent roles, hooks, and MCP server definitions.
Each client has its native manifest: `.claude-plugin/plugin.json`,
`.codex-plugin/plugin.json`, and `.cursor-plugin/plugin.json`. The root
`plugin.json` preserves Cursor marketplace discovery compatibility. They package the
portable skills and, where supported, canonical agents; runtime-specific MCP
setup remains managed by the adapters below.

`plugins/stephendolan` is a compatibility symlink for marketplace loaders that
require plugin roots beneath `plugins/`; `ai/` remains the canonical source.
For local setup, `skillset.json` declares non-plugin skills for installation
through skills.sh, plus any declared token-gated upstream installer. The
personal `stephendolan` bundle remains installed through its marketplace plugin;
it is deliberately excluded from skills.sh so Codex sees only its namespaced
plugin skills rather than duplicate copies in shared paths such as
`~/.agents/skills`. A missing optional token prints a concise skip and does not
interrupt the remaining setup.

## Install

Plugin users access the personal skills under their runtime's plugin namespace.
Local setup installs only the non-plugin skills declared in `skillset.json`
through skills.sh. Codex uses generated native roles; Cursor links Comment
Sicko's canonical role directly.

- Claude Code: `scripts/claude-code-setup.sh` adds the marketplace and installs
  `stephendolan@dotfiles`.
- Codex: `scripts/codex-plugin-setup.sh` does the same and is run by `./install`.
- Cursor: install `stephendolan` at **user scope** from Customize → Plugins.
  This is the supported account-synced route for Cursor and Cloud Agents; Cursor
  does not provide a non-interactive plugin-install command. The repository's
  `plugin.json` and `.cursor-plugin/plugin.json` supply the package metadata.

Do not install `stephendolan/dotfiles` through skills.sh or link `ai/skills`
into an agent skills directory: either route creates an unnamespaced second copy.
Amp loads the same skills from Stephen's personal skills repository, including
in orbs. Pushing this repository's `main` branch publishes the committed
`ai/skills` subtree to Amp.

For local Claude development:

```bash
claude --plugin-dir ./ai
```

Reload Claude plugins after edits with `/reload-plugins`. Regenerate Codex
roles after editing `agents/*.md`:

```bash
./ai/scripts/generate-codex-agents.py
```

To publish the current commit to Amp without pushing the dotfiles repository:

```bash
./ai/scripts/sync-amp-skills.sh
```

## Layout

```text
ai/
├── .claude-plugin/plugin.json
├── .codex-plugin/plugin.json
├── .cursor-plugin/plugin.json
├── AGENT-RUNTIME.md        # Cross-runtime role interpretation
├── agents/                 # Canonical runtime-neutral roles
├── skills/                 # Personal workflows and domain knowledge
├── scripts/                # Runtime adapters
├── hooks/                  # Event handlers
├── AGENTS.md               # Shared operating preferences
├── claude-settings.json
└── mcp.json
```

## Skills

Personal skills available across Stephen's agents:

| Skill | Purpose |
| --- | --- |
| `refine-implementation` | Context-routed correctness, structural, blast-radius, and comment refinement |
| `no-comments` | Comment Sicko cleanup and structural constraint encoding |
| `improve-codebase-architecture` | Deep-module architecture exploration |
| `mom-test` | Customer-discovery question and evidence review |
| `drama-triangle` | Communication and agency analysis |

`skillset.json` may omit `skills` to install every non-plugin source, or name
selected third-party skills to keep the shared set intentionally small. Do not
add the personal `stephendolan/dotfiles` bundle here: its marketplace plugin is
the canonical installation path, and the installer rejects it to prevent
unnamespaced duplicates.

Model-invoked skills route natural-language requests into local tools or data:

| Skill | Trigger |
| --- | --- |
| `writing` | Email, messages, Linear, support replies, and other human-facing prose |

Personal knowledge-base routing belongs to the private-skills package.

## Agents

Claude reads `agents/*.md` directly. Codex uses generated TOML roles under
`~/.codex/agents/stephendolan/`. Cursor reads Comment Sicko through
`~/.cursor/agents/comment-sicko.md`. Keep the markdown definitions canonical and
regenerate Codex runtime copies instead of maintaining parallel role bodies.

## MCP Servers

`mcp.json` defines personal server connections. Run `./generate-mcp.sh` to sync
managed entries to Claude and Codex while preserving client-specific servers.
