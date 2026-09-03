# Structural review

Apply each relevant lens. Keep only concrete findings grounded in the scoped
code.

- **Subtract first.** Delete concepts, branches, modes, helpers, compatibility
  layers, validators, and workarounds before rearranging or extending them.
- **Canonical ownership.** Put each decision and invariant in the module that
  owns it. Collapse one-caller wrappers, pass-through adapters, duplicated
  choices, and layers that do not compress complexity.
- **Reader load.** Minimize both layers to trace and mutable state to remember.
  Prefer local state, derivation, pure transforms, and interfaces that hide
  meaningful decisions.
- **Boundary discipline.** Parse and validate at external boundaries. Keep
  framework wiring mechanical, domain logic typed, and internal code free of
  redundant defensive checks.
- **Domain and type model.** Verify domain nouns such as `user`, `person`, or
  `participant` against actual association and runtime variants before using
  them in business rules. Parallel collections or flags passed together across
  layers signal a missing cohesive domain or presentation object. Replace
  synchronized booleans, loose option bags, casts, nullable fallbacks, repeated
  shape assumptions, and scattered branches with the smallest structure that
  makes the invariant explicit.
- **Lifecycle and reachability.** Trace condition and authorization branches
  from actual entry inputs. Trace custom rescue, retry, discard, and fallback
  handlers back to uncaught raise sites; if destructive transitions or cascades
  can precede them, prove their prerequisites survive. Check ordering,
  ownership, idempotency, partial updates, teardown, and concurrency. Separate
  independent state before serializing genuinely shared state.
- **Healthy decomposition.** Treat a change that pushes a file from below 1,000
  lines to above 1,000 as a strong smell unless cohesion clearly justifies it.

Prefer the few highest-conviction structural wins. A clean pass is valid.
