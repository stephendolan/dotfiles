Review pull request $ARGUMENTS with strategic focus on architecture and analytics.

Follow these steps:

1. Check current branch status with `git status` and warn about:
   - Uncommitted changes
   - Unpushed commits
   - Offer to stash changes if needed

2. Fetch and checkout the PR:
   - Use `gh pr checkout $ARGUMENTS` if numeric
   - Use `gh pr view $ARGUMENTS` to get PR details first
   - Identify the base branch for comparison

3. Analyze the changes strategically:
   - Get diff with `git diff [base-branch]...HEAD`
   - Review modified files focusing on architecture
   - Examine commit history for context

## Primary Review Focus: Strategic & Architectural

### Analytics Events (Core Responsibility)
- Are all user actions properly tracked with analytics events?
- Do events follow our established naming conventions and schema?
- Are event properties complete and well-structured?
- Will these events provide actionable insights?
- Are we tracking the right level of detail (not too much, not too little)?
- Do events support our product analytics goals?

### High-Level Approach
- Is this the right solution to the problem?
- Are there more maintainable or scalable alternatives?
- Does this align with long-term product direction?
- Will this approach handle future requirements?

### Design & Abstractions
- Are abstractions at the right level?
- Is complexity justified by the requirements?
- Does it follow existing patterns in the codebase?
- Is the solution over-engineered or under-engineered?

### Performance & Scalability
- Will this scale if usage grows 10x or 100x?
- Are there potential bottlenecks?
- Is caching strategy appropriate?

### Security & Data
- Are there security implications?
- Is sensitive data handled appropriately?
- Are proper validations in place?

## Secondary Review Focus: Code Quality
- Flag only significant code quality issues
- Focus on systemic problems over isolated style issues
- Mention testing coverage if notably lacking

Output format:
```
## Strategic Review: PR #[NUMBER] - [TITLE]

### Analytics Assessment
[Detailed review of analytics implementation]

### Architectural Analysis
[Strategic concerns and recommendations]

### Alternative Approaches
[If applicable, suggest better solutions]

### Critical Issues
[Must-fix problems before merge]

### Minor Suggestions
[Nice-to-have improvements]
```