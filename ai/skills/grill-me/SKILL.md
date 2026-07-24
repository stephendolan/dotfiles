---
name: grill-me
description: Relentless interrogation of a plan until its decisions are explicit.
argument-hint: Plan file or description
disable-model-invocation: true
---

# Grill Me

Read the supplied plan and explore the codebase before asking anything the
repository can answer.

Grill one decision branch at a time. Ask two to four connected questions per
round; recommend an answer and explain its consequence for each. Follow every
answer into the constraints it creates, and press vague answers into concrete
choices.

Probe only applicable branches: scope, failure and recovery, data and state
edges, scale, migration, dependencies, alternatives, and external side effects.

Finish when every applicable branch has an explicit decision, dependencies do
not conflict, and the remaining unknowns are genuinely unknowable. If the input
was a plan file, offer to fold the decisions back into it.
