# AGENTS.md

This file provides guidance to AI coding agents when working with code across all projects.

## Core Philosophy

When reviewing your own work, ask: *Am I adding complexity because it's necessary, or because it feels sophisticated?*

## Sub-Agent Delegation

Use sub-agents when the user or an invoked workflow authorizes delegation and
the work benefits from independent context or parallel execution. Give each
agent a bounded question or file ownership; serialize edits to the same file.

### Runtime Portability

Custom agents live in `agents/*.md` as runtime-neutral role contracts with
Claude-compatible frontmatter. Read `AGENT-RUNTIME.md` when adapting them to
non-Claude runtimes.

- Keep the markdown files canonical. Generate runtime-specific copies instead
  of hand-maintaining duplicate prompts.
- For Codex, run `scripts/generate-codex-agents.py` to emit native TOML roles
  under `$CODEX_HOME/agents/stephendolan/`, defaulting to
  `~/.codex/agents/stephendolan/`.
- Treat `model` as a capability hint and `tools` as tool-intent metadata when a
  runtime does not support Claude's exact fields.
- In Codex, use generated native roles when exposed; otherwise load
  `AGENT-RUNTIME.md` plus the requested agent markdown and pass them to a
  `default` subagent.
- Spawn only when the user explicitly asks for subagents, delegation, or
  parallel agent work. Otherwise, apply the role in the main thread.

## Documentation Standards

**Write timeless documentation.** Describe what IS, not what WAS.

Avoid temporal references: "vs previous", "used to be X", "now uses Y", "the new approach".

**Test**: If unclear in 6 months, remove it. Exception: CHANGELOG.md documents changes over time.

## Personal Knowledge Base

Stephen's personal knowledge base lives at `/Users/stephen/Obsidian/Notes`.
Read its `AGENTS.md` before working there; it is the single operating contract.
For personal knowledge-base work, use the private `notes-knowledge-base` skill
when it is installed.

## Development Workflow

### External Review Gate

Use a fresh-context independent reviewer for high-risk plans and risky diffs.
In Claude, prefer `/codex:adversarial-review` for implementation diffs and
`codex:codex-rescue` for plan reviews when available. In Codex, prefer a
specialist reviewer such as `ce-adversarial-reviewer`, or a `default` subagent
loaded with the relevant plan/diff and review criteria when the specialist role
is not exposed.

- Good targets: high-risk plans, cross-cutting architecture conclusions, and risky diffs.
- Routine edits and settled local refactors do not need an independent gate.

### Git Delivery

- Write conventional, imperative commit subjects that explain intent; use a body when the reason or trade-off is not obvious.
- Keep PR descriptions concise and problem-focused. Omit file inventories and testing sections unless they convey material information.

## Code Quality Standards

- Ensure all linters pass before committing, handling both errors and warnings
- **Write general-purpose solutions**: Implement logic that solves problems generally. Build solutions that work for all valid inputs rather than hard-coding values from test cases.
- **Migration safety**: When changing data formats, schemas, or event names, answer "what happens to data that already exists?" Dual-read from old and new sources during transitions. Don't remove legacy compat paths until all in-flight data has aged out.
- **Error propagation**: Error paths must look like errors to callers. Don't log an API failure and return a success-shaped response. Don't send optimistic confirmation text when an action failed.
- **Trace new identifiers end-to-end**: When adding a new identifier or key at one layer, trace the full data path to verify it's consumed at every downstream layer. A new field that's written but never read (or read but never forwarded) is a silent no-op.

## Tooling Preferences

### Bash Command Guidelines

**Avoid shell loops.** For loops, while loops, and compound shell constructs require permission prompts.

| Instead of                                  | Use                      |
| ------------------------------------------- | ------------------------ |
| `for f in *.md; do grep pattern "$f"; done` | `rg pattern *.md`        |
| `for f in dir/*; do head -5 "$f"; done`     | `fd . dir -x head -5 {}` |
| `find . -name "*.md" -exec cat {} \;`       | `fd -e md -x cat {}`     |
| `grep -r pattern .`                         | `rg pattern`             |

### When Using Bash for Search

Built-in Grep and Glob tools are primary for search. When bash is needed (piping, complex queries, syntax-aware search):

- **File searching**: `fd` instead of `find`
- **Text searching**: `rg` with `--type` using full language names (e.g., `--type ruby`)
- **Syntax-aware searching**: `ast-grep` for structural code search
- **Repo symbol index**: If `.treesitter/symbols.txt` exists, search it first with `rg -i 'keyword' .treesitter/symbols.txt` to jump straight to definitions. This is a generated tree-sitter tags index. Treat it as a fast orientation file, not a source of truth. Regenerate with `~/.dotfiles/scripts/tree-sitter-index-repos.py --repo .` if needed.

### Personal Productivity CLIs

- **obsidian** (Obsidian CLI) - Obsidian vault search, links, tags, properties, and capture
- **helpscout** (HelpScout CLI) - Customer support for Tuple
- **ynab** (You Need A Budget CLI) - Personal budgeting

@RTK.md
