---
name: ship
description: Runtime-neutral autonomous end-to-end feature development without user involvement. Plans, validates with specialist agents, defends against skeptic, implements, refines, delivers, and compounds learnings. Use when building a feature hands-free, implementing from a ticket, or wanting fully autonomous development in Claude, Codex, or another agent runtime.
argument-hint: Feature description, ticket URL, Linear issue ID, or GitHub issue # (e.g. `#128`)
context: fork
---

# Autonomous Ship Workflow

Build features end-to-end without user involvement.

## Invocation modes

- **Interactive (default):** The user invoked this workflow directly (for example `/ship …` in Claude or `$ship …` in Codex). Emit the blockquoted status lines so the user can track phase progress. Phase 9 Compound runs. Final summary is for the user.
- **Sub-agent:** Invoked from another skill/agent (for example a pipeline dispatching Ship per issue in a wave). Skip status lines because the parent orchestrates reporting. Skip Phase 9 Compound because the parent batch owns cross-issue lessons. Return a terse report. Do not ask the user at any point; route ambiguity to the plan-refiner or fail loudly.

Detect sub-agent mode when any of: invoked by another agent rather than a direct user command, the prompt explicitly says "do not ask the user", or a parent skill passed in a worktree path.

## Runtime model

This workflow is runtime-neutral. Treat slash-command names, Claude frontmatter,
and Codex skill names as invocation details, not as the workflow contract.

| Concept | Claude | Codex | Runtime-neutral behavior |
| --- | --- | --- | --- |
| Workflow skill | `/ship`, `/commit`, `/create-pr` | `$ship`, `$commit`, `$create-pr`, or direct skill use | Load and follow the matching `SKILL.md`. |
| Specialist agent | Agent tool with `agents/*.md` | Native generated role from `$CODEX_HOME/agents/stephendolan/` defaulting to `~/.codex/agents/stephendolan/`, or `default` subagent plus `agents/RUNTIME.md` and the requested agent markdown | Spawn when the user invoked Ship or otherwise explicitly asked for delegation; otherwise apply the role in the main thread. |
| Project instructions | `CLAUDE.md` | `AGENTS.md` plus any `CLAUDE.md` compatibility file | Read the runtime's project instruction file before planning edits. |
| Task tracking | `TodoWrite` or Task tools | `update_plan` | Keep an explicit phase/task state when the runtime has a tracker. |
| Human question | `AskUserQuestion` | direct user question or `request_user_input` when available | Avoid during Ship; use plan-refiner arbitration or fail loudly. |

When a runtime cannot launch a named specialist directly, resolve paths from
the plugin root, meaning the directory that contains both `agents/` and
`skills/`. Read `agents/RUNTIME.md` and the relevant `agents/<name>.md`, then
provide both as the role contract to the runtime's generic subagent.

Invoking Ship is an explicit request for the specialist reviews named in this
workflow. Keep delegated tasks bounded: give each specialist the goal, current
plan or diff, relevant paths/evidence, allowed write scope, and expected output
format. Do not let specialist agents delegate further unless the caller
explicitly asks for nested delegation.

Ship's review gates require fresh context. If the runtime cannot provide a
subagent, external reviewer, or comparably independent fresh-context review for
Phase 3, Phase 4, or Phase 6, stop before implementation or delivery and report
the missing capability. Applying the persona in the main thread is acceptable
for ordinary role adaptation, but it does not satisfy Ship's mandatory review
gates.

## Project overlays

