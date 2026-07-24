# post-call-activity

When a Tuple call ends, this trigger forks a detached worker that resolves the just-ended call from the stored-transcript index and runs one headless Claude (sonnet) per unprocessed call. Each run reads the transcript **once** and produces three outputs: metadata to Tuple (`transcription set-title` / `set-summary`), durable knowledge to Stephen's Obsidian knowledge base at `~/Obsidian/Notes` (following the vault's `AGENTS.md` ingest contract, committed), and the work the call put on Stephen's plate to Fortress as typed proposals he reviews and accepts.

How a firing works:

1. The `call-ended` event carries no call id, so the worker polls `tuple transcription list` for stored calls not yet in `~/.tuple/post-call-activity/processed-calls.txt` (transcript flush lags the event by ~1-2s). It checks the newest 5, oldest first, so a firing also catches calls earlier firings missed — near-simultaneous endings or failed runs. A call with no transcription never appears; the poll times out and the worker no-ops.
2. Everything runs detached so the serial trigger runner is never blocked. A `mkdir`-based vault lock serializes workers (stale locks stolen after 30 minutes; only the owner removes its own lock), and the unprocessed set is re-resolved after the lock is acquired so two firings never process the same call twice.
3. Each call gets a `claude --model sonnet --print` run with `instructions.md` appended to the system prompt and a strict tool allowlist: file tools in the vault, scoped `git`/`obsidian`/`pgrep`/`tuple` Bash commands, and five Fortress MCP tools (`propose_standalone_action`, `propose_project`, `propose_someday`, `search`, `list_projects`). No arbitrary shell.
4. On success the call id is appended to the processed file — low-signal calls too, so they aren't reconsidered. On failure it is left out and retried by the next firing's catch-up.

The Fortress step is best-effort and permission-gated: the connector is a `requires_permission` worker, so the agent **proposes** actions/projects for Stephen to accept — never creates them directly — and a Fortress outage never blocks the vault commit. Each proposal carries a unique `source_key` (`tuple-call:<id>:<slug>`) for provenance and dedupe. No Fortress credential lives here; the headless Claude reaches the `Fortress - Claude Cowork` connector through Stephen's account OAuth.

Guardrails baked into `instructions.md` (each earned by a real failure during the 2026-06-11 backfill): email-verified identity, device-account folding into the primary person, full-name entity pages gated by durable relevance, no transcript imports, no wikilinks inside markdown tables, semantic dedup before writing, keep-pages-small, and transcript content treated strictly as data (prompt-injection boundary).

Logs: `/tmp/tuple-trigger-debug.log` and the trigger runner's `triggers.log`.
