---
name: improve-codebase-architecture
description: Find and develop evidence-backed opportunities to deepen a codebase.
---

# Improve Codebase Architecture

Find deepening opportunities: concentrate behavior behind smaller interfaces so
callers gain leverage and maintainers gain locality.

1. Read [`LANGUAGE.md`](LANGUAGE.md), project instructions, available
   `CONTEXT.md` or `CONTEXT-MAP.md`, and relevant ADRs. Explore where one concept
   requires bouncing across shallow modules or where tests reach past an
   interface.
2. Apply the deletion test to each candidate. Present only evidence-backed
   candidates, each with files, current friction, the proposed deeper module,
   and the expected leverage, locality, and testing improvement. Mark genuine
   ADR conflicts. Finish when every candidate survives the deletion test, then
   ask which one to explore.
3. Grill the selected candidate until its interface, dependencies, invariants,
   error modes, migration, and test surface are explicit. Read
   [`CONTEXT-FORMAT.md`](CONTEXT-FORMAT.md) only when domain language changes;
   read [`ADR-FORMAT.md`](ADR-FORMAT.md) only when a durable, surprising
   trade-off should be recorded.
4. When comparing alternative interfaces, read [`DEEPENING.md`](DEEPENING.md)
   and follow [`INTERFACE-DESIGN.md`](INTERFACE-DESIGN.md). Finish with one
   recommended design and its trade-offs, rather than an unranked menu.
