# AGENTS.md

This file provides guidance to AI coding agents when working with code across all projects.

## Core Philosophy

When reviewing your own work, ask: *Am I adding complexity because it's necessary, or because it feels sophisticated?*

## Sub-Agent Delegation

**Delegate to sub-agents proactively.** Sub-agents preserve your context window, enable parallel execution, and start with fresh perspective.

When work decomposes into independent pieces, delegate each to a sub-agent and run them in parallel.

In runtimes with stricter dispatch policies, proactive delegation applies when
the user invoked a workflow that authorizes delegation (such as Ship) or
explicitly asked for subagents, delegation, or parallel agent work. Otherwise,
apply the relevant role in the main thread.

**Patterns:**

- Use `run_in_background: true` for tasks that don't block your main work
- When delegating to parallel sub-agents, no two agents should edit the same file. If edits to the same file are needed, serialize them or assign a single owner.
- The built-in `Explore` and `Plan` subagents default to Haiku. On sessions with many MCP servers loaded, the inherited tool catalog inflates the subagent's system prompt past Haiku's limit and every call fails with "Prompt is too long" — even trivial prompts. Pass `model: sonnet` (or `opus`) on the Agent invocation to escape, or fall back to `general-purpose`.

### Runtime Portability

Custom agents live in `agents/*.md` as runtime-neutral role contracts with
Claude-compatible frontmatter. Read `agents/RUNTIME.md` when adapting them to
non-Claude runtimes.

- Keep the markdown files canonical. Generate runtime-specific copies instead
  of hand-maintaining duplicate prompts.
- For Codex, run `scripts/generate-codex-agents.py` to emit native TOML roles
  under `$CODEX_HOME/agents/stephendolan/`, defaulting to
  `~/.codex/agents/stephendolan/`.
- Treat `model` as a capability hint and `tools` as tool-intent metadata when a
  runtime does not support Claude's exact fields.
- In Codex, use generated native roles when exposed; otherwise load
  `agents/RUNTIME.md` plus the requested agent markdown and pass them to a
  `default` subagent.
- Spawn only when the user explicitly asks for subagents, delegation, or
  parallel agent work. Otherwise, apply the role in the main thread.

### Quick Reference

| Workflows                         | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `/commit`                         | Commit with conventional message (why > what) |
| `/create-pr`                      | Create PR with concise description            |
| `/ship`                           | Autonomous end-to-end feature development     |
| `/refine-implementation`          | Multi-pass code review before commit          |
| `/examine-architecture`           | Evaluate codebase for structural problems     |
| `/improve-codebase-architecture`  | Find deepening opportunities informed by ADRs |
| `/address-pr-review`              | Resolve PR review comments                    |
| `/review-dependabot`              | Analyze and merge Dependabot PRs              |
| `/interview`                      | Interview user about a plan                   |
| `/grill-me`                       | Relentless decision-tree interrogation        |

| Agents                  | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `code-explorer`         | Trace execution paths, map dependencies       |
| `code-architect`        | Design feature architectures                  |
| `code-reviewer`         | Review for bugs, security, conventions        |
| `code-refiner`          | Simplify complexity, improve maintainability  |
| `architecture-reviewer` | Evaluate brittleness, complexity, coupling    |
| `plan-refiner`          | Validate plans, suggest simpler approaches    |
| `pr-comment-reviewer`   | Evaluate PR comments for actionability        |
| `design-refiner`        | Iteratively refine frontend designs           |
| `documentation-refiner` | Maintain Markdown files and developer docs    |
| `skeptic`               | Challenge conclusions before reaching user    |

| Domain Skills            | Trigger                             |
| ------------------------ | ----------------------------------- |
| `frontend-design`        | Building web interfaces             |
| `writing-documentation`  | Updating docs                       |
| `writing-claude-skills`  | Creating Claude skills              |
| `writing-claude-prompts` | Writing prompts                     |
| `mom-test`               | Customer-discovery interview design |
| `drama-triangle`         | Communication and conflict analysis |
| `task-management`        | GTD workflow (OmniFocus)            |
| `notes-knowledge-base`   | Stephen's Obsidian notes knowledge base |

## Documentation Standards

**Write timeless documentation.** Describe what IS, not what WAS.

Avoid temporal references: "vs previous", "used to be X", "now uses Y", "the new approach".

**Test**: If unclear in 6 months, remove it. Exception: CHANGELOG.md documents changes over time.

## Personal Knowledge Base

Stephen's personal knowledge base lives at `/Users/stephen/Obsidian/Notes`.

When working there or answering questions from that vault:

- Read the vault-local `AGENTS.md` first; it is the canonical operating contract.
- Use the `notes-knowledge-base` skill if available.
- Treat the vault root as the maintained knowledge-base surface.
- Keep top-level additions within the allowed surfaces named by the vault-local `AGENTS.md`; update that contract if a new root surface is genuinely needed.
- Search the vault root before broader filesystem search.
- Use `Sources/` only for provenance and preserved source text that belongs inside the vault.
- Treat the vault as a wiki, not an app/tool/transcript archive. Do not leave one-off scripts, generated call pages, raw transcript dumps, watcher files, prompts, pid files, or regeneration pipelines in the vault.
- For Tuple call work, raw evidence lives outside Obsidian at `~/Documents/Tuple Calls`. Read the external dated call folders, then update maintained synthesis pages such as `Topics/Tuple Calls.md`, project pages, people/entities, account pages, decision ledgers, and customer-signal pages.
- Treat source capture as incomplete until durable facts are promoted into maintained synthesis pages.
- Prefer many small, named pages over massive aggregate docs. Folder indexes are navigation pages only; durable people, accounts, projects, decisions, concepts, and reusable answers should each get their own page.
- Name knowledge-base pages after the real thing, not the source role. Use pages like `Entities/People/Jack Hannah.md` or `Entities/Accounts/Rentvine.md`, not buckets like "participants."
- Prefer the `obsidian` CLI for Obsidian-native checks when available; otherwise fall back to the app binary as documented in the vault.
- Do not create todos, reminders, or execution queues in notes. Capture real tasks in Fortress.

## Development Workflow

### Quality Gates

- **Plan** -> plan-refiner approves -> **Implement**
- **Code** -> code-refiner approves -> **Commit**
- **Commit** -> `/commit` -> **Continue/PR**
- **PR** -> `/create-pr` -> **Done**

### External Review Gate

Use a fresh-context independent reviewer for high-risk plans and risky diffs.
In Claude, prefer `/codex:adversarial-review` for implementation diffs and
`codex:codex-rescue` for plan reviews when available. In Codex, prefer a
specialist reviewer such as `ce-adversarial-reviewer`, or a `default` subagent
loaded with the relevant plan/diff and review criteria when the specialist role
is not exposed.

- Good targets: high-risk plans before implementation, architecture reviews with cross-cutting findings, and risky diffs before commit
- Bad targets: small edits, routine refactors, or cases where local reviewers already agree and the risk is low

### State Management for Long Tasks

For complex work spanning multiple sessions:

- Use structured formats (JSON) for test results and task status
- Create setup scripts (`init.sh`) for graceful restarts across sessions
- Track progress in files and review filesystem state when resuming

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

- **of** (OmniFocus CLI) - Task management, GTD workflow
- **obsidian** (Obsidian CLI) - Obsidian vault search, links, tags, properties, and capture
- **helpscout** (HelpScout CLI) - Customer support for Tuple
- **ynab** (You Need A Budget CLI) - Personal budgeting

@RTK.md
