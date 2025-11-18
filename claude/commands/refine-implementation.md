Iteratively refine current changes using parallel code-refiner agents, with plan-refiner validation between iterations.

## Process

### 1. Understand Current State

Run in parallel:

- `git status`
- `git diff`
- `git diff --staged`

### 2. Refine (Max 3 Iterations)

Each iteration:

**Identify areas** - Group changes by functional area (API, UI, database, tests, etc). Stop if nothing to refine.

**Launch code-refiner agents in parallel** - One per area with:

- Context from git diff
- Instructions to proactively edit code
- Focus: simplicity, remove over-engineering, self-documenting code

**Validate with plan-refiner** - Plan-refiner has final authority:

- Are changes valuable?
- Is functionality preserved?
- Can spawn code-refiners to undo over-simplifications
- Continue or stop?

**Stop if**:

- Plan-refiner says stop
- No changes made
- 3 iterations reached

### 3. Report Results

Summary across all iterations:

- Iterations completed
- Files modified
- Lines removed
- Key improvements
- Trade-offs made

## Guardrails

- Max 3 iterations
- Plan-refiner gates each iteration
- Parallel execution within iterations
- Preserve functionality always

## Philosophy

Ship simple, maintainable code. Remove complexity, over-engineering, and comment noise. Plan-refiner prevents over-simplification.
