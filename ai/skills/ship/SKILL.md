---
name: ship
description: Autonomous end-to-end feature development without user involvement. Plans, validates with agents, defends against skeptic, implements, refines, delivers, and compounds learnings. Use when building a feature hands-free, implementing from a ticket, or want fully autonomous development.
argument-hint: Feature description, ticket URL, or Linear issue ID
context: fork
---

# Autonomous Work

Build features end-to-end without user involvement.

## Principles

- **Do not ask the user**: Route all ambiguity to the plan-refiner agent. Accept its decision. The only user interaction is the final summary.
- **Ship the full request**: Build what was asked for. If the user asked for a capability, ship it — do not defer it to a later phase or propose an MVP-first approach unless the request is genuinely ambiguous.
- **Defend with evidence**: When the skeptic challenges, respond with codebase evidence. Change the plan only when the challenge is valid.
- **Codex second opinion**: Every `/ship` run gets one `codex:codex-rescue` pass on the plan before code is written.
- **Signal progress**: Emit the blockquoted status line at the end of each phase so the user can track where you are.

---

## Phase 1: Understand

**Goal**: Build deep context on what needs to be built

Feature request: $ARGUMENTS

1. If $ARGUMENTS contains a Linear issue ID or URL, fetch details via Linear MCP
2. Launch 2-3 code-explorer agents in parallel:
   - Similar existing features and their implementation patterns
   - Architecture and abstractions in the affected area
   - Conventions, patterns, and testing approaches
3. Read key files identified by the explorer agents
4. Synthesize a clear understanding of the feature and codebase context

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

1. Use the `/refine-implementation` skill for fresh-eyes multi-pass review (it runs `/simplify` and optionally `/codex:adversarial-review` internally)
2. When `/refine-implementation` surfaces escalations via AskUserQuestion, decide autonomously: fix genuine issues, skip cosmetic preferences
3. After refinement, run linters/formatters again to catch anything introduced

> Code polished.

---

## Phase 7: Deliver

**Goal**: Get the code committed and PR opened

1. Run `git status` — clean up any leftover plan files, temp files, or unintended changes
2. Use `/commit` to create the commit
3. Use `/create-pr` to open the PR. Pass the full problem statement and plan context so the skill does not need to ask the user for clarification.
4. Monitor CI via `gh pr checks` until all checks complete. If CI fails with a code issue, diagnose, fix, re-commit, and re-push. If CI fails with infrastructure/flaky issues (timeouts, Docker cache), note it in the summary and move on.
5. Check for auto-review bot comments (`gh pr view --comments`). Address code suggestions; ignore assignment/label bots and style nits that conflict with project conventions.

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

**Goal**: Make the next unit of work easier than this one

Extract reusable lessons — not a record of what was built (the commit/PR covers that).

1. **Review friction**: What slowed this session down? Missed codebase requirement, bad agent advice, non-obvious test failure?
2. **Check CLAUDE.md for staleness**: New patterns introduced, existing guidance now wrong, or a guardrail that would have prevented a mistake?
3. **Update if warranted**: Fix CLAUDE.md, workflow skills, or memory as appropriate.
4. **Skip if nothing to compound**: Most sessions produce no updates. Don't manufacture insights.
