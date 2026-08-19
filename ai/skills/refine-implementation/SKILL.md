---
name: refine-implementation
description: Fresh-eyes refinement that routes a completed diff through only the applicable review lenses.
---

# Refine Implementation

Refine the current diff before delivery. Preserve intended behavior and
unrelated work.

1. Reconstruct intent from the conversation, repository instructions, status,
   diff, branch commits, and PR context. Establish the base branch and record
   unrelated dirty files. Finish when every changed file is accounted for.
2. Review every change for correctness, error propagation, dead code,
   convention drift, and missing edge coverage. Verify each candidate finding
   in code; discard speculative or taste-only feedback.
3. Select only the lenses whose trigger is present. Selecting none is valid.
   - **Structure:** ownership, abstraction, domain or type modeling, mutable
     state, lifecycle, concurrency, orchestration, or growing complexity. Read
     [`references/structural-review.md`](references/structural-review.md).
   - **Blast radius:** public contracts, persistence, wire formats, generated
     code, downstream consumers, cross-language boundaries, or timing. Read
     [`references/blast-radius.md`](references/blast-radius.md).
   - **Comments:** a direct request, suppression, workaround explanation, or
     comment carrying an unenforced constraint. Read and execute
     [`no-comments`](../no-comments/SKILL.md).
   - **Independent review:** high-stakes behavior or a material uncertainty the
     local review cannot resolve. Use one fresh-context reviewer over the same
     scope and adjudicate its findings.
4. Fix concrete findings at their root. Run the smallest checks that prove the
   changed behavior; exercise the real path for user-visible or integration
   changes when practical.
5. Re-read the final diff. Finish when no concrete issue remains, or report the
   exact open issue and evidence.

Lead the result with the outcome. Summarize material improvements and
verification; when no change was warranted, say that no concrete issue was
found.
