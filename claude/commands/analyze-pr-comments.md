Please analyze and plan resolutions for all PR comments on the current branch.

Follow these steps:

1. Get the current branch name
2. Find the pull request for this branch using `gh pr view`
3. Get all comments on the PR using `gh api` to fetch PR comments and review comments
4. For each unresolved, not outdated comment:
   - Analyze if changes were requested or suggested, even at a high level
   - Evaluate whether the suggested change is a good idea
   - If action is needed, create a concise to-do item that:
     - References the comment author and content
     - Specifies the exact changes to make
     - Includes file paths and line numbers where applicable
5. Present a summary list with:
   - Comment author and excerpt
   - Your analysis (requires changes: yes/no, good idea: yes/no)
   - Specific action plan if changes are needed
6. Group comments by file/component for easier resolution

Output format should be:

```
## PR Comment Analysis for #[PR_NUMBER]

### Comment 1 - @[author]
> "[comment excerpt]"
**Requires changes:** Yes/No
**Analysis:** [your evaluation]
**Action:** [specific to-do if needed]

### Comment 2 - @[author]
...
```

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.
