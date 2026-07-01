---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
argument-hint: Plan file or description
model: opus
---

# Grill Me

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one.

## How to grill

- **One decision at a time.** Don't dump ten questions. Resolve the current branch, then follow its consequences to the next.
- **Recommend, don't just ask.** For every question, state your recommended answer and why. A blank question wastes my time; a recommendation I can accept or reject moves us forward.
- **Explore before asking.** If the codebase can answer a question, go read it instead of asking me.
- **Refuse vague answers.** "It depends" or hand-waving means the branch isn't resolved. Push until the decision is concrete.
- **Follow dependencies.** When one answer constrains later choices, surface that immediately rather than discovering the conflict later.

Done when every branch is resolved and we share the same mental model of the plan.
