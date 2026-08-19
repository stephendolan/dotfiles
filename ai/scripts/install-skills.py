#!/usr/bin/env python3
"""Install the skill allowlist declared in ai/skillset.json."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SKILLSET_PATH = REPOSITORY_ROOT / "ai" / "skillset.json"


def load_skillset() -> tuple[list[str], list[dict[str, object]]]:
    with SKILLSET_PATH.open() as file:
        skillset = json.load(file)

    agents = skillset.get("agents")
    sources = skillset.get("sources")
    if not isinstance(agents, list) or not all(isinstance(agent, str) for agent in agents):
        raise ValueError("skillset agents must be an array of agent names")
    if not isinstance(sources, list):
        raise ValueError("skillset sources must be an array")

    for entry in sources:
        if not isinstance(entry, dict) or not isinstance(entry.get("source"), str):
            raise ValueError("every skill source needs a string source")
        skills = entry.get("skills")
        if skills is not None and (
            not isinstance(skills, list) or not all(isinstance(skill, str) for skill in skills)
        ):
            raise ValueError("source skills must be an array of skill names when present")

    return agents, sources


def command_for(agents: list[str], entry: dict[str, object]) -> list[str]:
    command = ["npx", "--yes", "skills", "add", str(entry["source"]), "--global", "--yes"]
    for skill in entry.get("skills", ["*"]):
        command.extend(["--skill", str(skill)])
    for agent in agents:
        command.extend(["--agent", agent])
    return command


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print commands without running them")
    args = parser.parse_args()

    if not args.dry_run and shutil.which("npx") is None:
        print("npx is required to install declared skills", file=sys.stderr)
        return 1

    try:
        agents, sources = load_skillset()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"invalid {SKILLSET_PATH}: {error}", file=sys.stderr)
        return 1

    for entry in sources:
        command = command_for(agents, entry)
        print("+", " ".join(command))
        if not args.dry_run:
            subprocess.run(command, check=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
