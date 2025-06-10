# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code across all projects.

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

1. **tRPC Procedure Comments** - Never comment obvious API operations:

   ```typescript
   // L Bad
   // Create a new task
   create: protectedProcedure.input(...)

   //  Good - procedure name is self-explanatory
   create: protectedProcedure.input(...)
   ```

2. **JSX Layout Comments** - Never comment obvious DOM structure:

   ```tsx
   // L Bad
   {/* Header */}
   <header className="border-b">

   //  Good - semantic HTML is self-documenting
   <header className="border-b">
   ```

3. **Type Definition Comments** - TypeScript is self-documenting:

   ```typescript
   // L Bad
   // Interface for user data from API
   interface UserData {

   //  Good - interface name explains purpose
   interface UserData {
   ```

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
   const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);
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