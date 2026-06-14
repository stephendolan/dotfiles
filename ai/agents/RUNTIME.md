# Agent Runtime Contract

The markdown files in this directory are the canonical agent definitions.
Claude Code reads their frontmatter directly. Other agent runtimes should treat
the frontmatter as routing metadata and the markdown body as the role contract.

## Frontmatter Interpretation

| Field | Portable meaning |
| --- | --- |
| `name` | Stable role id. Use this when dispatching or generating native agent definitions. |
| `description` | Routing hint. Match the user's task against this before loading the agent. |
| `model` | Capability hint, not a hard requirement. Use a stronger model for high-risk or judgment-heavy work when the runtime supports model selection. |
| `tools` | Tool intent. Map these to the current runtime's equivalent file, shell, browser, web, or user-question tools. |
| `skills` | Load the matching local skill when available. If no skill system exists, apply the referenced domain guidance manually. |

## Tool Mapping

Use native tools for the current runtime instead of preserving Claude-specific
tool names.

| Claude-oriented tool | Runtime-neutral behavior |
| --- | --- |
| `Read`, `LS` | Inspect files and directories with the runtime's read or shell tools. |
| `Grep`, `Glob` | Search with the runtime's fast text and file search tools. |
| `Bash` | Run shell commands using the runtime's shell execution policy. |
| `Write`, `Edit`, `MultiEdit` | Edit files only when the caller asked for implementation or refinement. |
| `AskUserQuestion` | Ask the human only when the answer is required and cannot be safely inferred. If the agent cannot contact the human, return the exact question to the parent agent. |
| `WebSearch`, `WebFetch` | Look up current external facts with the runtime's web or documentation tools. |
| Browser or Chrome MCP tools | Use whatever browser, screenshot, or visual inspection tools the runtime exposes. |
| `TodoWrite` or task tools | Use the runtime's task-tracking primitive when available. |

## Codex Dispatch

Codex-native roles can be generated from these markdown definitions with:

```bash
./ai/scripts/generate-codex-agents.py
```

Run that from the dotfiles repo root. By default, the generator writes TOML
roles to:

```text
$CODEX_HOME/agents/stephendolan/
```

When `CODEX_HOME` is unset, it uses `~/.codex/agents/stephendolan/`.

When Codex is asked to use one of these agents:

1. Prefer the generated native Codex role with the same `name`.
2. If the native role is not visible in the current session, load this file and
   the requested markdown file, then pass both to a `default` Codex subagent.
3. Spawn only when the user explicitly asked for subagents, delegation, or
   parallel agent work. Otherwise, apply the agent persona in the main thread.
4. Give spawned agents a bounded task: goal, scope, relevant paths or evidence,
   write permissions, and expected output shape.
5. Do not have spawned agents delegate again unless the caller explicitly asks
   for nested delegation.

## Agent Contract

Each agent should be usable as a fresh-context specialist. A caller should be
able to hand it a task plus evidence and receive the requested structured
output without relying on Claude-specific state.

Agent definitions should therefore:

- State what the agent owns and what it must leave to the caller.
- Keep output formats explicit and machine-checkable when possible.
- Prefer role behavior over tool choreography.
- Treat project instruction files generically: read `AGENTS.md`, `CLAUDE.md`,
  or the runtime's equivalent when the task depends on local conventions.
- Keep writes scoped. Review agents should report by default; refinement agents
  may edit only inside the caller's stated write scope.
