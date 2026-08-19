# Blast radius

Trace effects that direct callers do not reveal: persisted data, wire formats,
generated code, other languages, downstream consumers, teardown, and timing.

Identify the one safety fact the change depends on. Prove it as far down this
ladder as practical:

1. Point to the authoritative code or pinned dependency source.
2. Walk the failure path and show why it cannot reach.
3. Run a focused test or script against the real code.
4. Reproduce the behavior in the running product.

State where the proof stopped. Mark the fact unproven rather than rounding up.
Report only confirmed risks and checks that cleared plausible risks.
