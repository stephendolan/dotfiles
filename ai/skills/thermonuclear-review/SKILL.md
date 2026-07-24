---
name: thermonuclear-review
description: Relentless structural maintainability review of a code change.
disable-model-invocation: true
---

# Thermonuclear Review

Apply a relentless structural lens to the current diff. Ground every finding in
changed code and propose a simpler, behavior-preserving shape. A clean pass is a
valid result.

Review each meaningful change for:

- **Code judo:** delete concepts, branches, modes, helpers, or layers instead of
  rearranging their complexity.
- **Spaghetti growth:** keep feature checks and edge cases out of unrelated,
  already-busy flows.
- **Depth and ownership:** put logic in its canonical module; reuse the existing
  seam or helper; remove wrappers that add interface without leverage.
- **Explicit contracts:** replace cast-heavy, nullable, loosely shaped, or
  fallback-driven control flow with the real invariant when that makes the code
  simpler.
- **Healthy decomposition:** treat a PR pushing a file from below 1,000 lines to
  above 1,000 as a strong smell unless cohesion clearly justifies it.
- **Coherent orchestration:** simplify avoidable sequencing and partial updates
  when independence or atomicity is evident.

Prioritize the few highest-conviction structural wins. When asked to improve the
implementation, make only those clear wins and rerun the checks that exercise
the affected behavior.
