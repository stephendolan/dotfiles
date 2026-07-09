# post-call-activity

When a Tuple call ends, this trigger runs a single headless Claude (sonnet) that reads the call's transcript **once** and produces the post-call outputs: it sets the call's Tuple title/summary, mines durable knowledge into Stephen's Obsidian knowledge base at `~/Obsidian/Notes` (following the vault's `AGENTS.md` ingest contract and committing), then recommends the work the call put on his plate into Fortress as an orderless `recommend_item` digest for him to review. One read, three outputs — metadata to Tuple, knowledge to the vault, work to Fortress.

The `call-ended` event carries no call id (only `TUPLE_TRIGGER_CALL_LENGTH`), so the trigger resolves the just-ended call from the stored-transcript index and the agent reads it back through the `tuple-staging` CLI.

What one firing does:

1. Resolves the just-ended call as the newest call in `tuple-staging transcription list` not already in the processed-calls state file (`~/.tuplestaging/post-call-activity/processed-calls.txt`). It polls for a few seconds because `call-ended` fires ~1–2s before the transcript flushes to the store; a call with no transcription never appears, so the poll times out and the trigger no-ops.
2. Runs `claude --model sonnet --print` with `instructions.md` appended to the system prompt and a tool allowlist: file tools in the vault, scoped `git`, `obsidian`, and `tuple-staging` Bash commands, plus three Fortress MCP tools (`recommend_item`, `search`, `list_projects`). No arbitrary shell.
3. The agent reads the call via `tuple-staging transcription show <id> --with-events`, sets the call title and summary through `tuple-staging transcription set-title` and `set-summary`, promotes durable facts into synthesis/entity pages with `date time \`callid\`` evidence pointers, lints links, appends a `Log.md` entry, and commits — then, best-effort, recommends Stephen's actions/projects into Fortress (each entry keyed on a unique `source_key: tuple-call:<id>:<slug>`, so retries upsert rather than duplicate).
4. On success, the trigger records the call id in the processed-calls file. Low-signal calls are recorded too, so they aren't reconsidered.

The Fortress step is permission-gated and best-effort: the connector is a `requires_permission` worker, so the agent **recommends** work for Stephen to accept (never commits actions/projects directly), and a Fortress outage never blocks the vault commit. No Fortress credential lives here — the headless Claude reaches the `Fortress - Claude Cowork` connector through Stephen's account OAuth.

Guardrails baked into `instructions.md` (each one earned by a real failure during the 2026-06-11 backfill): email-verified identity, device-account folding into the primary person, full-name entity pages gated by durable relevance, no transcript imports, no wikilinks inside markdown tables, semantic dedup before writing, keep-pages-small, and transcript content treated strictly as data (prompt-injection boundary).

Concurrency: a `mkdir`-based vault lock serializes near-simultaneous call completions; stale locks are stolen after 30 minutes. If a run fails, the call stays out of the processed file and is retried on the next firing while it remains the most recent call.

Logs: `/tmp/tuple-trigger-debug.log` and the trigger runner's `triggers.log`.
