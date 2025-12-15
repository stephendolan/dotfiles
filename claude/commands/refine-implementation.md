---
description: Multi-pass code review with parallel refiner agents
---

# Refine Implementation

Multi-pass quality review of recent implementation. Ensures code adheres to CLAUDE.md, skills, and project conventions before committing.

## Philosophy

You cannot objectively assess code you just wrote. This command provides fresh perspectives through specialized agents that review for different concerns. Multiple passes continue until the code meets quality standards.

## Process

### 1. Gather Context

Run in parallel:

- `git diff` (or `git diff --cached` if staged) to see changes
- `git status` to understand scope
- Read any relevant CLAUDE.md files in the changed directories

### 2. Launch Review Agents (Parallel)

Spawn three `code-refiner` agents simultaneously, each with a different focus. Agents may make changes, but must clearly report what they changed and why - especially for any deletions or reverts.

**Agent 1 - Simplicity & Elegance**:

> Review recent changes for over-engineering, unnecessary abstractions, and complexity. You may make improvements, but for any deletion or revert of intentionally-added code, explain your reasoning clearly. Apply simplification principles: remove premature abstractions, delete just-in-case code, consolidate redundant patterns.

**Agent 2 - Configuration Compliance**:

> Review recent changes for adherence to project configuration. You may make improvements, but explain your reasoning for significant changes. Check:
>
> - CLAUDE.md guidelines (comment philosophy, documentation standards, code quality)
> - Skills that should have been invoked but weren't
> - Agents that should have been launched but weren't
> - Commands that could have streamlined the workflow

**Agent 3 - Conventions & Patterns**:

> Review recent changes for consistency with existing codebase patterns. You may make improvements, but for any recommendation to remove or restructure significant code, explain your reasoning. Check naming conventions, error handling patterns, test patterns, and architectural consistency.

### 3. Review Agent Reports

After agents complete:

1. Review what each agent changed and their reasoning
2. For any major deletions or reverts, verify the reasoning is sound
3. **If reasoning seems wrong or missing context, resume the agent** to discuss before accepting
4. Reject or revert changes that undo intentional design decisions without strong justification

### 4. Reconcile Changes

After reviewing and discussing with agents as needed:

1. Keep non-conflicting improvements
2. For conflicts, choose the better approach
3. Revert any changes that were rejected after discussion
4. Show the user what changed

### 5. Check for Another Pass

Ask the user:

> Refinement complete. [Summary of changes]. Would you like another pass, or are you ready to review and commit?

Options:

- **Another pass** → Return to step 2
- **Review changes** → Show `git diff` and wait for feedback
- **Ready to commit** → Launch `committer` agent

### 6. Final Review (Optional)

If user wants to review:

- Show the full diff of all refinements
- Allow them to revert specific changes: `git checkout HEAD -- path/to/file`
- Proceed to commit when satisfied

## When to Stop Iterating

Stop after:

- No agents find issues to fix
- User indicates satisfaction
- 3 passes maximum (diminishing returns)

## Key Principles

- **No commits until user approves** - Changes stay uncommitted for review
- **Multiple perspectives** - Different agents catch different issues
- **Iterative improvement** - One pass rarely catches everything
- **User control** - Always show changes, never auto-commit
