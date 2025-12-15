---
description: Extract coding patterns from an author's commits and PRs to generate skills
argument-hint: GitHub username
---

# Distill Author Guidance

Analyze coding patterns and preferences from author: $ARGUMENTS

This command extracts implicit knowledge from an author's commits, PRs, and code reviews to generate skill recommendations.

## Phase 1: Data Collection

Create a workspace directory for findings:
```
/tmp/author-guidance-{author}/
├── commits/           # Findings from commit analysis
├── pr-comments/       # Findings from code review comments
├── pr-submissions/    # Findings from PRs the author submitted
└── synthesis/         # Final synthesized patterns
```

### 1.1 Collect Commits (last 6 months)

Get the author's commits to this repository:
```bash
git log --author="{author}" --since="6 months ago" --format="%H" | head -100
```

For each commit, spawn a subagent (batch in groups of 10 for efficiency) to analyze:
- Commit message style and conventions
- Code patterns in the diff (if touching code files)
- Comments added or modified
- Any refactoring patterns

Each subagent should write findings to `/tmp/author-guidance-{author}/commits/{hash}.md`

### 1.2 Collect PR Review Comments

Get PRs where the author left review comments:
```bash
gh api "repos/{owner}/{repo}/pulls/comments?since={6-months-ago}&per_page=100" \
  --jq '.[] | select(.user.login == "{author}")'
```

Paginate through all results. For each comment, analyze:
- What pattern or issue did they flag?
- Is this a recurring theme?
- Does it suggest a preference or standard?

Write findings to `/tmp/author-guidance-{author}/pr-comments/`

### 1.3 Collect PRs Submitted by Author

Get PRs the author submitted:
```bash
gh pr list --author="{author}" --state all --limit 100 --json number,title,body,reviews
```

For each PR, analyze:
- PR description patterns
- Review conversations (what feedback did they receive and incorporate?)
- Code patterns in the changes

Write findings to `/tmp/author-guidance-{author}/pr-submissions/`

## Phase 2: Pattern Synthesis

After all subagents complete, synthesize findings:

1. Read all files from the workspace directories
2. Identify recurring themes across:
   - Code style preferences
   - Architecture patterns
   - Performance considerations
   - API design preferences
   - Testing patterns
   - Documentation preferences
   - Review feedback themes

3. Group patterns by potential skill:
   - Language-specific patterns (C++, Swift, TypeScript, etc.)
   - Domain-specific patterns (threading, networking, UI, etc.)
   - Process patterns (commits, PRs, reviews)

4. Write synthesis to `/tmp/author-guidance-{author}/synthesis/patterns.md`

## Phase 3: Skill Generation

For each identified skill area:

1. Check if a similar skill already exists in:
   - `~/.dotfiles/claude/skills/`
   - `.claude/skills/` in the current repo

2. If skill exists: propose enhancements based on new patterns
3. If skill doesn't exist: draft a new skill

### Skill Drafting Process

Use the `writing-claude-skills` skill to structure each skill properly:
- Philosophy section explaining the "why"
- Concrete examples from the author's actual code
- Anti-patterns observed in reviews
- Remember section with key takeaways

Use the `prompting-claude` skill to refine language:
- Avoid emphatic language (no MUST, ALWAYS, NEVER in caps)
- Use positive framing
- Be explicit and specific
- Provide context and motivation

### Output Format

For each proposed skill, create:
```
/tmp/author-guidance-{author}/skills/{skill-name}/
├── SKILL.md           # The skill content
├── evidence.md        # Links to commits/PRs that informed this
└── existing-diff.md   # If enhancing existing skill, show proposed changes
```

## Phase 4: Review and Proposal

Present findings to user:

1. Summary of patterns discovered (count by category)
2. List of proposed skills with brief descriptions
3. For each skill:
   - Show the SKILL.md content
   - Show 2-3 key pieces of evidence
   - Ask if user wants to install/update

User can then choose which skills to install.

## Execution Notes

- Spawn subagents in parallel where possible (10+ at a time for commits)
- Use sonnet model for individual commit/comment analysis (fast, tight analysis)
- Use opus for synthesis and skill generation (deep reasoning)
- If author has >200 commits, sample strategically (recent + spread across time)
- For PR comments, prioritize those with code context over general comments
- Skip merge commits and dependabot/bot commits
