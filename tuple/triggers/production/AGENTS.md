# Tuple Triggers (production)

This directory is the live trigger set for the production Tuple client (deployed to `~/.tuple/triggers` by `scripts/tuple-triggers-sync.sh` — the Tuple trigger runner does not follow symlinks, so the live dir holds real copies; edit here and run the sync script, or edit live and run it with `--capture`). Each subdirectory is one trigger; executables named for lifecycle events (`call-transcription-started`, `call-transcription-complete`, etc.) run when those events fire, receiving context via `TUPLE_TRIGGER_*` environment variables.

## THIS DIRECTORY IS PUBLIC

It is versioned in `stephendolan/dotfiles`, a public GitHub repository. Anything written here — scripts, prompts, assets, docs — is published. Hard rules:

- Never write secrets: no API keys, tokens, passwords, webhook URLs, or credentials of any kind. Triggers that need a secret must read it from the environment or a file outside this repo.
- Never write customer or call content: no customer names, transcript excerpts, account details, or anything sourced from a call. Prompts may describe *how* to process calls, never *what was said* on one.
- Keep prompts and docs generic about people: lessons learned belong here as patterns, not as named incidents.
- Runtime artifacts (`triggers.log*`, lock dirs, `.DS_Store`) are gitignored — but do not rely on that: avoid logging sensitive content in the first place.

When editing or adding a trigger, review the diff as if it were a public blog post before committing.
