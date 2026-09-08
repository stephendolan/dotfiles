# AI Agent Configuration

Stephen's shared Claude Code, Codex, and Cursor configuration: a small set of
personal skills, runtime-neutral agent roles, hooks, and MCP server definitions.
Each client has its native manifest: `.claude-plugin/plugin.json`,
`.codex-plugin/plugin.json`, and `.cursor-plugin/plugin.json`. The plugin-root
`plugin.json` preserves Agent Plugins compatibility, while the repository-root
`.cursor-plugin/marketplace.json` exposes `ai/` to Cursor marketplace imports.
They package the portable skills and, where supported, canonical agents;
runtime-specific MCP setup remains managed by the adapters below.

`plugins/stephendolan` is a compatibility symlink for marketplace loaders that
require plugin roots beneath `plugins/`; `ai/` remains the canonical source.
`skillset.json` is the installation manifest. It declares standalone skills,
upstream installers such as Interface Craft, and marketplace plugins. The
personal `stephendolan` bundle is installed through its marketplace plugin so
Codex sees only its namespaced plugin skills rather than duplicate copies in
shared paths such as `~/.agents/skills`.

## Install

Run `./install`. Both macOS and Omarchy use `ai/scripts/install-skills.py` to
converge every supported runtime on `skillset.json`: standalone skills first,
then declared marketplaces and plugins. Codex uses generated native roles;
Cursor links Comment Sicko's canonical role directly.

- Claude Code and Codex: the shared installer adds or refreshes each applicable
  marketplace and installs its declared plugins. Claude's tracked marketplace
  configuration keeps auto-update enabled; Codex refreshes Git marketplaces at
  startup.
- Cursor: install `stephendolan` at **user scope** from Customize → Plugins.
  This is the supported account-synced route for Cursor and Cloud Agents; Cursor
  does not provide a non-interactive plugin-install command. The repository's
  `plugin.json` and `.cursor-plugin/plugin.json` supply the package metadata.

Do not install `stephendolan/dotfiles` through skills.sh or link `ai/skills`
into an agent skills directory: either route creates an unnamespaced second copy.
Amp loads the same skills from Stephen's generated Personal Plugin, including
in orbs.

For local Claude development:

```bash
claude --plugin-dir ./ai
```

Reload Claude plugins after edits with `/reload-plugins`. Regenerate Codex
roles after editing `agents/*.md`:

```bash
./ai/scripts/generate-codex-agents.py
```

To update the Amp Personal Plugin snapshot:

```bash
amp clone user-plugins ~/.cache/amp/repositories/ampcode.com-user-plugins
python3 ai/scripts/sync_amp_plugin.py ~/.cache/amp/repositories/ampcode.com-user-plugins
python3 ai/scripts/sync_amp_plugin.py --check ~/.cache/amp/repositories/ampcode.com-user-plugins
```

The generator discovers every directory under `ai/skills`, copies complete
packages, and writes the matching Amp registrations. Review and publish the
dotfiles and User Plugins repositories separately.

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
├── claude-settings.json    # Tracked settings seed, merged into ~/.claude/settings.json
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
| `design-with-taste` | Distinctive visual exploration, autonomous direction selection, and critique |

Each `skillset.json` source may omit `skills` to install every skill or name an
allowlist. Marketplace entries declare their source, plugins, and applicable
agents. Keep the personal `stephendolan/dotfiles` bundle in `marketplaces`, not
`sources`, so its skills remain namespaced.

Interface Craft uses its maintained installer, `curl -sL
interfacecraft.dev/api/install-skills | bash`, which installs its bundled
animation, tuning, and design-critique skills across supported agents.

Model-invoked skills route natural-language requests into local tools or data:

| Skill | Trigger |
| --- | --- |
| `writing` | Email, messages, Linear, support replies, and other human-facing prose |
| `writing-for-agents` | Skills, agent rules, and other documents consumed by agents |

`writing-for-agents` is vendored from Matt Pocock's MIT-licensed upstream
package because it must be available through the personal plugin on every
runtime. Its package records the pinned revision and license. Other third-party
and private sources in `skillset.json` remain independently installed rather
than copied into the personal bundle.

Personal knowledge-base routing belongs to the private-skills package.

## Agents

Claude reads `agents/*.md` directly. Codex uses generated TOML roles under
`~/.codex/agents/stephendolan/`. Cursor reads Comment Sicko through
`~/.cursor/agents/comment-sicko.md`. Keep the markdown definitions canonical and
regenerate Codex runtime copies instead of maintaining parallel role bodies.

## MCP Servers

`mcp.json` defines personal server connections. Run `./generate-mcp.sh` to sync
managed entries to Claude and Codex while preserving client-specific servers.
