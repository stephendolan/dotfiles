---
name: writing-pull-requests
description: Generate concise pull request descriptions with summary and problem statement only. Avoids verbose sections like technical details, testing notes, before/after comparisons, and implementation specifics. Use when creating GitHub pull requests with gh pr create.
allowed-tools: Bash, Read, Grep, Glob
---

# Pull Request Description Generator

Generate focused, concise pull request descriptions that communicate essential information without overwhelming verbosity.

## Core Philosophy

**Brevity over completeness.** Most pull requests don't need extensive documentation:

✅ **Include:**

- Summary (2-3 sentences max)
- Problem statement (verify with user if uncertain)
- Core changes (ONLY for major architectural changes)

❌ **Exclude:**

- Technical details sections
- Testing sections (CI handles verification)
- Manual testing notes
- Before/after comparisons
- Verification steps
- Impact sections
- Migration notes (unless critical)
- Follow-up work sections
- Code quality notes

## Standard Template

Use this minimal template for most PRs:

```markdown
## Summary

[2-3 sentences: what changed and why]

## Problem

[1-2 sentences: the issue this solves]
```

## Core Changes Section (Rare)

Only include "Core Changes" for significant architectural modifications:

```markdown
## Core Changes

- New database migrations
- Breaking API changes
- Major dependency updates
- New service integrations
- Significant refactoring affecting multiple systems
```

**Skip this section** for routine bug fixes, feature additions, or refactoring that doesn't change architecture.

## Workflow

### 1. Gather Context

```bash
# Review all changes from branch point
git diff main...HEAD

# Check commit history
git log main..HEAD --oneline
```

### 2. Verify Problem Statement

If the problem isn't immediately clear from code changes:

**Ask the user directly** using AskUserQuestion:

- "What problem does this PR solve?"
- "What was the user-facing issue or business need?"

Never guess or infer when uncertain.

### 3. Draft Description

Write 2-3 sentence summary covering:

- What changed
- Why it changed
- High-level impact

Add problem statement if clearly understood or confirmed by user.

Add core changes section ONLY if there are architectural changes.

### 4. Create Pull Request

```bash
# Create PR with gh CLI using heredoc for body
gh pr create --title "Brief descriptive title" --body "$(cat <<'EOF'
## Summary

[Your summary here]

## Problem

[Problem statement here]
EOF
)"
```

## Examples

### Example 1: Simple Bug Fix

**Good (Concise):**

```markdown
## Summary

Fixed user authentication failing when email contains special characters by adding proper URL encoding to the email validation flow.

## Problem

Users with emails containing '+' or '.' characters couldn't log in, causing support tickets.
```

**Too Verbose:**

```markdown
## Summary

[same as above]

## Problem

[same as above]

## Solution

- Moved validation logic to shared module
- Added URL encoding utility function
- Updated 3 authentication endpoints

## Technical Details

**Files modified:**

- app/auth/validators.rb
- lib/utils/encoding.rb

## Testing

✅ 107 tests passing
✅ Manual testing completed

## Verification Steps

1. Test with emails containing special characters
2. Verify existing users still work
```

### Example 2: Feature with Architecture Change

**Good (Concise):**

```markdown
## Summary

Added real-time notification system using WebSockets for instant updates on user actions.

## Problem

Users had to refresh the page to see new activity, creating poor collaborative experience.

## Core Changes

- New WebSocket server with Redis pub/sub for horizontal scaling
- Database migration for `notifications` table
- New client library exported from shared package
```

**Too Verbose:**

```markdown
## Summary

[same]

## User-Facing Changes

- ✅ Real-time updates without refresh
- ✅ Notification badge shows unread count
- ✅ Faster perceived performance

## Technical Details

### New Services

Created 3 new services following existing patterns...

### Database Schema

Added notifications table with proper indexes...

### Client Integration

- New WebSocket client with auto-reconnect
- Fallback to polling for unsupported browsers

### Comprehensive Changes

- ✅ Updated 12 controllers
- ✅ Added WebSocket middleware

## Testing

- ✅ All feature tests passing
- ✅ Load tested with 1000 concurrent connections
```

### Example 3: Simple Refactoring

**Good (Concise):**

```markdown
## Summary

Refactored user profile validation to use shared schema, improving type safety and reducing duplication across endpoints.

## Problem

Profile validation logic was scattered across multiple files with inconsistent error messages.
```

**Too Verbose:**

```markdown
## Summary

[same]

## Changes

### Code Organization

- Extracted validation to shared module
- Created reusable schema definitions

### Benefits

- Improved maintainability
- Better error messages
- Consistent validation across endpoints

## Technical Details

**Refactoring approach:**

- Used existing schema library
- Maintained backward compatibility

**Code Quality:**

- Reduced duplication by 45%
- Improved test coverage

## Testing

- Updated tests to use new schemas
- ✅ All tests passing
- ✅ No regressions found
```

## Key Principles

1. **Trust CI/CD**: Don't document what automated tests verify
2. **No manual testing notes**: Rarely actually performed, adds noise
3. **Avoid before/after**: Changes should be clear from summary
4. **Question uncertainty**: Always verify problem statements you're unsure about
5. **Architecture changes only**: Most PRs don't need "Core Changes" section
6. **Two sections is normal**: Summary + Problem is sufficient for most PRs

## Common Mistakes to Avoid

- ❌ Listing all files modified (this is in the diff)
- ❌ Describing implementation details (this is in the code)
- ❌ Documenting test results (CI shows this)
- ❌ Writing verification steps (not actually manual tested)
- ❌ Adding impact/migration/follow-up sections (usually unnecessary)
- ❌ Including code quality improvements (should be standard practice)
