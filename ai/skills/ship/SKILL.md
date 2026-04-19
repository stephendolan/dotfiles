---
name: ship
description: Autonomous end-to-end feature development without user involvement. Plans, validates with agents, defends against skeptic, implements, refines, delivers, and compounds learnings. Use when building a feature hands-free, implementing from a ticket, or want fully autonomous development.
argument-hint: Feature description, ticket URL, Linear issue ID, or GitHub issue # (e.g. `#128`)
context: fork
---

# Autonomous Work

Build features end-to-end without user involvement.

## Invocation modes

- **Interactive (default):** User invoked `/ship …` directly. Emit the blockquoted status lines so the user can track phase progress. Phase 9 Compound runs. Final summary is for the user.
- **Sub-agent:** Invoked from another skill/agent (e.g. `pipeline:build` dispatching `/ship #N` per issue in a wave). Skip status lines — the parent orchestrates reporting. Skip Phase 9 Compound — the parent batch owns cross-issue lessons. Return a terse report. Don't call `AskUserQuestion` at any point; route ambiguity to the plan-refiner or fail loudly.

Detect sub-agent mode when any of: invoked via the Agent tool (not a direct user slash invocation), the prompt explicitly says "do not ask the user", or a parent skill passed in a worktree path.

## Project overlays

Project-specific gates, path-sensitivity lists, and deploy checks belong in the project repo (`.claude/skills/` or `CLAUDE.md`), not here. Examples:

- `CLAUDE.md` "required build gates" (e.g. `pnpm --filter @pkg/api run build`) → Phase 6/7 picks them up automatically.
- Project-level skill like `pipeline:deploy-check` → Phase 7 invokes it optionally after merge.
- `CLAUDE.md` "sensitive paths" list → Phase 4 path-sensitivity guard consults it.

Never hardcode specific project paths, commands, or services in this file. This skill runs across every repo.

## Principles

- **Do not ask the user**: Route all ambiguity to the plan-refiner agent. Accept its decision. The only user interaction is the final summary (interactive mode only).
- **Ship the full request**: Build what was asked for. If the user asked for a capability, ship it — do not defer it to a later phase or propose an MVP-first approach unless the request is genuinely ambiguous.
- **Defend with evidence**: When the skeptic challenges, respond with codebase evidence. Change the plan only when the challenge is valid.
- **Codex second opinion**: Every `/ship` run gets one `codex:codex-rescue` pass on the plan before code is written.
- **UI work uses `/ui`**: If the feature touches frontend or UI, follow the `/ui` skill for exploration, building, and refinement throughout the relevant phases.
- **Signal progress**: In interactive mode, emit the blockquoted status line at the end of each phase. Skip in sub-agent mode.
- **Worktree cwd invariant**: If a worktree path was provided (sub-agent mode or `context: fork` gave you one), start every phase with `cd <worktree> && pwd` and assert pwd matches. Drift has silently corrupted prior runs; don't work around with absolute paths.
- **Path sensitivity over size**: A 5-line change to auth, migrations, or shared schemas can hide subtle bugs that a 500-line UI change can't. Treat any change touching auth/session/OAuth, migrations, state machines, shared type/schema packages, or middleware as sensitive — regardless of LOC. Check `CLAUDE.md` for a project-specific "sensitive paths" list that extends this default. Sensitive paths always get full Phase 4 skeptic review.

---

## Phase 1: Understand

**Goal**: Build deep context on what needs to be built

Feature request: $ARGUMENTS

1. Classify the input and fetch appropriate context:
   - **Linear issue ID or URL** → fetch details via Linear MCP
   - **GitHub issue reference** (`#NNN`, `owner/repo#NNN`, or a github.com issue URL) → `gh issue view <n> --json title,body,labels,comments`. If the body already contains a `## Plan` or `## Implementation Plan` section with file paths, carry it forward and have Phase 2 refine rather than regenerate it.
   - **Plain feature description** → use as-is.
2. Launch 2-3 code-explorer agents in parallel:
   - Similar existing features and their implementation patterns
   - Architecture and abstractions in the affected area
   - Conventions, patterns, and testing approaches
3. Read key files identified by the explorer agents, including the project's root `CLAUDE.md` (and any `packages/*/CLAUDE.md` in the changed areas).
4. Synthesize a clear understanding of the feature and codebase context.

> Context gathered.

---

## Phase 2: Plan

**Goal**: Create a concrete implementation plan

1. Create a detailed implementation plan covering:
   - Problem statement and goals
   - Architecture approach with rationale
   - Files to create/modify with specific changes
   - Build sequence (phased implementation steps)
   - Edge cases and error handling strategy
   - Testing approach
2. Write the plan to a temporary file for agent review

> Plan drafted.

---

## Phase 3: Refine

**Goal**: Validate the plan through expert review

1. Launch plan-refiner and code-architect agents in parallel:
   - **plan-refiner**: Evaluate for elegance, over-engineering, and maintainability. Make decisions autonomously—you have final authority on approach.
   - **code-architect**: Validate architecture choices against codebase patterns. Provide a decisive blueprint, not multiple options.
2. Incorporate feedback from both agents
3. Launch the `codex:codex-rescue` agent to review the plan for blind spots, regressions, missing constraints, and simpler alternatives
4. If agents or Codex suggest significant changes, update the plan and re-run the plan-refiner to settle tradeoffs
5. The plan is ready when the internal reviewers are aligned and any valid Codex feedback has been incorporated

