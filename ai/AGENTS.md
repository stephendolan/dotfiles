# AGENTS.md

Shared instructions for AI coding agents across all projects.

## Sub-Agent Delegation

When work decomposes into independent pieces, run sub-agents in parallel. When delegating to parallel sub-agents, no two agents should edit the same file — serialize edits or assign a single owner.

## Available Agents and Skills

| Agent                     | Use for                                                |
| ------------------------- | ------------------------------------------------------ |
| `code-explorer`           | Trace execution paths, map dependencies                |
| `code-architect`          | Design feature architectures                           |
| `code-reviewer`           | Review for bugs, security, conventions                 |
| `code-refiner`            | Simplify complexity, improve maintainability           |
| `architecture-reviewer`   | Evaluate brittleness, complexity, coupling             |
| `plan-refiner`            | Validate plans, suggest simpler approaches             |
| `pr-comment-reviewer`     | Evaluate PR comments for actionability                 |
| `design-refiner`          | Iteratively refine frontend designs                    |
| `documentation-refiner`   | Maintain Markdown files and developer docs             |
| `skeptic`                 | Challenge conclusions before they reach the user       |

| Workflow                   | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `/commit`                  | Conventional commit focused on why            |
| `/create-pr`               | Create PR with concise description            |
| `/ship`                    | Autonomous end-to-end feature development     |
| `/refine-implementation`   | Multi-pass code review before commit          |
| `/examine-architecture`    | Evaluate codebase for structural problems     |
| `/address-pr-review`       | Resolve PR review comments                    |
| `/review-dependabot`       | Analyze and merge Dependabot PRs              |
| `/publish`                 | End-to-end release workflow                   |
| `/interview`               | Interview user about a plan                   |
| `/grill-me`                | Relentless decision-tree interrogation        |
| `/daily-claude-code-recap` | Summarize the day's sessions                  |

## Documentation Standards

Write timeless documentation. Describe what IS, not what WAS.

Avoid temporal references: "vs previous", "used to be X", "now uses Y", "the new approach". If a statement would be unclear to a reader six months from now, remove it. CHANGELOG.md is the exception — documenting changes over time is its job.

## Code Quality

- **Write general-purpose solutions**: Solve the underlying problem for all valid inputs rather than hard-coding values from test cases.
- **Migration safety**: When changing data formats, schemas, or event names, answer "what happens to data that already exists?" Dual-read from old and new sources during transitions. Don't remove legacy compat paths until all in-flight data has aged out.
- **Error propagation**: Error paths must look like errors to callers. Don't log an API failure and return a success-shaped response. Don't send optimistic confirmation text when an action failed.
- **Trace new identifiers end-to-end**: When adding a new identifier or key at one layer, verify it's consumed at every downstream layer. A field written but never read (or read but never forwarded) is a silent no-op.

## External Review

Use `/codex:adversarial-review` for a second opinion on risky diffs — auth, billing, migrations, public APIs, broad refactors. Skip for small edits and routine work.

## Bash Guidelines

### Avoid shell loops

For loops, while loops, and compound shell constructs require permission prompts. Prefer single-command equivalents.

| Instead of                                  | Use                      |
| ------------------------------------------- | ------------------------ |
| `for f in *.md; do grep pattern "$f"; done` | `rg pattern *.md`        |
| `for f in dir/*; do head -5 "$f"; done`     | `fd . dir -x head -5 {}` |
| `find . -name "*.md" -exec cat {} \;`       | `fd -e md -x cat {}`     |
| `grep -r pattern .`                         | `rg pattern`             |

### Search tools

Built-in Grep and Glob are primary for search. When bash is needed:

- **Files**: `fd` instead of `find`
- **Text**: `rg` with `--type` and full language names (e.g., `--type ruby`)
- **Syntax-aware**: `ast-grep` for structural code search
- **Repo symbol index**: If `.treesitter/symbols.txt` exists, search it first with `rg -i 'keyword' .treesitter/symbols.txt` to jump to definitions. Regenerate with `~/.dotfiles/scripts/tree-sitter-index-repos.py --repo .` if needed.
