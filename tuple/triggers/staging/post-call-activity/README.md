# post-call-activity

When a Tuple call ends, this trigger forks a detached worker that resolves the just-ended call from Capture history and runs one headless Codex (`gpt-5.6-terra`, medium reasoning) per unprocessed call. Each run reads the capture **once** and produces three outputs: metadata to Tuple (`call edit`), durable knowledge to Stephen's Obsidian knowledge base at `~/Obsidian/Notes` (following the vault's `AGENTS.md` ingest contract, committed), and the work the call put on Stephen's plate to Fortress as typed proposals he reviews and accepts.

How a firing works:

1. The `call-ended` event carries no call id, so the worker polls `tuple-staging capture list` for stored calls not yet in `~/.tuplestaging/post-call-activity/processed-calls.txt` (Capture persistence lags the event by ~1-2s). It checks the newest 5, oldest first, so a firing also catches calls earlier firings missed — near-simultaneous endings or failed runs. CLI failures stop the worker loudly; a call with no captured records times out as a no-op.
2. Everything runs detached so the serial trigger runner is never blocked. A `mkdir`-based vault lock serializes workers (stale locks stolen after 30 minutes; only the owner removes its own lock), and the unprocessed set is re-resolved after the lock is acquired so two firings never process the same call twice.
3. Each call gets a `codex exec --model gpt-5.6-terra --config 'model_reasoning_effort="medium"'` run. It starts with approved full local access so it can reach Tuple's local staging socket, loads the vault's `AGENTS.md`, and is directed to read `instructions.md` before any call access. The trigger-specific contract limits the worker to vault maintenance, `tuple-staging`, and the permission-gated Fortress proposal flow.
4. On success the call id is appended to the processed file — low-signal calls too, so they aren't reconsidered. On failure it is left out and retried by the next firing's catch-up.

The Fortress step is best-effort and permission-gated: the connector is a `requires_permission` worker, so the agent **proposes** actions/projects for Stephen to accept — never creates them directly — and a Fortress outage never blocks the vault commit. Each proposal carries a unique `source_key` (`tuple-call:<id>:<slug>`) for provenance and dedupe. No Fortress credential lives here; the headless Claude reaches the `Fortress - Claude Cowork` connector through Stephen's account OAuth.

Guardrails baked into `instructions.md` (each earned by a real failure during the 2026-06-11 backfill): email-verified identity, device-account folding into the primary person, full-name entity pages gated by durable relevance, no transcript imports, no wikilinks inside markdown tables, semantic dedup before writing, keep-pages-small, and transcript content treated strictly as data (prompt-injection boundary).

Logs: `/tmp/tuple-trigger-debug.log` and the trigger runner's `triggers.log`.
