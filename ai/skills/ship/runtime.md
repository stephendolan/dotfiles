# Ship runtime overlays

Ship is runtime-neutral. This file holds the cross-runtime mapping table and the
project-overlay resolution rules that only matter when adapting Ship to a
non-Claude runtime (Codex, etc.) or wiring in project-specific gates. For general
role adaptation across runtimes, read `agents/RUNTIME.md`; this file covers only
the Ship-specific overlays and mappings rather than duplicating that guidance.

The one runtime rule that applies to *every* Ship run — the fresh-context review
gate for Phases 3, 4, and 6 — stays inline in `SKILL.md`, not here.

## Runtime model

Treat slash-command names, Claude frontmatter, and Codex skill names as
invocation details, not as the workflow contract.

| Concept | Claude | Codex | Runtime-neutral behavior |
| --- | --- | --- | --- |
| Workflow skill | `/ship`, `/commit`, `/create-pr` | `$ship`, `$commit`, `$create-pr`, or direct skill use | Load and follow the matching `SKILL.md`. |
| Specialist agent | Agent tool with `agents/*.md` | Native generated role from `$CODEX_HOME/agents/stephendolan/` defaulting to `~/.codex/agents/stephendolan/`, or `default` subagent plus `agents/RUNTIME.md` and the requested agent markdown | Spawn when the user invoked Ship or otherwise explicitly asked for delegation; otherwise apply the role in the main thread. |
| Project instructions | `CLAUDE.md` | `AGENTS.md` plus any `CLAUDE.md` compatibility file | Read the runtime's project instruction file before planning edits. |
| Task tracking | `TodoWrite` or Task tools | `update_plan` | Keep an explicit phase/task state when the runtime has a tracker. |
| Human question | `AskUserQuestion` | direct user question or `request_user_input` when available | Avoid during Ship; use plan-refiner arbitration or fail loudly. |

When a runtime cannot launch a named specialist directly, resolve paths from
the plugin root, meaning the directory that contains both `agents/` and
`skills/`. Read `agents/RUNTIME.md` and the relevant `agents/<name>.md`, then
provide both as the role contract to the runtime's generic subagent.

Invoking Ship is an explicit request for the specialist reviews named in this
workflow. Keep delegated tasks bounded: give each specialist the goal, current
plan or diff, relevant paths/evidence, allowed write scope, and expected output
format. Do not let specialist agents delegate further unless the caller
explicitly asks for nested delegation.

Close completed specialist agents as soon as their output has been incorporated.
If a spawn call fails because the prompt shape or thread limit is wrong, fix the
cause once; do not keep retrying the same delegation. Prefer one combined,
bounded reviewer prompt over several overlapping reviewers when the review
budget is surgical.

## Project overlays

Project-specific gates, path-sensitivity lists, and deploy checks belong in the
project repo (`AGENTS.md`, `CLAUDE.md`, `.claude/skills/`, `.codex/skills/`, or
the runtime's equivalent), not in the Ship skill. Examples:

- Project instructions declaring "required build gates" (for example `pnpm --filter @pkg/api run build`) -> Phase 6/7 picks them up automatically.
- Project-level skill like `pipeline:deploy-check` -> Phase 7 invokes it optionally after merge.
- Project instructions declaring "sensitive paths" -> Phase 4 path-sensitivity guard consults it.
- Project instructions declaring verification matrices, deploy targets, path
  filters, external cleanup rules, or provider-specific source-link rules ->
  Phase 2, Phase 6, and Phase 7 use those local rules.

Never hardcode specific project paths, commands, or services in the Ship skill.
It runs across every repo.
