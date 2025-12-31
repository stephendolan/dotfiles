---
name: refine-design
description: Iteratively refine frontend designs until they achieve a 10/10 rating. Use when asked to "refine this design", "polish this UI", "get this to 10/10", or improve visual design quality. Covers UI iteration, design feedback loops, and screenshot-based review workflows.
---

# Refine Design to 10/10

Iteratively refine a frontend design using the frontend-design skill for ratings until achieving 10/10.

## Workflow

### Phase 1: Setup

1. **Determine screenshot method** using AskUserQuestion:
   ```
   question: "What are we refining?"
   options:
     - label: "Web UI (Rails, React, etc.)"
       description: "Viewable at a localhost URL - I can screenshot automatically"
     - label: "Native app or other"
       description: "Not in a browser - you'll provide screenshots after each change"
   ```

2. **For web UI**: Get the localhost URL, verify Chrome MCP tools are available (`mcp__claude-in-chrome__*`), navigate and take initial screenshot.

3. **For native app**: Ask user to provide initial screenshot. After each iteration, prompt for an updated screenshot.

4. **Establish baseline**: Get initial rating from frontend-design skill with detailed feedback.

### Phase 2: Iteration Loop

Repeat until 10/10:

1. **Review suggestions** from the frontend-design skill rating (always provides specific suggestions when rating < 10).

2. **If multiple valid approaches exist**, use AskUserQuestion to let user choose direction.

3. **Implement changes** based on chosen approach. Be thorough - address each suggestion from the feedback.

4. **Capture new state**: Refresh and screenshot (browser) or request updated screenshot (manual).

5. **Get new rating** from frontend-design skill. Include what changed and request rating with next suggestions.

6. **Compact context**: Summarize current rating, key improvements made, and remaining issues. This preserves context window for continued iteration.

### Phase 3: Completion

When 10/10 is achieved:
- Announce completion with summary of the design journey
- List iterations with their ratings
- Highlight the key transformations that elevated the design

## Guidelines

**Iterate autonomously** - The goal is 10/10. Continue iterating without asking permission after each round.

**Use AskUserQuestion for**:
- Initial setup (screenshot method)
- Design direction choices when multiple valid approaches exist

**Context management**:
- Chrome screenshots consume significant tokens
- After each iteration, record: rating, changes made, next steps
- If context is getting long, summarize progress before continuing

**Rating interpretation**:
| Rating | Meaning |
|--------|---------|
| 6-7/10 | Fundamental issues to address |
| 8/10 | Good but needs polish |
| 9/10 | Nearly there, minor refinements |
| 10/10 | Ship it |

## Example

```
User: "Refine the member badges to 10/10"

1. Ask: Web UI or native? → Web UI
2. Get URL: localhost:3000/teams/123/communities/456
3. Screenshot → Rate: 6/10 "competing hover effects"
4. Implement: always-visible email, remove tooltip
5. Screenshot → Rate: 7.5/10 "spacing cramped"
6. Implement: larger padding, better font sizes
7. Screenshot → Rate: 8.5/10 "layout inconsistent"
8. Implement: grid layout, consistent styling
9. Screenshot → Rate: 9/10 "delete button too large"
10. Implement: smaller button, hover lift effect
11. Screenshot → Rate: 10/10
12. Announce completion with journey summary
```

## State to Preserve Between Compactions

- Current iteration number and rating
- Key feedback points and remaining issues
- Files modified and their purposes
- URL being tested (if browser)
- Design direction choices made by user
