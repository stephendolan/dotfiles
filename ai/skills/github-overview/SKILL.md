---
name: github-overview
description: GitHub PR dashboard for tupleapp org. Use when checking PRs, reviewing PR status, "what needs my attention", "PR overview", "github overview", or starting the day.
allowed-tools: Bash, AskUserQuestion
context: fork
---

# GitHub PR Overview

Show open PRs across the `tupleapp` org where you're involved — either as author or requested reviewer. Analyze each PR's state and suggest concrete next actions.

## Data Collection

Run these three commands in parallel:

### 1. Get GitHub username

```bash
gh api user --jq '.login'
```

### 2. PRs you authored (open, tupleapp org)

```bash
gh search prs --author @me --owner tupleapp --state open --json repository,number,title,url,updatedAt,createdAt --limit 50
```

### 3. PRs where you're requested as reviewer

```bash
gh search prs --review-requested @me --owner tupleapp --state open --json repository,number,title,url,updatedAt,createdAt --limit 50
```

## Per-PR Analysis

For each PR found, fetch detailed state. Run these in parallel across PRs:

```bash
gh pr view {number} -R {repo_full_name} --json \
  number,title,url,author,state,isDraft,mergeable,reviewDecision,\
  reviewRequests,latestReviews,comments,statusCheckRollup,\
  additions,deletions,createdAt,updatedAt
```

### Authored PRs — Determine What You're Waiting On

For each PR you authored, classify into one of these states:

| State | Condition | Suggested Action |
|-------|-----------|-----------------|
| **Needs reviewer** | `reviewRequests` is empty AND no reviews exist | Assign a reviewer |
| **Waiting on review** | Reviewers requested but no reviews submitted yet | Wait (or nudge if stale >2 days) |
| **Changes requested** | Any review has `state: CHANGES_REQUESTED` | Address feedback |
| **Approved** | `reviewDecision` is `APPROVED` | Merge |
| **Draft** | `isDraft` is true | Mark ready or keep working |
| **CI failing** | Any `statusCheckRollup` item has `conclusion: FAILURE` | Fix CI |
| **Commented** | Reviews exist with `state: COMMENTED` but no approval/rejection | Read comments, decide if action needed |

**Staleness**: If `updatedAt` is more than 2 days ago with no reviewer activity, flag as stale.

### Review-requested PRs — Determine Your Review Status

For each PR where you're a requested reviewer:

| State | Condition | Suggested Action |
|-------|-----------|-----------------|
| **Needs your review** | You appear in `reviewRequests` and have no review | Review it |
| **You reviewed, awaiting author** | You left a review, author hasn't pushed since | Wait |
| **Author addressed feedback** | You left a review, author pushed commits after your review | Re-review |

Check if your username appears in `latestReviews` to determine if you've already reviewed. Compare the review's `submittedAt` against the PR's `updatedAt` to detect if new commits arrived after your review.

## Presentation

### Summary Table

Present two tables: **Your PRs** and **PRs to Review**.

```
## Your PRs

| PR | Repo | Status | Action |
|----|------|--------|--------|
| #123 Title | repo-name | Approved | Merge |
| #456 Title | repo-name | Changes requested | Address feedback |
| #789 Title | repo-name | Waiting (3d stale) | Nudge reviewer |

## PRs to Review

| PR | Repo | Size | Status | Action |
|----|------|------|--------|--------|
| #101 Title | repo-name | +42/-10 | Needs your review | Review |
| #202 Title | repo-name | +150/-80 | Author updated | Re-review |
```

Size: show `+additions/-deletions`. Flag large PRs (>500 lines changed).

Include the PR URL as a markdown link on the PR number/title so the user can click through.

### Action Menu

After the tables, collect all actionable items and present with AskUserQuestion using `multiSelect: true`. Group actions by type since options are limited to 4.

**If total actionable PRs <= 4**: List each PR as an option directly.

**If total actionable PRs > 4**: Group by action type:

- "Merge N approved PRs" — run `gh pr merge` for each
- "Open N PRs needing your review in browser" — run `open {url}` for each
- "Open N PRs with feedback to address in browser" — run `open {url}` for each
- "Nudge reviewers on N stale PRs" — leave a comment or just open in browser

For merge actions, use `gh pr merge {number} -R {repo} --squash`. For everything else, open URLs in the browser with `open {url}`.

### Edge Cases

- **No PRs found**: Say "No open PRs need your attention" and stop.
- **Only one category has PRs**: Skip the empty table, still present the action menu.
- **Draft PRs**: Include in tables but don't suggest merge actions.
- **PRs you authored AND are reviewer on**: Show only in "Your PRs" table.

## Remember

- Run `gh` commands in parallel where possible — speed matters for a dashboard.
- The user wants a quick status check, not deep analysis. Be concise.
- Always include clickable URLs so the user can jump straight to any PR.
- Present the tables FIRST, then the action menu. The user may just want to see the overview.
