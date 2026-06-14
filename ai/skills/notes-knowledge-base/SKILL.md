---
name: notes-knowledge-base
description: Maintain Stephen's Obsidian notes knowledge base in /Users/stephen/Obsidian/Notes. Use when working with Stephen's notes, personal knowledge base, Obsidian vault, qmd setup, source pages, source summaries, or life/work knowledge retrieval.
---

# Notes Knowledge Base

Stephen's personal knowledge base lives at `/Users/stephen/Obsidian/Notes`.

## Model

The vault follows the LLM knowledge-base pattern:

- The vault root is the maintained knowledge-base surface.
- Top-level folders such as `Areas/`, `Sources/`, `Topics/`, `Entities/`, and `Queries/` are the visible map of the knowledge base.
- This is a wiki, not an app, transcript archive, regeneration pipeline, or task manager.
- `Sources/` contains canonical source pages only when preserving source text inside the vault is valuable.
- Raw Tuple call exports live outside Obsidian at `~/Documents/Tuple Calls`. Read them as evidence; do not import transcripts or call-folder tooling into the vault.
- Source capture is not complete ingest. Promote source evidence into maintained project, account, people/entity, decision, topic, and customer-signal pages.
- `Assets/` contains images, PDFs, SVGs, and other attachments that are referenced by notes.
- `Index.md` is the first navigation file.
- `Log.md` is the append-only maintenance timeline.
- Keep top-level additions within the allowed surfaces named by the vault-local `AGENTS.md`; update that contract if a new root surface is genuinely needed.

## Workflow

1. Read `/Users/stephen/Obsidian/Notes/AGENTS.md`.
2. Read `Index.md`.
3. Search the vault root before broader filesystem search.
4. Prefer maintained pages in `Areas/`, `Topics/`, `Entities/`, and `Queries/`.
5. Use `Sources/**/*.md` only when provenance or preserved source text matters.
6. Preserve durable answers by filing them in `Queries/` and linking them from `Index.md`.

## Page Grain

- Prefer many small, named pages over massive aggregate docs.
- Folder indexes are navigation pages only. Keep them thin.
- Create one page per durable real-world entity or concept: person, account, organization, project, decision, vocabulary term, or reusable answer.
- Name pages after the thing itself, such as `Entities/People/Jack Hannah.md` or `Entities/Accounts/Rentvine.md`, not after source roles such as "participants" or "customers in calls."
- When a maintained page starts mixing unrelated concerns, split it into smaller linked pages and leave an overview or index behind.

## Ingest

When adding source material:

1. Read enough of the source to identify durable knowledge.
2. Put temporary captures in `Inbox/` only when immediate synthesis is not possible.
3. Create a canonical source page in `Sources/` only when the source text belongs inside the vault.
4. Update relevant synthesis pages under the appropriate top-level folder.
5. Add internal links so backlinks and graph views stay useful.
6. Append an entry to `Log.md`.

For Tuple calls:

1. Work from the external folders under `~/Documents/Tuple Calls`.
2. Use `events.jsonl` for people and metadata.
3. Use `call-summary.md` when present and `transcriptions.jsonl` when exact content matters.
4. Classify low-signal tests and empty calls in `Topics/Tuple Calls.md` instead of importing them.
5. Promote durable knowledge into `Areas/Tuple/Projects/`, `Topics/Tuple Call Decisions.md`, `Areas/Tuple/Customer Signals.md`, `Entities/Accounts/`, `Entities/People/`, and concept pages. Name pages for real entities and concepts, not source roles.
6. Cite call evidence by date/time and call ID, not by creating raw transcript pages in Obsidian.
7. Delete temporary helper scripts or reports before finishing.

## Search

Prefer qmd if installed:

```bash
qmd search "query" -c life-knowledge --json -n 10
```

Fallback:

```bash
rtk rg -n "query" .
```

Prefer hits in `Areas/`, `Topics/`, `Entities/`, `Queries/`, and `Sources/`.

For recent Tuple product, customer, CLI/transcription, or collaboration questions, start with `Topics/Tuple Calls.md`, `Areas/Tuple/Projects/Project Index.md`, `Topics/Tuple Call Decisions.md`, `Areas/Tuple/Customer Signals.md`, `Entities/Accounts/Index.md`, and `Entities/People/Index.md`.

## Obsidian CLI

Use the Obsidian CLI when Obsidian semantics matter: backlinks, outgoing links, unresolved links, orphans, tags, properties, templates, opening files, and one-off captures.

Resolve the command from the vault root:

```bash
if command -v obsidian >/dev/null; then OBSIDIAN=obsidian; else OBSIDIAN='/Applications/Obsidian.app/Contents/MacOS/obsidian'; fi
```

Useful checks:

```bash
$OBSIDIAN search query="query" path=Areas limit=10 format=json
$OBSIDIAN unresolved total
$OBSIDIAN orphans total
$OBSIDIAN backlinks path="Index.md" counts
$OBSIDIAN tags counts format=json
$OBSIDIAN properties counts format=json
```

Use filesystem tools for ordinary markdown inspection and scoped edits. Read `Operations/Obsidian CLI.md` for detailed recipes.

## Obsidian Affordances

- Use YAML properties as the machine-readable schema for maintained notes.
- Use nested tags as facets, such as `kb/source`, `kb/synthesis`, `domain/tuple`, `domain/personal`, `status/active`, and `needs/review`.
- Use internal links for semantic relationships so backlinks, local graph, and global graph become useful.
- Use Bases for recurring dashboards over properties when they help the wiki.
- Use Canvas for spatial maps into real notes; prefer file cards over text-only cards.
- Check `Operations/Obsidian Affordances.md` before changing the schema or adding new Obsidian conventions.

## Boundary

Do not create todos, reminders, or execution queues in the knowledge base. Capture real tasks in Fortress and keep the vault focused on durable knowledge, decisions, context, and evidence.

Do not leave large imports as transcript/source dumps. Extract durable people, projects, accounts, decisions, vocabulary, customer signals, and contradictions into maintained wiki pages with evidence pointers.
