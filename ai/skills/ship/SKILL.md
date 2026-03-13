---
name: ship
description: Autonomous end-to-end feature development without user involvement. Plans, validates with agents, defends against skeptic, implements, simplifies, and refines. Use when building a feature hands-free, implementing from a ticket, or want fully autonomous development. Covers planning, architecture review, implementation, and code quality.
argument-hint: Feature description, ticket URL, or Linear issue ID
context: fork
---

# Autonomous Work

Build features end-to-end without user involvement. Route all decisions through the plan-refiner agent instead of asking the user.

## Philosophy

Autonomy requires conviction. When agents disagree, gather evidence and make a call rather than deferring. The plan-refiner is your decision-maker of last resort—not the user. The only user interaction is the final summary.

## Principles

- **Route decisions to plan-refiner**: When you face ambiguity, launch the plan-refiner with the specific question and context. Accept its decision.
- **Defend with evidence**: When the skeptic challenges, respond with codebase evidence and reasoning. Change the plan only when the challenge is genuinely valid.
- **Fresh perspectives catch blind spots**: Specialized agents review from angles you'd miss after building context.

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

---

## Phase 3: Refine

**Goal**: Validate the plan through expert review

1. Launch plan-refiner and code-architect agents in parallel:
   - **plan-refiner**: Evaluate for elegance, over-engineering, and maintainability. Make decisions autonomously—you have final authority on approach.
   - **code-architect**: Validate architecture choices against codebase patterns. Provide a decisive blueprint, not multiple options.
2. Incorporate feedback from both agents
3. If either agent suggests significant changes, update the plan and re-run the other to confirm alignment
4. The plan is ready when both agents approve or their feedback has been incorporated

---

## Phase 4: Defend

**Goal**: Stress-test the plan against adversarial scrutiny

1. Launch the skeptic agent with the full plan and codebase context
2. Handle the skeptic's verdict:
   - **APPROVED**: Proceed to implementation
   - **CONDITIONALLY_APPROVED**: Address the conditions, then proceed
   - **REJECTED**: Address each challenge with evidence and reasoning, then re-submit
3. If challenges remain after your response, launch the plan-refiner to arbitrate between the plan, the skeptic's challenges, and your responses. The plan-refiner's call is final.
4. Maximum 2 rounds with the skeptic. After that, the plan-refiner decides.

---

## Phase 5: Implement

**Goal**: Build the feature

1. Use the `compound-engineering:workflows:work` skill with the full validated plan as context

---

## Phase 6: Simplify

**Goal**: Remove unnecessary complexity

1. Use the `/simplify` command to review for code reuse, quality, and efficiency

---

## Phase 7: Polish

**Goal**: Multi-pass quality review

1. Use the `/refine-implementation` skill for fresh-eyes review
2. Make decisions autonomously on all escalations: fix genuine issues, skip cosmetic preferences
3. Run up to 2 refinement passes

---

## Phase 8: Finalize

**Goal**: Summarize what was built

1. Review the final state with `git diff`
2. Present a summary:
   - What was built
   - Key architectural decisions
   - Files created/modified
   - How the plan evolved through agent review
   - Remaining considerations or follow-up work

---

## Phase 9: Compound

**Goal**: Make the next unit of work easier than this one

After shipping, reflect on the session and update the project's working knowledge. This is not about documenting what was built (the commit/PR does that) — it's about extracting **reusable lessons** that prevent future mistakes or speed up future work.

1. **Review friction**: What slowed this session down? Did the plan miss something the codebase required? Did an agent give bad advice? Did a test fail for a non-obvious reason? Did the auto-review catch something that should have been caught earlier?

2. **Check CLAUDE.md for staleness**: Read the project CLAUDE.md. Does anything need updating based on what was just built? Common triggers:
   - New architectural patterns introduced (e.g., new table, new channel, new investigator type)
   - Existing guidance that's now wrong or incomplete
   - A guardrail that would have prevented a mistake made during this session

3. **Update if warranted**: If something concrete should change, update it now:
   - **CLAUDE.md**: Add/update project conventions, implementation checklist items, or architecture docs
   - **Workflow skills**: If a phase was missing or a step was consistently wrong, update the skill
   - **Memory**: Save non-obvious learnings (user preferences, external system quirks, debugging tips) that don't belong in CLAUDE.md

4. **Skip if nothing to compound**: Most sessions won't produce updates. That's fine — only compound when there's a genuine lesson. Don't manufacture insights.

**What to compound (examples):**
- "The analytics investigator can't use `groups` table with aggregates" → CLAUDE.md checklist or skill update
- "User prefers terse PR descriptions" → memory
- "New HelpScout channel added, must update all channel-aware code paths" → CLAUDE.md architecture section

**What NOT to compound:**
- What was built (that's the commit message / PR description)
- How a specific bug was fixed (that's the code diff)
- Anything already in CLAUDE.md or derivable from the codebase
