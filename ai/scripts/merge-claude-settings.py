#!/usr/bin/env python3
"""Merge the tracked Claude Code settings seed into the live settings file.

``~/.claude/settings.json`` is owned by Claude Code, which rewrites it during
normal use (permission grants, model switches, survey timestamps, per-project
auto-mode environment notes). A symlink into the dotfiles repo therefore turns
every session into a dirty working tree.

Instead, ``ai/claude-settings.json`` tracks only the settings worth version
controlling, and this script folds them into the real file. Seed values win for
the keys the seed declares; every other key in the live file is left alone.
"""

import json
import os
import sys
from pathlib import Path

SEED = Path(__file__).resolve().parent.parent / "claude-settings.json"
LIVE = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")) / "settings.json"

# Keys whose sub-keys are merged rather than replaced, so locally managed
# siblings survive. permissions.allow in particular is churned constantly by
# Claude Code and is deliberately not tracked.
MERGE_NESTED = {"permissions"}


def load(path):
    try:
        with path.open() as handle:
            return json.load(handle)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as exc:
        sys.exit(f"error: {path} is not valid JSON ({exc})")


def merge(seed, live):
    result = dict(live)
    for key, value in seed.items():
        if key in MERGE_NESTED and isinstance(value, dict) and isinstance(live.get(key), dict):
            result[key] = {**live[key], **value}
        else:
            result[key] = value
    return result


def main():
    seed = load(SEED)
    if not seed:
        sys.exit(f"error: no settings seed at {SEED}")

    # A symlink here is the old layout; replace it with a real file so Claude
    # Code's own writes stay out of the repo.
    if LIVE.is_symlink():
        LIVE.unlink()
        live = {}
    else:
        live = load(LIVE)

    merged = merge(seed, live)
    if merged == live:
        print("Claude Code settings already up to date")
        return

    LIVE.parent.mkdir(parents=True, exist_ok=True)
    tmp = LIVE.with_suffix(".json.tmp")
    with tmp.open("w") as handle:
        json.dump(merged, handle, indent=2)
        handle.write("\n")
    tmp.replace(LIVE)
    print(f"Merged tracked Claude Code settings into {LIVE}")


if __name__ == "__main__":
    main()
