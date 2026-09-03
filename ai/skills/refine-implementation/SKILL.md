---
name: refine-implementation
description: Reviews the complete final diff through applicable correctness, structural, blast-radius, and comment lenses. Use as the final gate before delivery.
---

# Refine Implementation

Refinement is a final-state gate before delivery. Preserve intended behavior
and unrelated work.

1. First establish the merge base and unrelated worktree changes. Capture the
   complete change set from that base through branch commits and staged,
   unstaged, and untracked work; reconstruct intent from the conversation,
   repository instructions, and PR context. Finish when every changed file is
   accounted for as part of the implementation or unrelated work.
2. For a multi-boundary diff, map every changed boundary—UI/browser,
   HTTP/controller, domain/persistence, job/lifecycle, or external API—to its
   behavior proof. Review every change for correctness, error propagation, dead
   code, convention drift, and missing edge coverage. Verify each candidate
   finding in code; discard speculative or taste-only feedback.
3. Select only the lenses whose trigger is present. Selecting none is valid.
   - **Structure:** ownership, abstraction, domain or type modeling, mutable
     state, lifecycle, branch or handler reachability, concurrency,
     orchestration, or growing complexity. Read
     [`references/structural-review.md`](references/structural-review.md).
   - **Blast radius:** public contracts, persistence, wire formats, generated
     code, browser wiring, external APIs, downstream consumers, cross-language
     boundaries, or timing. Read
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
5. Recompute status and the complete merge-base diff after all fixes, then
   review that final state as a whole. Any subsequent code change invalidates
   refinement; rerun the applicable review and affected checks before delivery.
   Finish when no concrete issue remains, or report the exact open issue and
   evidence.

Lead the result with the outcome. Summarize material improvements and
verification; when no change was warranted, say that no concrete issue was
found.
