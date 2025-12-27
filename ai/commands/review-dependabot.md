---
description: Analyze and merge Dependabot PRs with safety assessment. Use when dependency update PRs are pending. Evaluates breaking changes, searches for upgrade guides, checks codebase impact, and merges approved updates.
---

# Review Dependabot

Analyze all open Dependabot PRs in this repository and merge safe updates.

## Process

### 1. Fetch Dependabot PRs

```bash
gh pr list --author app/dependabot --state open --json number,title,body,url,statusCheckRollup
```

Exit early if none found.

### 2. Classify Updates

Parse each PR title to extract dependency name and version change. Classify as:
- **Major**: First version number changes (3.x → 4.x)
- **Minor**: Second number changes (3.1 → 3.2)
- **Patch**: Third number changes (3.1.1 → 3.1.2)

### 3. Analyze Dependencies

Spawn one `general-purpose` agent per PR, all in parallel.

**For major version bumps:**

```
Evaluate this major dependency update:

Dependency: {name}
Version: {old} → {new}
Release notes from PR:
{body}

1. Web search for "{name} {new_major_version} migration guide" or "{name} {new_major_version} upgrade guide"
2. Identify breaking changes from the release notes
3. Search this codebase for imports/usage of {name}, then check if any breaking changes affect those usages
4. Provide upgrade guide URL if found

Response format:
- **Confidence**: 0-100% that this is safe to merge without code changes
- **Breaking changes**: List any that affect this codebase (or "none found")
- **Upgrade guide**: URL or "not found"
- **Recommendation**: merge / review / skip
- **Reasoning**: One sentence explaining your assessment
```

**For minor and patch updates:**

```
Evaluate this {type} dependency update:

Dependency: {name}
Version: {old} → {new}
Release notes from PR:
{body}

1. Check release notes for security fixes (prioritize these)
2. Note any behavioral changes that could cause issues

Response format:
- **Confidence**: 0-100% safe to merge
- **Security fix**: yes/no
- **Recommendation**: merge / review / skip
- **Reasoning**: One sentence
```

### 4. Present Summary

Display a table showing all PRs with their analysis:

```
| PR | Dependency | Change | CI | Confidence | Action |
|----|------------|--------|-----|------------|--------|
| #6 | zod | 4.1→4.2 | ✓ | 95% | Merge |
| #13 | next | 13→14 | ✓ | 60% | Review |
```

For any "Review" items, show the breaking changes and upgrade guide URL.

### 5. Merge

**Use AskUserQuestion** to ask which PRs to merge with options: all recommended, select individually, or cancel.

For each approved PR:
```bash
gh pr merge {number} --squash --delete-branch
```

## Behavior

- Spawn all analysis agents in a single message for parallel execution
- Only recommend merge when CI passes
- Security fixes get "merge" recommendation regardless of version type
- When a PR contains multiple dependencies, evaluate each one
- If uncertain about impact, recommend "review" rather than "merge"
