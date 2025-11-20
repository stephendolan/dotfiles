---
name: writing-git-commits
description: Draft initial commit messages. Use BEFORE git-commit-refiner agent. Covers commit types (feat, fix, refactor, docs, chore), scope determination, imperative mood formatting, and summary line best practices.
allowed-tools: Read, Bash, Grep, Glob
---

This skill provides guidance for creating clear, consistent commit messages following conventional commit standards.

## Format

```
<type>(<scope>): <summary>

<optional body>

<optional footer>
```

## Commit Types

Choose the type that best describes the change:

- **feat**: New feature or functionality
- **fix**: Bug fix
- **refactor**: Code restructuring without behavior change
- **docs**: Documentation only changes
- **style**: Code formatting, whitespace, missing semicolons (no logic change)
- **test**: Adding or modifying tests
- **chore**: Maintenance tasks, dependency updates, build config
- **perf**: Performance improvements
- **ci**: CI/CD configuration changes

**Most common**: feat, fix, refactor, docs, chore

## Scope (Optional)

The scope indicates what part of the codebase changed:

```
feat(auth): add OAuth2 provider
fix(api): handle null response from endpoint
refactor(database): normalize user schema
```

**When to include scope**:

- ✅ Changes focus on specific module/feature
- ✅ Helps narrow down what changed
- ✅ Codebase has clear module boundaries

**When to skip scope**:

- Changes span multiple areas
- Scope is obvious from summary
- Small codebases where scope adds no value

## Summary Line

**Rules**:

- Use imperative mood ("add feature" not "added feature" or "adds feature")
- Start with lowercase (after the type)
- No period at the end
- Keep under 72 characters (50-60 ideal)
- Be specific but concise

**Good examples**:

```
feat(auth): add two-factor authentication
fix(parser): handle escaped quotes in strings
refactor(api): extract validation to middleware
docs(readme): update installation instructions
chore(deps): upgrade React to v18.3.0
```

**Bad examples**:

```
feat: updates         ❌ Vague, past tense
fix: fixed bug       ❌ Redundant, past tense
feat(ui): Add Button ❌ Capital letter after colon
refactor: code       ❌ Too vague
```

## Imperative Mood

Think: "This commit will..."

- ✅ "add feature" → This commit will add feature
- ❌ "added feature" → This commit will added feature ❌
- ❌ "adds feature" → This commit will adds feature ❌

**Common verbs**: add, remove, update, fix, refactor, extract, rename, improve, optimize, implement

## Body (Optional)

Add a body when:

- Why the change was made needs explanation
- The approach isn't obvious from the diff
- Breaking changes or important context exists

**Format**:

- Blank line after summary
- Wrap at 72 characters
- Use bullet points for multiple points
- Explain WHY, not WHAT (the diff shows what)

```
refactor(auth): extract session validation to middleware

Session validation was duplicated across 5 endpoints, making it
error-prone to update. Extracting to middleware ensures consistency
and makes the validation logic easier to test in isolation.
```

## Footer (Optional)

Use for:

- **Breaking changes**: `BREAKING CHANGE: describe what broke`
- **Issue references**: `Fixes #123`, `Closes #456`, `Relates to #789`
- **Co-authors**: `Co-Authored-By: Name <email>`

```
feat(api): redesign authentication endpoints

BREAKING CHANGE: /auth/login now requires email instead of username

Fixes #234
```

## Examples by Type

**feat** - New functionality:

```
feat(notifications): add real-time updates via WebSocket
feat(export): support CSV and JSON formats
feat(search): implement fuzzy matching
```

**fix** - Bug fixes:

```
fix(validation): prevent email addresses with spaces
fix(calendar): correct timezone offset calculation
fix(upload): handle files larger than 10MB
```

**refactor** - Code improvements without behavior change:

```
refactor(user): extract profile validation to schema
refactor(api): consolidate error handling middleware
refactor(database): normalize contact information
```

**docs** - Documentation:

```
docs(readme): add troubleshooting section
docs(api): update endpoint authentication requirements
docs(contributing): clarify PR review process
```

**chore** - Maintenance:

```
chore(deps): update dependencies to latest versions
chore(build): optimize webpack configuration
chore(lint): fix TypeScript warnings
```

## Multi-File Commits

When changes span multiple areas:

**Option 1**: Use general scope or no scope:

```
feat(api): add user profile endpoints
refactor: normalize validation logic across services
```

**Option 2**: List primary area in scope:

```
feat(auth): implement OAuth2 flow
// Even if it touches other files for integration
```

**Avoid**: Multiple types in one commit - split into separate commits instead.

## Complex Changes

For large refactors or multi-part changes, prefer:

1. **Multiple focused commits** over one large commit
2. **Descriptive body** explaining the overall approach
3. **Issue references** linking to detailed discussion

**When changes are truly inseparable**, launch the `git-committer` agent for detailed analysis and message generation.

## Repository-Specific Patterns

Always check recent commits to match established patterns:

```bash
git log --oneline -10
```

Look for:

- Emoji usage (some repos prefix with 🎨, 🐛, etc.)
- Scope conventions (specific module names)
- Footer formats (ticket references, sign-offs)

**Consistency with the repository matters more than perfect adherence to general standards.**

## Quick Reference

| Type     | When to Use                         |
| -------- | ----------------------------------- |
| feat     | New feature, new capability         |
| fix      | Bug fix, error correction           |
| refactor | Code cleanup, restructuring         |
| docs     | Documentation changes only          |
| chore    | Dependencies, build config, tooling |
| test     | Test additions or fixes             |
| perf     | Performance optimization            |
| style    | Formatting, whitespace              |
| ci       | CI/CD pipeline changes              |

## Remember

- **Imperative mood** - "add" not "added" or "adds"
- **Be specific** - "fix login validation" not "fix bug"
- **Scope helps** - But only when it adds clarity
- **72 character limit** - For summary line
- **Body is optional** - Use when context helps
- **Check repository patterns** - Consistency matters
- **One logical change** - Split unrelated changes into multiple commits

Good commit messages make archaeology easy. Future developers (including you) will thank you.
