---
name: create-pr
description: Open a pull request for the current branch. Use when code is ready for review. Creates concise descriptions focused on the problem being solved.
argument-hint: Optional branch name or --draft flag
---

# Create Pull Request

Create a high-quality PR for the current branch with a clear, concise description.

## Process

### 1. Analyze Branch Changes

Run in parallel:

```bash
git diff main...HEAD --stat    # Summary of all changes
git log main..HEAD --oneline   # Commit history on this branch
git status                     # Check if pushed to remote
```

### 2. Understand the Why

Before drafting, identify:

- **What problem does this solve?** (user-facing issue or business need)
- **Why was this approach chosen?** (if non-obvious)

If the problem isn't clear from commit messages or code, **stop and ask the user** using AskUserQuestion. Never guess the problem statement.

### 3. Draft Description

```markdown
## Summary

[2-3 sentences: what changed and why]

## Problem

[1-2 sentences: the user-facing issue or business need this solves]

---
Generated with [Claude Code](https://claude.com/claude-code)
```

Only add a **Core Changes** section for:
- Breaking API changes
- New database migrations
- Major architectural modifications
- New service integrations

### 4. Create PR

```bash
# Push if needed
git push -u origin HEAD

# Create PR (add --draft if requested)
gh pr create --title "type(scope): summary" --body "..."
```

Report the PR URL when complete.

## What to Exclude

- Technical details sections
- Testing sections (CI handles this)
- Before/after comparisons
- File listings (visible in diff)
- Migration notes
- Follow-up work sections
