Evaluate implementation changes and decide whether refinement is warranted.

## Two-Phase Process

1. **Evaluate**: Review the diff yourself and assess whether refinement would add value
2. **Refine**: Spawn `code-refiner` only when evaluation reveals genuine issues

Small, focused changes rarely benefit from refinement. Evaluate first, then decide.

## Evaluation

Run `git diff` (or `git diff main...HEAD` for clean trees) and assess:

| Factor | Consider |
|--------|----------|
| Size | Under 30 lines? Likely skip. Over 50 lines? Likely refine. |
| Complexity | Multiple abstraction layers for simple operations? |
| Clarity | Would another developer understand this immediately? |
| Idioms | Does it follow language conventions? |

### Skip Refinement

- Changes under 30 lines with straightforward logic
- Code follows existing patterns in the codebase
- Uses idiomatic language constructs
- No multi-step conditionals that could be simplified

### Run Refinement

- Changes over 50 lines
- Multi-level nesting or indirection for simple operations
- Comments explaining WHAT instead of self-documenting code
- Language idiom violations (e.g., verbose loops instead of map/filter)

## Spawning Refiners

When spawning `code-refiner`, include context so it preserves intentional decisions:

- Problem being solved: What requirement drove this change?
- Why this approach: What constraints led to this implementation?
- What to preserve: Non-obvious decisions that should not be simplified away

## Output

State your decision before taking action:

When skipping:
> No refinement needed. [Rationale: e.g., "15-line change, idiomatic code, follows existing patterns."]

When refining:
> Running refinement. [Rationale: e.g., "60 lines with nested conditionals that could be flattened."]

After refinement completes, summarize what changed.
