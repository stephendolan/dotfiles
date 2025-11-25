Review and refine implementation changes for elegance, maintainability, and simplicity.

## Context is Critical

**You must provide context to refiner agents about the intent behind changes.** Without this, refiners may undo intentional work.

When spawning refiner agents, always include:

- **Problem being solved**: What bug, issue, or requirement drove this change?
- **Why this approach**: What constraints or failures led to choosing this implementation?
- **What to preserve**: Any non-obvious decisions that must not be simplified away

## Scope

Determine what to review based on the current state:

- **Dirty working tree**: Review uncommitted changes (`git diff` and `git diff --staged`)
- **Clean working tree**: Review branch changes since divergence from main (`git diff main...HEAD`)
- **User-specified scope**: Honor any explicit constraints provided

## Available Agents

Use these agents in parallel where independent areas can be analyzed simultaneously:

- **`code-architect`**: Evaluates structure for brittleness, complexity, and coupling. Use to identify architectural concerns without making changes.
- **`code-refiner`**: Simplifies complexity and improves maintainability. Use to act on identified improvements.

**When spawning these agents, include the context from above in your prompt.**

## Goals

- **Simplicity**: Is there a simpler approach that achieves the same result?
- **Maintainability**: Will this be easy to understand and modify later?
- **Elegance**: Does the solution feel natural and well-structured?
- **Complexity trade-offs**: Is any added complexity justified by the benefits?

## Autonomy

Use your judgment on:

- How many passes are needed (small changes may need none, large changes may need several)
- Whether to run architect analysis before or alongside refinement
- When to stop (diminishing returns, risk of over-simplification)
- Which areas benefit from parallel vs sequential review

## Output

Summarize what was reviewed, what changed, and key decisions made.
