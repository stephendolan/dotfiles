# Blast radius

Trace effects that direct callers do not reveal: persisted data, wire formats,
browser wiring, external systems, generated code, other languages, downstream
consumers, teardown, and timing.

Classify external failures by product outcome—terminal, repairable, or
transient—rather than technical similarity. Trace each outcome's state
transition; repairable state preserves durable user configuration.

On initial render, measure synchronous external work under representative slow
behavior. Treat independent external content that blocks a local shell as a
lazy-boundary candidate.

Match proof to the behavior owner. Exercise browser-owned behavior through
rendered controls and actual wiring, not only hand-built transport inputs; when
practical, perturb the wiring once and confirm the test goes red.

Prove each mapped behavior or safety fact as far down this ladder as practical:

1. Point to the authoritative code or pinned dependency source.
2. Walk the failure path and show why it cannot reach.
3. Run a focused test or script against the real code.
4. Reproduce the behavior in the running product.

State where each proof stopped. Mark a fact unproven rather than rounding up.
Report only confirmed risks and checks that cleared plausible risks.
