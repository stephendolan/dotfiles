# AI Agent Configuration

Stephen's shared Claude Code and Codex configuration: a small set of personal
skills, runtime-neutral agent roles, hooks, and MCP server definitions.

## Install

```text
/plugin marketplace add stephendolan/dotfiles
/plugin install stephendolan@dotfiles
```

Claude exposes plugin skills under `/stephendolan:<name>`. Codex uses the
installed skills and generated native roles.

For local Claude development:

```bash
claude --plugin-dir ./ai
```

Reload Claude plugins after edits with `/reload-plugins`. Regenerate Codex
roles after editing `agents/*.md`:

```bash
./ai/scripts/generate-codex-agents.py
```

## Layout

```text
ai/
├── .claude-plugin/plugin.json
├── agents/                 # Canonical runtime-neutral roles
├── skills/                 # Personal workflows and domain knowledge
├── scripts/                # Runtime adapters
├── hooks/                  # Event handlers
├── AGENTS.md               # Shared operating preferences
├── claude-settings.json
└── mcp.json
```

## Skills

User-invoked skills spend no model context until Stephen calls them:

| Skill | Purpose |
| --- | --- |
| `refine-implementation` | Fresh-eyes implementation refinement |
| `thermonuclear-review` | Strict structural maintainability review |
| `improve-codebase-architecture` | Deep-module architecture exploration |
| `grill-me` | Decision-tree interrogation of a plan |
| `mom-test` | Customer-discovery question and evidence review |
| `drama-triangle` | Communication and agency analysis |

Model-invoked skills route natural-language requests into local tools or data:

| Skill | Trigger |
| --- | --- |
| `writing` | Email, messages, Linear, support replies, and other human-facing prose |
| `notes-knowledge-base` | Stephen's Obsidian knowledge base and Tuple-call synthesis |
| `say` | Requested spoken output through ElevenLabs |

## Agents

Claude reads `agents/*.md` directly. Codex uses generated TOML roles under
`~/.codex/agents/stephendolan/`. Keep the markdown definitions canonical and
regenerate runtime copies instead of maintaining both by hand.

## MCP Servers

`mcp.json` defines personal server connections. Run `./generate-mcp.sh` to sync
managed entries to Claude and Codex while preserving client-specific servers.