> Plan refined.

---

## Phase 4: Defend

**Goal**: Stress-test the plan against adversarial scrutiny

1. Launch the skeptic agent with the full plan and codebase context. Direct the skeptic to challenge:
   - Whether this solves the root cause or just a symptom
   - Whether any features the user asked for are being deferred or phased unnecessarily
   - Whether legacy compat or backward-compat is being added without justification
   - Whether an upstream fix would be better than a workaround
   - Whether the scope matches the actual request (not over-engineered, not under-engineered)
2. Handle the skeptic's verdict:
   - **APPROVED**: Proceed to implementation
   - **CONDITIONALLY_APPROVED**: Address the conditions, then proceed
   - **REJECTED**: Address each challenge with evidence and reasoning, then re-submit
3. If challenges remain after your response, launch the plan-refiner to arbitrate between the plan, the skeptic's challenges, and your responses. The plan-refiner's call is final.
4. Maximum 2 rounds with the skeptic. After that, the plan-refiner decides.

> Plan defended.

---

## Phase 5: Implement

**Goal**: Build the feature

1. For each step in the plan's build sequence:
   - Grep for similar patterns in the codebase and follow them
   - Implement the step
   - Run relevant tests after each significant change — fix failures before moving on
2. After all steps complete, run the project's linters and formatters. Fix all errors and warnings.

> Implementation done.

---

## Phase 6: Polish

**Goal**: Remove unnecessary complexity and ensure quality

1. Use the `/refine-implementation` skill for fresh-eyes multi-pass review (it runs `/simplify` and optionally `/codex:adversarial-review` internally). In sub-agent mode, invoke it in its own sub-agent mode so it skips AskUserQuestion and returns a terse report when clean.
2. When `/refine-implementation` surfaces escalations, decide autonomously: fix genuine issues, skip cosmetic preferences.
3. Run linters/formatters again to catch anything introduced.
4. **Refine gate (incremental).** Run typecheck and any project-declared prod-build commands (see `CLAUDE.md` for the canonical list; e.g., a monorepo with a stricter prod tsconfig than its test tsconfig needs both). For tests, run only what the diff touches if the test runner supports it (Vitest: `--changed <base-branch>`). The full suite is Phase 7's job — this gate just proves "my diff doesn't obviously break." This saves real time across multi-issue batch runs.

> Code polished.

---

## Phase 7: Deliver

**Goal**: Get the code committed, PR opened, and (if authorized) merged.

1. Run `git status` — clean up any leftover plan files, temp files, or unintended changes.
2. Full-suite gate: run typecheck + tests + any project-declared prod-build (from `CLAUDE.md`). Rebase onto the base branch first (`git fetch origin <base> && git rebase origin/<base>`) so you're testing against current trunk.
3. **Flake sentinel.** If a test that was green in Phase 6 now fails after rebase: don't retry blindly. Re-run just the failing test file in isolation twice. Two passes in isolation = flake (test-ordering, shared DB state); note in the PR body and continue. One persistent failure = real regression pulled in by the rebase; identify the likely commit via `git log --oneline <base-sha>..origin/<base>` and escalate.
4. Use `/commit` to create the commit.
5. Use `/create-pr` to open the PR. Pass the full problem statement and plan context so the skill does not need to ask the user for clarification. If the input was a GitHub issue #, include `Closes #N` in the PR body.
6. **CI handling** — branch on whether the repo has CI:
   - `.github/workflows/` exists with non-Dependabot workflows → monitor via `gh pr checks` until all checks complete. Code failure → diagnose, fix, re-commit, re-push. Infra/flake failure → note in summary and move on.
   - No CI workflows → the local gate IS the merge gate. Green locally = ready to merge. Don't wait.
7. Check for auto-review bot comments (`gh pr view --comments`). Address code suggestions; ignore assignment/label bots and style nits that conflict with project conventions.
8. **Merge** — if a merge-on-green policy applies (e.g. invoked from a pipeline, or the repo's `CLAUDE.md` declares one), squash-merge via `gh pr merge <pr> --squash --delete-branch`. Otherwise leave the PR open for human review.
9. **Optional deploy check** — if a project-level `pipeline:deploy-check` skill exists, invoke it now to poll post-merge deploy status while context is warm.

> PR submitted.

---

## Phase 8: Finalize

**Goal**: Summarize what was built

1. Review the final state with `git diff main...HEAD`
2. Present a summary:
   - What was built
   - Key architectural decisions
   - Files created/modified
   - How the plan evolved through agent review
   - PR URL
   - Remaining considerations or follow-up work

---

## Phase 9: Compound

**Skip in sub-agent mode** — the parent batch owns cross-issue lessons and will compound at its own wrap-up.

**Goal** (interactive only): Make the next unit of work easier than this one

Extract reusable lessons — not a record of what was built (the commit/PR covers that).

1. **Review friction**: What slowed this session down? Missed codebase requirement, bad agent advice, non-obvious test failure?
2. **Check CLAUDE.md for staleness**: New patterns introduced, existing guidance now wrong, or a guardrail that would have prevented a mistake?
3. **Update if warranted**: Fix CLAUDE.md, workflow skills, or memory as appropriate.
4. **Skip if nothing to compound**: Most sessions produce no updates. Don't manufacture insights.
