---
name: no-comments
description: Run Comment Sicko over a scoped diff, adjudicate its deletions, fix accepted structural findings, and offer enforceable replacements for comment-only constraints.
disable-model-invocation: true
---

# No comments

Use the caller's files or diff. Otherwise use the current diff against the base
branch, including the working tree. Preserve unrelated work.

1. Dispatch the custom `comment-sicko` agent with the scope and no restatement
   of its policy. If that role is unavailable, load
   `../../agents/comment-sicko.md` into a fresh-context reviewer with comment-only
   write scope. Finish when its report and diff are available.
2. Adjudicate every deletion and finding against the scoped code. Restore only
   comments with exact proof that they meet Comment Sicko's keep list. Reject
   application-code edits, scope escapes, invented claims, and misclassified
   suppressions. Audit scoped lint and type suppressions the reviewer missed.
3. Fix accepted `MUST KILL` findings at their root with the smallest
   behavior-preserving change. Prefer deleting dead paths, using the real API,
   strengthening a type, naming an invariant, or moving ownership to the
   canonical module. Leave out-of-scope causes open and explicit.
4. For a surviving comment that claims a constraint, offer the cheapest
   enforceable replacement: a type, test, assertion, lint, or CI check. Encode
   it only when the caller already authorized implementation or approves the
   offer; retain the comment until the replacement exists.
5. Run focused checks for changed code and re-read the final diff. Finish when
   every scoped comment and suppression is deleted, proven, structurally
   replaced, or reported open.

Report the deletion count, restored comments, structural fixes, encoded
constraints, verification, and open work.
