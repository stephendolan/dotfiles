---
name: counselors
description: Get parallel second opinions from Claude and Codex with the Counselors CLI. Use when you want an external review, architecture feedback, or a multi-agent sanity check on a codebase change.
argument-hint: What to review or investigate
context: fork
---

# Counselors

Use the Counselors CLI to fan out one review request to the configured external agents and synthesize the results.

This dotfiles setup intentionally keeps the default Counselors config small: `claude-opus` and `codex-xhigh` only.

## Principles

- Gather enough context to aim the review, but do not paste entire files into the prompt.
- Prefer `@path/to/file` references over large inline snippets.
- Default to `run` for a quick second opinion.
- Use `loop` only when the user wants iterative analysis or a preset workflow.
- Treat the external reports as input. You still own the final synthesis.

## Best Entry Points

- `/ship`: always review the implementation plan once before building; optionally review the final diff too
- `/refine-implementation`: run one external pass after local refinements have mostly converged
- `/examine-architecture`: challenge the top architectural findings and proposed fixes

## Process

### 1. Check readiness

Run:

```bash
counselors doctor
```

If Counselors is missing or the configured tools are unavailable, stop and tell the user what is missing.

If `$ARGUMENTS` is empty, ask the user what they want reviewed.

### 2. Gather context

Parse `$ARGUMENTS`, then collect only the context that helps the external agents start in the right place:

- Files or directories named in the request
- `git diff HEAD` and `git diff --staged`
- A few related files found with `rg`

Keep the file set tight. External agents can read the repo and run git commands themselves.

### 3. Pick dispatch mode

Use:

- `counselors run` for a normal review pass
- `counselors loop` when the user wants a deeper iterative hunt
- `counselors loop --list-presets` if the user asks for a preset or names one

Use inline `loop` prompts only for short focus strings. If you already assembled a precise prompt, prefer `-f`.

### 4. Confirm the participating agents

Run:

```bash
counselors ls
counselors groups ls
```

In this dotfiles setup, the default is usually both configured tools: `claude-opus` and `codex-xhigh`.

- If the user did not narrow the set, state the exact tools you will use and continue.
- If the user asks for a subset, honor it.
- If the config later grows beyond these two tools, print the full configured list and ask the user which IDs or groups to use.

Before dispatch, echo the exact selection back to the user.

### 5. Assemble the review prompt

For `run` and file-based `loop`, build a short prompt like this:

```markdown
# Review Request

## Question
[User request]

## Files to Review
@path/to/file
@path/to/other-file

## Recent Changes
[Brief note about the relevant diff or branch context]

## Related Code
@path/to/related-file

## Instructions
Provide an independent review.
- Read the referenced files
- Follow the relevant code paths
- Identify concrete risks, regressions, blind spots, or better alternatives
- Cite file paths for findings
```

Do not inline big diffs unless a tiny snippet is essential to frame the issue.

### 6. Dispatch

For a single-shot run:

```bash
cat <<'PROMPT' | counselors mkdir --json
[assembled prompt]
PROMPT

counselors run -f <promptFilePath> --tools claude-opus,codex-xhigh --json
```

For iterative review with a prepared prompt:

```bash
counselors loop -f <promptFilePath> --tools claude-opus,codex-xhigh --json
```

For preset or inline loop mode, pass the short focus string directly instead of writing a prompt file.

Use a long enough command timeout for dispatches. Counselors runs can take 10 minutes or more.

### 7. Read the results

Parse the JSON manifest, then:

- Read each non-empty `outputFile`
- Check `stderrFile` for failed or empty runs
- Skip tools that produced no useful output, but note the failure

### 8. Synthesize

Present a concise synthesis with:

- Agents consulted
- Consensus
- Disagreements
- Key risks
- Recommendation
- Output directory

The external reports are saved on disk. Summarize the conclusions instead of pasting full reports back to the user.

### 9. Take action

After presenting the synthesis, ask whether the user wants to address any of the findings. If they do, plan the implementation before editing code.

## Failure cases

- `counselors` missing: tell the user to install it through dotfiles or `brew install counselors`
- No configured tools: point them to `~/.config/counselors/config.json`
- One tool fails: continue with the other and note the failure
- Both tools fail: show the relevant stderr output and stop
