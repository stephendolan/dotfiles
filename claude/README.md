# Claude Code Configuration

Custom agents, commands, and skills for Claude Code.

## Overview

```
commands/     Slash commands that orchestrate workflows
agents/       Specialized subagents spawned by commands
skills/       Domain knowledge activated by context
```

---

## Commands

Slash commands orchestrate multi-step workflows, often spawning agents.

| Command                    | Purpose                                            | Agents Used                                  |
| -------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `/feature-dev`             | Guided feature development (accepts Linear issues) | code-explorer, code-architect, code-reviewer |
| `/refine-implementation`   | Multi-pass quality review before committing        | code-refiner                                 |
| `/examine-architecture`    | Evaluate codebase for structural problems          | architecture-reviewer, plan-refiner          |
| `/address-pr-review`       | Resolve unresolved PR review comments              | pr-comment-reviewer                          |
| `/distill-author-guidance` | Extract coding patterns from an author's history   | —                                            |

---

## Agents

Subagents are spawned by commands or invoked directly for focused tasks.

### Understanding Code

| Agent                     | Purpose                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| **code-explorer**         | Traces execution paths, maps architecture layers, documents dependencies |
| **architecture-reviewer** | Evaluates existing code for brittleness, complexity, coupling            |

### Building Code

| Agent              | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| **code-architect** | Designs feature architectures with implementation blueprints |
| **plan-refiner**   | Validates implementation plans, suggests simpler approaches  |

### Reviewing Code

| Agent                   | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| **code-reviewer**       | Reviews for bugs, security, conventions (confidence-filtered) |
| **code-refiner**        | Simplifies complexity, improves maintainability               |
| **pr-comment-reviewer** | Evaluates individual PR comments for actionability            |

### Git Workflow

| Agent                     | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| **committer**             | Creates commits with conventional message format |
| **pr-creator**            | Creates PRs with structured descriptions         |
| **documentation-refiner** | Maintains README, CHANGELOG, and project docs    |

---

## Skills

Skills provide domain expertise activated automatically by context.

### Development

| Skill                          | Trigger                         |
| ------------------------------ | ------------------------------- |
| **ruby-idioms**                | Writing Ruby code               |
| **rails-controllers**          | Writing Rails controllers       |
| **rails-jobs**                 | Creating background jobs        |
| **rails-migrations**           | Writing database migrations     |
| **rspec-testing**              | Writing RSpec tests             |
| **cpp-native-development**     | Writing C++17/20 code           |
| **macos-native-development**   | Writing macOS/Swift/AppKit code |
| **windows-native-development** | Writing Windows/Win32 code      |
| **frontend-design**            | Building web interfaces         |

### Writing

| Skill                     | Trigger                    |
| ------------------------- | -------------------------- |
| **writing-git-commits**   | Committing code            |
| **writing-pull-requests** | Creating PRs               |
| **writing-documentation** | Updating docs              |
| **writing-claude-skills** | Creating skills            |
| **prompting-claude**      | Writing prompts for Claude |

### Tools

| Skill                    | Trigger                   |
| ------------------------ | ------------------------- |
| **chartmogul-analytics** | Analyzing revenue metrics |
| **project-management**   | Planning tasks and work   |
| **order-daycare-lunch**  | School lunch ordering     |

---

## Workflow Patterns

### Feature Development

```
/feature-dev "Add user authentication"
    │
    ├─→ Discovery: clarify requirements
    ├─→ Exploration: code-explorer (2-3x parallel)
    ├─→ Questions: resolve ambiguities
    ├─→ Architecture: code-architect (2-3x parallel)
    ├─→ Implementation: build the feature
    ├─→ Review: code-reviewer (3x parallel)
    └─→ Summary: document what was built
```

### Code Quality

```
/refine-implementation
    │
    ├─→ code-refiner: simplicity & elegance
    ├─→ code-refiner: configuration compliance
    ├─→ code-refiner: conventions & patterns
    └─→ Reconcile changes, iterate if needed
```

### Architecture Analysis

```
/examine-architecture
    │
    ├─→ architecture-reviewer (4-8x parallel, one per surface)
    ├─→ Consolidate findings
    └─→ plan-refiner: validate fixes
```
