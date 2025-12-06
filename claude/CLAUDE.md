# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code across all projects.

## Claude 4.5 Model Configuration

**Context window management**: Your context window will be automatically compacted as it approaches its limit, allowing you to continue working indefinitely. Do not stop tasks early due to token budget concerns.

## Action Orientation

**Default to implementation over suggestion**: Unless the intent is unclear, implement changes directly rather than only suggesting them. When requirements are ambiguous, infer the most likely useful action or ask clarifying questions.

**Reflect after tool use**: After receiving tool results, reflect on their quality and completeness before proceeding. Consider whether additional steps are required.

**Maximize parallel tool calls**: When calling multiple tools with no dependencies between them, make all independent tool calls simultaneously in a single response. This significantly improves efficiency with Claude 4.5.

## Comment Philosophy

**Write self-documenting code that rarely needs comments.** Comments should be the exception, not the rule.

### Core Principles

- **NO comments that explain WHAT the code does** - The code should be clear through good naming
- **Only comment WHY when necessary** - Business logic reasons, workarounds, or non-obvious decisions
- **Refactor instead of comment** - If code needs explanation, improve the code structure
- **Use descriptive names** - Variables, functions, and types should be self-explanatory
- **Extract complex logic** - Break down complex conditions or operations into well-named functions
- **Let TypeScript document types** - Don't add comments explaining types that TypeScript already shows

### Common Anti-Patterns to Avoid

Based on codebase cleanup experience, these are the most common low-value comments to avoid:

4. **Process Step Comments** - Extract to named functions instead:

   ```typescript
   // L Bad
   // First ensure user exists
   const user = await getUser();
   // Then update their data
   await updateUser();

   //  Good - function names document the process
   const user = await ensureUserExists();
   const result = await updateUserData();
   ```

5. **Field Description Comments** - Use descriptive property names:

   ```typescript
   // L Bad
   interface State {
     items: Item[]; // List of recent items with usage tracking
   }

   //  Good - property name is descriptive
   interface State {
     recentItemsWithUsageTracking: Item[];
   }
   ```

### High-Value Comments (Keep These)

Comments that explain WHY something is done or provide critical context:

1. **Business Logic Explanations**:

   ```typescript
   // Weekly review should prompt for both project and someday review
   // This ensures comprehensive GTD weekly review compliance
   ```

2. **Technical Constraints**:

   ```typescript
   // SQLite doesn't support boolean type, must use 0/1
   completed: input.completed ? 1 : 0;
   ```

3. **Algorithm Explanations**:

   ```typescript
   // Sort mentions in reverse order to avoid index shifting during removal
   const sortedMentions = [...mentions].sort(
     (a, b) => b.startIndex - a.startIndex,
   );
   ```

4. **Performance Optimizations**:

   ```typescript
   // Prefetch on hover for instant navigation - reduces perceived latency by ~200ms
   onMouseEnter={() => prefetchData()}
   ```

5. **Workarounds for External Limitations**:
   ```typescript
   // Clerk doesn't provide user sync events, must poll periodically
   useInterval(() => syncUserData(), 30000);
   ```

Examples:

```typescript
// L Bad - Comment explains what the code does
// Create a new task
await ctx.db.task.create({ data: taskData });

//  Good - Code is self-explanatory
await ctx.db.task.create({ data: taskData });

// L Bad - Comment instead of better naming
// Check if task should be marked as processed
if ((input.contextId || input.projectId) && !task.processedAt) {

//  Good - Extract to named variable
const shouldMarkAsProcessed = (input.contextId || input.projectId) && !task.processedAt;
if (shouldMarkAsProcessed) {

//  Good - Comment explains WHY (when truly necessary)
// SQLite doesn't support boolean type, must use 0/1
completed: input.completed ? 1 : 0
```

### Summary: When to Comment

- **NEVER comment WHAT** - The code should show what it does through clear naming
- **RARELY comment HOW** - Extract complex logic to well-named functions instead
- **SOMETIMES comment WHY** - When the business reason or constraint isn't obvious
- **TODO/FIXME comments belong in TODO.md**, not in code

**Target: 80-90% fewer comments than typical codebases.** If you find yourself writing many comments, step back and improve the code structure instead.

**Rule of thumb**: If a comment can be replaced by better naming or code organization, always choose the refactor.

## Documentation Standards

**Write timeless documentation.** Describe what IS, not what WAS.

### Avoid Temporal References

- **Comparisons**: "vs previous", "used to be X", "now uses Y"
- **Historical context**: "Before we did X"
- **Evolution narratives**: "This is better than the old way"
- **Version markers**: "The new approach"

### Examples