Project-specific gates, path-sensitivity lists, and deploy checks belong in the
project repo (`AGENTS.md`, `CLAUDE.md`, `.claude/skills/`, `.codex/skills/`, or
the runtime's equivalent), not here. Examples:

- Project instructions declaring "required build gates" (for example `pnpm --filter @pkg/api run build`) -> Phase 6/7 picks them up automatically.
- Project-level skill like `pipeline:deploy-check` -> Phase 7 invokes it optionally after merge.
- Project instructions declaring "sensitive paths" -> Phase 4 path-sensitivity guard consults it.

Never hardcode specific project paths, commands, or services in this file. This skill runs across every repo.

## Principles

- **Do not ask the user**: Route all ambiguity to the plan-refiner agent. Accept its decision. The only user interaction is the final summary (interactive mode only).
- **Ship the full request**: Build what was asked for. If the user asked for a capability, ship it — do not defer it to a later phase or propose an MVP-first approach unless the request is genuinely ambiguous.
- **Defend with evidence**: When the skeptic challenges, respond with codebase evidence. Change the plan only when the challenge is valid.
- **Independent second opinion**: Every Ship run gets one fresh-context plan review before code is written. In Claude, use `codex:codex-rescue` when available. In Codex, use a fresh plan-oriented specialist such as `ce-adversarial-document-reviewer`, or a generic `default` reviewer loaded with the plan and relevant evidence. Use implementation-diff reviewers such as `ce-adversarial-reviewer` after code exists, not as the primary plan gate.
- **UI work uses current ui.sh skills**: If the feature touches frontend or UI, use the specific ui.sh skill that matches the work: `design`, `ideas`, `componentize`, `canonicalize-tailwind`, `add-dark-mode`, `dark-mode-image`, `make-responsive`, or `markup-from-image`. Use the agent's native prefix when invoking explicitly (for example, `/design` in Claude or `$design` in Codex).
- **Signal progress**: In interactive mode, emit the blockquoted status line at the end of each phase. Skip in sub-agent mode.
- **Worktree cwd invariant**: If a worktree path was provided (sub-agent mode or `context: fork` gave you one), start every phase with `cd <worktree> && pwd` and assert pwd matches. Drift has silently corrupted prior runs; don't work around with absolute paths.
- **Path sensitivity over size**: A 5-line change to auth, migrations, or shared schemas can hide subtle bugs that a 500-line UI change can't. Treat any change touching auth/session/OAuth, migrations, state machines, shared type/schema packages, or middleware as sensitive — regardless of LOC. Check project instructions for a project-specific "sensitive paths" list that extends this default. Sensitive paths always get full Phase 4 skeptic review.

---

## Phase 1: Understand

**Goal**: Build deep context on what needs to be built

Feature request: $ARGUMENTS

1. Classify the input and fetch appropriate context:
   - **Linear issue ID or URL** → fetch details via Linear MCP
   - **GitHub issue reference** (`#NNN`, `owner/repo#NNN`, or a github.com issue URL) → `gh issue view <n> --json title,body,labels,comments`. If the body already contains a `## Plan` or `## Implementation Plan` section with file paths, carry it forward and have Phase 2 refine rather than regenerate it.
   - **Plain feature description** → use as-is.
2. Launch 2-3 code-explorer specialist agents in parallel:
   - Similar existing features and their implementation patterns
   - Architecture and abstractions in the affected area
   - Conventions, patterns, and testing approaches
3. Read key files identified by the explorer agents, including the project's root `AGENTS.md`, `CLAUDE.md`, or runtime-equivalent instruction file, plus any package-level instruction files in the changed areas.
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
3. Run the independent second-opinion reviewer for blind spots, regressions, missing constraints, and simpler alternatives:
   - Claude: prefer `codex:codex-rescue` when available.
   - Codex: prefer `ce-adversarial-document-reviewer` for risky plans; otherwise use a fresh `default` subagent with the plan, evidence, and review criteria.
   - Other runtimes: use the closest fresh-context reviewer available.
4. If reviewers suggest significant changes, update the plan and re-run the plan-refiner to settle tradeoffs.
5. The plan is ready when the internal reviewers are aligned and any valid independent-review feedback has been incorporated.

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

1. Use the `refine-implementation` skill for fresh-eyes multi-pass review. In Claude this is `/refine-implementation`; in Codex this is `$refine-implementation` or the loaded skill. Ship requires a correctness review and an independent adversarial pass before delivery; if the runtime cannot provide both, stop and report the missing review gate. In sub-agent mode, invoke it in its own sub-agent mode so it asks no user questions and returns a terse report when clean.
2. When `refine-implementation` surfaces escalations, decide autonomously: fix genuine issues, skip cosmetic preferences.
3. **Thermonuclear maintainability gate.** Run the `thermonuclear-review` skill on the branch diff. Where `refine-implementation` and code review hunt correctness, this is the strict structural pass: abstraction quality, files crossing ~1k lines, spaghetti-condition growth, thin/leaky abstractions, and type-boundary erosion — and it is intentionally ambitious about "code judo" simplifications that delete complexity rather than rearrange it. Triage its findings autonomously: act on genuine structural problems and high-confidence simplifications that preserve behavior; skip taste-only nits. Re-run the touched tests after any restructuring. In sub-agent mode, keep the invocation terse and apply only clear wins — do not let an ambitious refactor balloon a batch item's scope.
4. Run linters/formatters again to catch anything introduced.
5. **Refine gate (incremental).** Run typecheck and any project-declared prod-build commands from the project instructions. For tests, run only what the diff touches if the test runner supports it (Vitest: `--changed <base-branch>`). The full suite is Phase 7's job — this gate just proves "my diff doesn't obviously break." This saves real time across multi-issue batch runs.

> Code polished.

---

## Phase 7: Deliver

**Goal**: Get the code committed, PR opened, and (if authorized) merged.

1. Run `git status` — clean up any leftover plan files, temp files, or unintended changes.
2. Create an explicit reviewed file allowlist for the commit. Stage only files on that allowlist. Verify `git diff --cached --name-only` exactly matches the allowlist before committing. If unrelated dirty files exist, leave them unstaged and name them in the final summary; if the intended files cannot be separated cleanly, stop.
3. Full-suite gate: run typecheck + tests + any project-declared prod-build from the project instructions. Rebase onto the base branch first (`git fetch origin <base> && git rebase origin/<base>`) so you're testing against current trunk.
4. **Flake sentinel.** If a test that was green in Phase 6 now fails after rebase: don't retry blindly. Re-run just the failing test file in isolation twice. Two passes in isolation = flake (test-ordering, shared DB state); note in the PR body and continue. One persistent failure = real regression pulled in by the rebase; identify the likely commit via `git log --oneline <base-sha>..origin/<base>` and escalate.
5. Use the `commit` skill to create the commit. Use the runtime's native invocation (`/commit`, `$commit`, or loaded skill), pass enough context that it can write a why-focused message without asking questions, and explicitly instruct it to commit staged changes only without staging additional files.
6. Use the `create-pr` skill to open the PR. Use the runtime's native invocation (`/create-pr`, `$create-pr`, or loaded skill) and pass the full problem statement and plan context so the skill does not need to ask the user for clarification. If the input was a GitHub issue #, include `Closes #N` in the PR body.
7. **CI handling** — branch on whether the repo has CI:
   - `.github/workflows/` exists with non-Dependabot workflows → monitor via `gh pr checks` until all checks complete. Code failure → diagnose, fix, re-commit, re-push. Infra/flake failure → note in summary and move on.
   - No CI workflows → the local gate IS the merge gate. Green locally = ready to merge. Don't wait.
8. Check for auto-review bot comments (`gh pr view --comments`). Address code suggestions; ignore assignment/label bots and style nits that conflict with project conventions.
9. **Merge** — if a merge-on-green policy applies (for example invoked from a pipeline, or declared by the repo's project instructions), squash-merge via `gh pr merge <pr> --squash --delete-branch`. Otherwise leave the PR open for human review.
10. **Optional deploy check** — if a project-level deploy-check skill exists, invoke it now to poll post-merge deploy status while context is warm.

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
2. **Check project instructions for staleness**: New patterns introduced, existing guidance now wrong, or a guardrail that would have prevented a mistake?
3. **Update if warranted**: Fix `AGENTS.md`, `CLAUDE.md`, workflow skills, or memory as appropriate.
4. **Skip if nothing to compound**: Most sessions produce no updates. Don't manufacture insights.
