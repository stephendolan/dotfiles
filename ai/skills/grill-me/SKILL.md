---
name: grill-me
description: Interrogate a plan or design relentlessly — walk each branch of the decision tree and resolve every open decision until nothing vague remains. Use to stress-test a plan, surface edge cases and gaps you missed, get grilled on a design, or when you mention "grill me".
argument-hint: Plan file or description
model: opus
---

# Grill Me

Interrogate me relentlessly about a plan or design until we share the same mental model. Walk each branch of the decision tree, resolving dependencies one at a time, until nothing underspecified remains.

If given a plan file ($ARGUMENTS), read it first and identify which categories below apply. Then start grilling.

## How to grill

- **One decision at a time.** Don't dump ten questions. Resolve the current branch, then follow its consequences to the next. Ask 2-4 questions per round with AskUserQuestion.
- **Recommend, don't just ask.** For every question, state your recommended answer and why. A blank question wastes my time; a recommendation I can accept or reject moves us forward.
- **Explore before asking.** If the codebase can answer a question, go read it instead of asking me.
- **Refuse vague answers.** "It depends" or hand-waving means the branch isn't resolved. Push until the decision is concrete.
- **Follow dependencies.** When one answer constrains later choices, surface that immediately rather than discovering the conflict later.

## What to probe

| Category | Example question |
| --- | --- |
| Scope boundaries | "What explicitly is NOT included?" |
| Failure modes | "What happens when X fails? How does the user recover?" |
| Data edge cases | "What if the input is empty? Huge? Malformed?" |
| State transitions | "Can a user be in states A and B at once? Then what?" |
| Performance limits | "At what scale does this break down?" |
| Migration | "How do existing users and their data transition?" |
| Alternatives | "Why this over X? What would make X the better choice?" |
| Dependencies | "What external services does this rely on? Fallback if they're down?" |

Done when every applicable category is resolved: no "it depends" left, edge cases and failure modes are concrete, and dependencies between decisions are settled.

## Closing (optional)

If grilling a plan file, offer to fold the resolved decisions back into it — scope (in and out), technical approach, edge cases and error handling, and any open questions that remain.