```markdown
❌ Bad
**Total agents**: 6-10 (vs previous 7-13)

✅ Good
**Total agents**: 6-10

❌ Bad
Now uses three-phase workflow instead of two-phase.

✅ Good
Uses three-phase workflow.
```

**Test**: If unclear in 6 months, remove it.

**Exception**: CHANGELOG.md documents changes over time.

## Development Workflow

**Every stage must be refined before proceeding. No exceptions.**

Complete development lifecycle with quality gates:

### Quality Gates

- **Plan** → plan-refiner approves → **Implement**
- **Code** → code-refiner approves → **Commit**
- **Commit** → committer agent (has skill built-in) → **Continue/PR**
- **PR** → pr-creator agent (has skill built-in) → **Done**

### State Management for Long Tasks

For complex work spanning multiple sessions:

- Use structured formats (JSON) for test results and task status
- Create setup scripts (`init.sh`) for graceful restarts across sessions
- Track progress in files and review filesystem state when resuming, rather than relying on conversation history

### 1. Planning

1. Understand requirements and create implementation plan
2. Launch `plan-refiner` agent to validate approach
3. Proceed only after plan is approved

Plan-refiner has final authority on approach and can suggest radical simplifications.

### 2. Implementation

1. Implement according to approved plan
2. At checkpoints, run `/refine-implementation` to spawn `code-refiner` for fresh review
3. Proceed to commit only after refinement is complete

### 3. Committing

**Launch the `committer` agent.** Do not run `git commit` directly.

The committer agent handles the complete workflow: analyzes changes, drafts message following conventional commit standards, refines for clarity, and commits.

### 4. Pull Requests

**Launch the `pr-creator` agent.** Do not run `gh pr create` directly.

The pr-creator agent handles the complete workflow: analyzes branch changes, drafts description, verifies problem statement with user if unclear, refines for clarity, and creates the PR.

## Code Quality Standards

- Ensure all tests pass before committing
- Ensure all linters pass before committing, handling both errors and warnings
- **Never speculate about code you haven't read**: Always read files before answering questions or making changes. Never guess at implementation details or API signatures.
- **Write general-purpose solutions**: Implement logic that solves problems generally. Never hard-code values from test cases or examples - build solutions that work for all valid inputs.
- **Avoid over-engineering**: Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
  - Don't add features, refactor code, or make "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability.
  - Don't add error handling or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs).
  - Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. Three similar lines of code is better than a premature abstraction.
  - Don't add backwards-compatibility hacks like renaming unused `_vars`, re-exporting types, or `// removed` comments. If something is unused, delete it completely.

## Tooling preferences

### Modern Tool Usage

- **For file searching**: Use `fd` instead of `find`. It's faster, has better defaults (respects .gitignore), and simpler syntax:
  - `fd pattern` instead of `find . -name "*pattern*"`
  - `fd -e py` to find Python files instead of `find . -name "*.py"`

- **For text searching**: Use `rg` (ripgrep) instead of `grep`. It's significantly faster, respects .gitignore, and has better defaults:
  - `rg pattern` instead of `grep -r pattern .`
  - `rg -t py pattern` to search only Python files
  - Built-in support for multiline search, context lines, and smart case sensitivity
  - **IMPORTANT**: Use full language names with `--type`, not extensions:
    - ✅ `--type ruby` (not `--type rb`)
    - ✅ `--type crystal` (not `--type cr`)
    - ✅ `--type python` (not `--type py`)
    - Run `rg --type-list` to see all available type names

- **For syntax-aware searching**: Use `ast-grep` when you need structural code search:
  - `ast-grep --lang python -p 'def $FUNC($$$)'` to find function definitions
  - Better than regex for finding code patterns that span multiple lines or have complex nesting

- **For viewing files**: `bat` is available as an enhanced alternative to `cat`. It provides syntax highlighting, line numbers, and git integration for better readability when viewing file contents.

- **For directory listings**: `eza` is available as a modern alternative to `ls` and `tree`. It provides colorized output, git status integration, and tree views with better formatting.

### Tool Hierarchy

1. **ast-grep** - For syntax-aware structural searches in code
2. **ripgrep (rg)** - For fast text searches across files
3. **fd** - For finding files by name or pattern
4. Only fall back to traditional `grep` or `find` if explicitly requested or if the modern tools are unavailable

### Personal Productivity CLIs

- **of** (OmniFocus CLI) - Task management. Use for questions about tasks, projects, contexts, or GTD workflow.
- **helpscout** (HelpScout CLI) - Customer support tooling for Tuple. Use for questions about support tickets, customers, or conversations.
- **ynab** (You Need A Budget CLI) - Personal budgeting. Use for questions about budget categories, transactions, or spending.
