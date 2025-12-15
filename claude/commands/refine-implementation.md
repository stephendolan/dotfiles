---
description: Multi-pass code review with parallel refiner agents
---

# Refine Implementation

Multi-pass quality review of recent implementation. Ensures code adheres to CLAUDE.md, skills, and project conventions before committing.

## Philosophy

You cannot objectively assess code you just wrote. This command provides fresh perspectives through specialized agents that review for different concerns. Multiple passes continue until the code meets quality standards.

## Process

### 1. Gather Context

**Implementation context** (run in parallel):

- `git diff` (or `git diff --cached` if staged) to see changes
- `git status` to understand scope
- `git log --oneline main..HEAD` to see commit history on this branch
- `gh pr view --json title,body` to get PR description (if exists)
- Read any relevant CLAUDE.md files in the changed directories

**Intent reconstruction** (if no conversation context):

If this is a fresh conversation on an existing branch, spawn a `code-explorer` agent:

> Analyze this branch to understand what was intentionally built. Review the PR description/title, commit messages, and actual code changes. Summarize: What features/capabilities were intentionally implemented? What problem was being solved?

Pass this context summary to all review agents.

### 2. Launch Review Agents (Parallel)

Spawn three `code-refiner` agents simultaneously, each with a different focus. Agents may make changes, but must clearly report what they changed and why - especially for any deletions or reverts.

**Agent 1 - Simplicity & Elegance**:

> [Include context summary from step 1]
>
> Review for implementation complexity. You have two response modes:
>
> **Autonomous changes** (make directly):
>
> - Simplify HOW features are implemented (fewer abstractions, clearer code)
> - Remove genuinely dead/unreachable code
> - Consolidate redundant implementations of the same thing
>
> **Escalate to caller** (report but don't change):
>
> - Features that add disproportionate complexity
> - Capabilities that seem tangential to the core intent
> - Design decisions you'd question but can't confirm weren't intentional
>
> Format escalations as:
>
> ```
> ESCALATE: [feature/code area]
> Concern: [why this adds significant complexity]
> Recommendation: [what you'd suggest if confirmed unnecessary]
> ```

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

### 4. Handle Escalations

If any agent reported escalations:

1. Present each escalation to the user with the agent's reasoning
2. Ask: "Was this intentionally requested, or should we simplify?"
3. For confirmed removals, make the change
4. For intentional features, note them to avoid re-flagging in subsequent passes

### 5. Reconcile Changes

After reviewing and discussing with agents as needed:

1. Keep non-conflicting improvements
2. For conflicts, choose the better approach
3. Revert any changes that were rejected after discussion
4. Show the user what changed

### 6. Check for Another Pass

Ask the user:

> Refinement complete. [Summary of changes]. Would you like another pass, or are you ready to review and commit?

Options:

- **Another pass** → Return to step 2
- **Review changes** → Show `git diff` and wait for feedback
- **Ready to commit** → Launch `committer` agent

### 7. Final Review (Optional)

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
