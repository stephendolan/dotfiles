# AGENTS.md

This file provides guidance to AI coding agents when working with code across all projects.

## Core Philosophy

**Complexity is not insight.** Smart people mistake elaborate solutions for wisdom. Ten-page memos that could be one. Factory classes wrapping factory classes. Abstractions for problems that don't exist yet.

Mastery is finding the elegant simplicity that cuts through complexity—not making simple things complex.

When reviewing your own work, ask: *Am I adding complexity because it's necessary, or because it feels sophisticated?*

## Sub-Agent Delegation

**Delegate to sub-agents proactively.** Sub-agents preserve your context window and enable parallel execution.

Spawn `Explore` agents for codebase discovery rather than reading many files directly. When work decomposes into independent pieces, delegate each to a sub-agent and run them in parallel. Use specialized agents for code review, architecture analysis, committing, PR creation, and refinement workflows.

Sub-agents consume their own context (not yours), can run simultaneously, and start with fresh perspective--avoiding confirmation bias from accumulated context.

**Patterns:**

- Before reading more than 3-5 files, spawn an `Explore` agent to gather context
- Launch multiple agents in a single message when tasks are independent
- Use `run_in_background: true` for tasks that don't block your main work

### Quick Reference

| Workflows                  | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `/commit`                  | Commit with conventional message (why > what) |
| `/create-pr`               | Create PR with concise description        |
| `/feature-dev`             | Guided feature development                |
| `/refine-implementation`   | Multi-pass code review before commit      |
| `/examine-architecture`    | Evaluate codebase for structural problems |
| `/address-pr-review`       | Resolve PR review comments                |
| `/review-dependabot`       | Analyze and merge Dependabot PRs          |
| `/publish`                 | End-to-end release workflow               |
| `/interview`               | Interview user about a plan               |
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

## Comment Philosophy

**Write self-documenting code that rarely needs comments.**

| Comment Type  | Action                                                         |
| ------------- | -------------------------------------------------------------- |
| Explains WHAT | Remove - use better naming                                     |
| Explains HOW  | Remove - extract to named function                             |
| Explains WHY  | Keep if non-obvious (business logic, constraints, workarounds) |

**Keep**: Technical constraints, algorithm rationale, external workarounds, performance notes.

**Target**: 80-90% fewer comments. TODO/FIXME belong in TODO.md.

## Documentation Standards

**Write timeless documentation.** Describe what IS, not what WAS.

Avoid temporal references: "vs previous", "used to be X", "now uses Y", "the new approach".

**Test**: If unclear in 6 months, remove it. Exception: CHANGELOG.md documents changes over time.

## Development Workflow

**Refine each stage before proceeding.**

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

### 1. Planning

1. Understand requirements and create implementation plan
2. Launch `plan-refiner` agent to validate approach
3. Proceed only after plan is approved

Plan-refiner has final authority on approach and can suggest radical simplifications.

### 2. Implementation

1. Implement according to approved plan
2. At checkpoints, run `/refine-implementation` to spawn `code-refiner` for fresh review
3. Proceed to commit only after refinement is complete

### 3. Committing

Run `/commit` or ask: "commit these changes"

Creates commits with conventional messages that explain *why*, not just *what*. Analyzes changes, drafts message, refines for clarity, and commits.

### 4. Pull Requests

Run `/create-pr` or ask: "create a PR for this branch"

Creates PRs with concise descriptions focused on the problem being solved. Analyzes branch, drafts description, verifies problem statement if unclear, and creates the PR.

## Code Quality Standards

- Ensure all tests pass before committing
- Ensure all linters pass before committing, handling both errors and warnings
- **Read code before responding**: Read files before answering questions or making changes. Verify implementation details and API signatures rather than guessing.
- **Write general-purpose solutions**: Implement logic that solves problems generally. Build solutions that work for all valid inputs rather than hard-coding values from test cases.
- **Avoid over-engineering**: Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
  - Don't add features, refactor code, or make "improvements" beyond what was asked
  - Don't add error handling for scenarios that can't happen. Only validate at system boundaries
  - Don't create abstractions for one-time operations. Three similar lines is better than a premature abstraction
  - If something is unused, delete it completely

## Anti-Patterns

- **Kitchen-sink sessions**: One task per session. Context pollution degrades quality.
- **Infinite exploration**: Set a file-reading budget. After 5-7 files, synthesize or spawn an explorer agent.
- **Trust-then-verify gap**: Run tests after changes, not just before committing.

## Tooling Preferences

### Bash Command Guidelines

**Avoid shell loops.** For loops, while loops, and compound shell constructs require permission prompts.

| Instead of                                  | Use                      |
| ------------------------------------------- | ------------------------ |
| `for f in *.md; do grep pattern "$f"; done` | `rg pattern *.md`        |
| `for f in dir/*; do head -5 "$f"; done`     | `fd . dir -x head -5 {}` |
| `find . -name "*.md" -exec cat {} \;`       | `fd -e md -x cat {}`     |
| `grep -r pattern .`                         | `rg pattern`             |

For complex multi-file discovery, spawn a subagent rather than writing shell loops.

### Modern Tool Usage

- **File searching**: Use `fd` instead of `find`. Faster, respects .gitignore, simpler syntax.
- **Text searching**: Use `rg` (ripgrep) instead of `grep`. Use full language names with `--type` (e.g., `--type ruby` not `--type rb`).
- **Syntax-aware searching**: Use `ast-grep` for structural code search.
- **File viewing**: `bat` provides syntax highlighting and line numbers.
- **Directory listings**: `eza` provides colorized output and git status integration.

### Tool Hierarchy

1. **ast-grep** - For syntax-aware structural searches in code
2. **ripgrep (rg)** - For fast text searches across files
3. **fd** - For finding files by name or pattern
4. Only fall back to traditional `grep` or `find` if explicitly requested

### Personal Productivity CLIs

- **of** (OmniFocus CLI) - Task management, GTD workflow
- **helpscout** (HelpScout CLI) - Customer support for Tuple
- **ynab** (You Need A Budget CLI) - Personal budgeting
