# knowledge-base-sync

When a Tuple call transcription session completes, this trigger runs a headless Claude (sonnet) that mines durable knowledge from the call into Stephen's Obsidian knowledge base at `~/Obsidian/Notes`, following the vault's `AGENTS.md` ingest contract.

What one firing does:

1. Collects every transcript session of the call that lacks a `call-summary.md` coverage marker (idempotent; also sweeps sessions a previous firing missed).
2. Runs `claude --model sonnet --print` with `instructions.md` appended to the system prompt and a tool allowlist (file tools in the vault, scoped `git`, `obsidian`, and `tuple`/`tuple-staging` Bash commands — no arbitrary shell, no network tools).
3. The agent reads the call via `tuple-staging transcription text/events` (raw JSONL fallback), promotes durable facts into synthesis/entity pages with `date time \`callid\`` evidence pointers, writes a real `call-summary.md` marker into each session folder, lints links with the Obsidian CLI, appends a `Log.md` entry, and commits.

Guardrails baked into `instructions.md` (each one earned by a real failure during the 2026-06-11 backfill): email-verified identity, device-account folding into the primary person, full-name entity pages gated by durable relevance, no transcript imports, no wikilinks inside markdown tables, semantic dedup before writing, keep-pages-small, and transcript content treated strictly as data (prompt-injection boundary).

Concurrency: a `mkdir`-based vault lock serializes near-simultaneous call endings; stale locks are stolen after 30 minutes. If a run fails, sessions stay unmarked and the vault's marker-based completeness lint ("any dated folder without `call-summary.md` is unprocessed") catches them on the next maintenance pass.

Logs: `/tmp/tuple-trigger-debug.log` and the trigger runner's `triggers.log`.
