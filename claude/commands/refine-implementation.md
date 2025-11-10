Examine the current changes in the git working tree and coordinate parallel code-refiner agents to ensure a robust, simple, elegant, maintainable, and minimal implementation.

Follow these steps:

1. **Analyze Current Changes**
   - Run `git status` to see modified, staged, and untracked files
   - Run `git diff` to examine the actual changes in the working tree
   - Run `git diff --staged` to see staged changes if any

2. **Identify Focus Areas**
   - Analyze the changes to identify distinct areas of functionality, core components, or logical groupings
   - Group related changes together (e.g., API layer, UI components, database layer, business logic, tests, configuration)
   - Determine the minimal set of distinct areas that need refinement

3. **Coordinate Parallel Refinement**
   - For each identified area, launch a code-refiner agent in parallel
   - Each agent should focus on their specific area with the mandate to:
     - Reduce unnecessary complexity
     - Improve code clarity and maintainability
     - Remove redundant or excessive documentation
     - Ensure adherence to project conventions
     - Simplify logic without changing behavior
     - Eliminate any over-engineering

4. **Agent Instructions**
   - Provide each code-refiner agent with:
     - The specific files or components they should review
     - Context about what changes were made and why
     - Instructions to proactively refine the code without asking for permission
     - Focus on simplicity, elegance, and minimal viable implementation

5. **Synthesis**
   - After all agents complete, review their recommendations
   - Identify any conflicts or overlapping changes
   - Provide a summary of refinements made

Remember: The goal is to ship simple, maintainable code that solves the problem without unnecessary complexity. Be aggressive about removing complexity, reducing comment noise, and ensuring the implementation is as minimal as possible while remaining robust.
