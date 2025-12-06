Spawn `code-refiner` to review recent changes for simplification opportunities.

## Workflow

1. **Commit current work** - Create a WIP baseline to compare against
2. **Spawn code-refiner** - Launch with minimal context for fresh perspective
3. **Review changes** - Accept or reject refiner's suggestions
4. **Commit properly** - Amend the WIP with a real commit message via `committer`

## Step 1: Commit Baseline

```bash
git add -A && git commit -m "wip: checkpoint before refinement"
```

Before spawning, note for yourself: What constraints matter? What complexity is intentional? Keep this ready for Step 3.

## Step 2: Spawn Refiner

Launch `code-refiner` with this prompt:

> Review the recent changes and apply refinement principles. Look for over-engineering, unnecessary abstraction, and opportunities for simplification.

## Step 3: Review and Resolve

Check what changed:

```bash
git diff HEAD~1
```

Then choose:

- **Accept**: Keep refiner's improvements
- **Reject**: Revert to baseline (`git reset HEAD~1`) and provide constraints to refiner for second pass
- **Partial**: Revert specific files (`git checkout HEAD~1 -- path/to/file`), keep others

## Step 4: Commit

Launch the `committer` agent to amend the WIP checkpoint into a proper commit. The message should describe what the code does, not how it was developed.

**Important**: Do not skip refinement because changes seem "too simple." You cannot objectively assess code you just wrote. Always spawn the refiner.
