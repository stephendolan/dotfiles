#!/usr/bin/env python3
"""Install the skills and marketplace plugins declared in ai/skillset.json."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SKILLSET_PATH = REPOSITORY_ROOT / "ai" / "skillset.json"
MARKETPLACE_SOURCES = {"stephendolan/dotfiles"}
INTERFACECRAFT_INSTALL_URL = "https://interfacecraft.dev/api/install-skills"


def load_skillset() -> tuple[list[str], list[dict[str, object]], list[dict[str, object]]]:
    with SKILLSET_PATH.open() as file:
        skillset = json.load(file)

    agents = skillset.get("agents")
    marketplaces = skillset.get("marketplaces")
    sources = skillset.get("sources")
    if not isinstance(agents, list) or not all(isinstance(agent, str) for agent in agents):
        raise ValueError("skillset agents must be an array of agent names")
    if not isinstance(sources, list):
        raise ValueError("skillset sources must be an array")
    if not isinstance(marketplaces, list):
        raise ValueError("skillset marketplaces must be an array")

    for marketplace in marketplaces:
        if not isinstance(marketplace, dict):
            raise ValueError("every marketplace must be an object")
        for field in ("name", "source"):
            if not isinstance(marketplace.get(field), str):
                raise ValueError(f"marketplace {field} must be a string")
        for field in ("plugins", "agents"):
            values = marketplace.get(field)
            if not isinstance(values, list) or not values or not all(
                isinstance(value, str) for value in values
            ):
                raise ValueError(f"marketplace {field} must be a non-empty string array")
        unsupported = set(marketplace["agents"]) - {"codex", "claude-code"}
        if unsupported:
            raise ValueError(f"unsupported marketplace agents: {', '.join(sorted(unsupported))}")

    for entry in sources:
        if not isinstance(entry, dict):
            raise ValueError("every skill source must be an object")
        installer = entry.get("installer", "skills.sh")
        if installer == "skills.sh" and not isinstance(entry.get("source"), str):
            raise ValueError("skills.sh sources need a string source")
        if entry.get("source") in MARKETPLACE_SOURCES:
            raise ValueError(
                f"{entry['source']} is installed through its marketplace plugin, not skills.sh"
            )
        if installer == "interfacecraft" and "skills" in entry:
            raise ValueError("interfacecraft installs its bundled skills as a set")
        if installer not in {"skills.sh", "interfacecraft"}:
            raise ValueError(f"unsupported skill installer: {installer}")
        skills = entry.get("skills")
        if skills is not None and (
            not isinstance(skills, list) or not all(isinstance(skill, str) for skill in skills)
        ):
            raise ValueError("source skills must be an array of skill names when present")

    return agents, marketplaces, sources


def command_for(agents: list[str], entry: dict[str, object]) -> list[str]:
    if entry.get("installer") == "interfacecraft":
        return ["curl", "-sL", INTERFACECRAFT_INSTALL_URL]

    command = ["npx", "--yes", "skills", "add", str(entry["source"]), "--global", "--yes"]
    command.append("--skill")
    command.extend(str(skill) for skill in entry.get("skills", ["*"]))
    command.append("--agent")
    command.extend(agents)
    return command


def output_json(command: list[str]) -> object:
    return json.loads(subprocess.run(command, check=True, capture_output=True, text=True).stdout)


def install_codex_marketplace(entry: dict[str, object], dry_run: bool) -> None:
    name = str(entry["name"])
    source = str(entry["source"])
    if dry_run:
        print("+ codex plugin marketplace add", source, f"# or upgrade {name}")
        for plugin in entry["plugins"]:
            print("+ codex plugin add", f"{plugin}@{name}")
        return
    if shutil.which("codex") is None:
        print(f"skipping Codex marketplace {name}: codex is not installed")
        return

    listing = output_json(["codex", "plugin", "marketplace", "list", "--json"])
    configured = any(
        marketplace.get("name") == name
        for marketplace in listing.get("marketplaces", [])
    )
    if configured:
        subprocess.run(["codex", "plugin", "marketplace", "upgrade", name], check=True)
    else:
        subprocess.run(["codex", "plugin", "marketplace", "add", source], check=True)

    plugins = output_json(["codex", "plugin", "list", "--marketplace", name, "--json"])
    installed = {plugin.get("pluginId") for plugin in plugins.get("installed", [])}
    for plugin in entry["plugins"]:
        plugin_id = f"{plugin}@{name}"
        if plugin_id not in installed:
            subprocess.run(["codex", "plugin", "add", plugin_id], check=True)


def install_claude_marketplace(entry: dict[str, object], dry_run: bool) -> None:
    name = str(entry["name"])
    source = str(entry["source"])
    if dry_run:
        print("+ claude plugin marketplace add", source, f"# or update {name}")
        for plugin in entry["plugins"]:
            print("+ claude plugin install", f"{plugin}@{name}")
        return
    if shutil.which("claude") is None:
        print(f"skipping Claude marketplace {name}: claude is not installed")
        return

    listing = output_json(["claude", "plugin", "marketplace", "list", "--json"])
    configured = any(marketplace.get("name") == name for marketplace in listing)
    if configured:
        subprocess.run(["claude", "plugin", "marketplace", "update", name], check=True)
    else:
        subprocess.run(["claude", "plugin", "marketplace", "add", source], check=True)

    plugins = output_json(["claude", "plugin", "list", "--json"])
    installed = {plugin.get("id") for plugin in plugins}
    for plugin in entry["plugins"]:
        plugin_id = f"{plugin}@{name}"
        if plugin_id not in installed:
            subprocess.run(["claude", "plugin", "install", plugin_id], check=True)


def install_marketplaces(marketplaces: list[dict[str, object]], dry_run: bool) -> None:
    for marketplace in marketplaces:
        agents = marketplace["agents"]
        if "codex" in agents:
            install_codex_marketplace(marketplace, dry_run)
        if "claude-code" in agents:
            install_claude_marketplace(marketplace, dry_run)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print commands without running them")
    args = parser.parse_args()

    try:
        agents, marketplaces, sources = load_skillset()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"invalid {SKILLSET_PATH}: {error}", file=sys.stderr)
        return 1

    installers = {str(entry.get("installer", "skills.sh")) for entry in sources}
    if not args.dry_run and "skills.sh" in installers and shutil.which("npx") is None:
        print("npx is required to install declared skills", file=sys.stderr)
        return 1
    if not args.dry_run and "interfacecraft" in installers:
        missing_commands = [
            command for command in ("curl", "bash") if shutil.which(command) is None
        ]
        if missing_commands:
            print(f"interfacecraft requires: {', '.join(missing_commands)}", file=sys.stderr)
            return 1

    for entry in sources:
        command = command_for(agents, entry)
        if entry.get("installer") == "interfacecraft":
            print("+", " ".join(command), "| bash")
            if not args.dry_run:
                installer = subprocess.run(command, check=True, stdout=subprocess.PIPE)
                subprocess.run(["bash"], check=True, input=installer.stdout)
            continue

        print("+", " ".join(command))
        if not args.dry_run:
            subprocess.run(command, check=True)

    install_marketplaces(marketplaces, args.dry_run)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
