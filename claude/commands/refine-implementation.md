Iteratively refine uncommitted changes using specialized refiner agents.

## Process

### 1. Check for Changes

```bash
git status && git diff && git diff --staged
```

Stop if working tree is clean.

### 2. Refine (Max 3 Iterations)

Each iteration:

1. **Group changes by functional area** (API, UI, database, tests, documentation)

2. **Launch refiner agents in parallel** (one per area):
   - Documentation (`*.md`) → `documentation-refiner`
   - Code (`*.ts`, `*.py`, etc.) → `code-refiner`

3. **Validate with `plan-refiner`**:
   - Reviews all changes from this iteration
   - Decides: continue, stop, or spawn refiners to undo over-simplifications
   - Has final authority

Stop when plan-refiner approves OR no changes made OR 3 iterations completed.

### 3. Report

- Iterations completed
- Files modified
- Lines removed
- Key improvements

## Constraints

- Maximum 3 iterations
- Plan-refiner validates each iteration
- Preserve functionality always
