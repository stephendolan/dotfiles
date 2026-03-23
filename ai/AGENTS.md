# AGENTS.md

This file provides guidance to AI coding agents when working with code across all projects.

## Core Philosophy

When reviewing your own work, ask: *Am I adding complexity because it's necessary, or because it feels sophisticated?*

## Sub-Agent Delegation

**Delegate to sub-agents proactively.** Sub-agents preserve your context window, enable parallel execution, and start with fresh perspective.

When work decomposes into independent pieces, delegate each to a sub-agent and run them in parallel.

**Patterns:**

- Use `run_in_background: true` for tasks that don't block your main work
- When delegating to parallel sub-agents, no two agents should edit the same file. If edits to the same file are needed, serialize them or assign a single owner.

### Quick Reference

| Workflows                  | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `/commit`                  | Commit with conventional message (why > what) |
| `/create-pr`               | Create PR with concise description        |
| `/ship`                    | Autonomous end-to-end feature development |
| `/refine-implementation`   | Multi-pass code review before commit      |
| `/examine-architecture`    | Evaluate codebase for structural problems |
| `/address-pr-review`       | Resolve PR review comments                |
| `/review-dependabot`       | Analyze and merge Dependabot PRs          |
| `/publish`                 | End-to-end release workflow               |
| `/interview`               | Interview user about a plan               |
| `/grill-me`                | Relentless decision-tree interrogation    |
| `/daily-claude-code-recap` | Summarize the day's sessions              |

| Agents                  | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `code-explorer`         | Trace execution paths, map dependencies       |
| `code-architect`        | Design feature architectures                  |
| `code-reviewer`         | Review for bugs, security, conventions        |
| `code-refiner`          | Simplify complexity, improve maintainability  |
| `architecture-reviewer` | Evaluate brittleness, complexity, coupling    |
| `plan-refiner`          | Validate plans, suggest simpler approaches    |
| `pr-comment-reviewer`   | Evaluate PR comments for actionability        |
| `committer`             | Create commits with conventional messages     |
| `pr-creator`            | Create PRs with structured descriptions       |
| `design-refiner`        | Iteratively refine frontend designs           |
| `documentation-refiner` | Maintain Markdown files and developer docs    |
| `skeptic`               | Challenge conclusions before reaching user    |

| Domain Skills            | Trigger                   |
| ------------------------ | ------------------------- |
| `frontend-design`        | Building web interfaces   |
| `writing-documentation`  | Updating docs             |
| `writing-claude-skills`  | Creating Claude skills    |
| `writing-claude-prompts` | Writing prompts           |
| `chartmogul-analytics`   | Analyzing revenue metrics |
| `task-management`        | GTD workflow (OmniFocus)  |
| `order-daycare-lunch`    | School lunch ordering     |
| `cooking`                | Recipes and meal planning |

## Documentation Standards

**Write timeless documentation.** Describe what IS, not what WAS.

Avoid temporal references: "vs previous", "used to be X", "now uses Y", "the new approach".

**Test**: If unclear in 6 months, remove it. Exception: CHANGELOG.md documents changes over time.

## Development Workflow

### Quality Gates

- **Plan** -> plan-refiner approves -> **Implement**
- **Code** -> code-refiner approves -> **Commit**
- **Commit** -> committer agent -> **Continue/PR**
- **PR** -> pr-creator agent -> **Done**

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
- **helpscout** (HelpScout CLI) - Customer support for Tuple
- **ynab** (You Need A Budget CLI) - Personal budgeting
