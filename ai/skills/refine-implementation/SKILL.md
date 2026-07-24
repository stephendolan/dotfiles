---
name: refine-implementation
description: Fresh-eyes refinement of a completed implementation.
disable-model-invocation: true
---

# Refine Implementation

Refine the current diff before delivery. Preserve the intended behavior and
leave unrelated work untouched.

1. Reconstruct intent from the conversation, repository instructions, status,
   diff, branch commits, and PR context. Finish when every changed file is
   accounted for and unrelated dirty files are identified.
2. Review the diff proportionally for correctness, error propagation, state and
   lifecycle mistakes, missing edge coverage, convention drift, dead code, and
   accidental complexity. Use a fresh-context reviewer when risk or uncertainty
   warrants independence. Verify every candidate finding in the code; discard
   speculative or taste-only feedback.
3. Fix concrete, high-confidence issues within scope. Run the focused tests,
   type checks, linters, or builds that exercise the changed behavior.
4. Re-read the final diff. Finish when no concrete issue remains, or report the
   exact unresolved blocker and evidence.

Lead the result with the outcome. Summarize material improvements and
verification; when no change was warranted, say that no concrete issue was
found.
