#!/usr/bin/env python3
"""Generate Stephen's Amp Personal Plugin from the canonical dotfiles skills."""

from __future__ import annotations

import argparse
import re
import shutil
import sys
import tempfile
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SOURCE_SKILLS = REPOSITORY_ROOT / "ai" / "skills"
PLUGIN_NAME = "stephendolan"


def canonical_skill_names(source_skills: Path = SOURCE_SKILLS) -> list[str]:
    names: list[str] = []
    for skill_dir in sorted(path for path in source_skills.iterdir() if path.is_dir()):
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.is_file():
            raise ValueError(f"canonical skill is missing SKILL.md: {skill_dir}")
        match = re.search(r"^name:\s*([a-z0-9-]+)\s*$", skill_file.read_text(), re.MULTILINE)
        if match is None:
            raise ValueError(f"canonical skill is missing a valid frontmatter name: {skill_file}")
        if match.group(1) != skill_dir.name:
            raise ValueError(
                f"canonical skill directory {skill_dir.name!r} does not match frontmatter name {match.group(1)!r}"
            )
        names.append(skill_dir.name)
    return names


def render_index(skill_names: list[str]) -> str:
    registrations = "\n".join(
        f"\tawait amp.registerSkill({{ path: 'skills/{name}' }})" for name in skill_names
    )
    return (
        "export const description = 'Stephen Dolan’s canonical skills for architecture, communication, "
        "customer discovery, code refinement, comments, writing, and agent-document design.'\n\n"
        "export default async function (amp) {\n"
        f"{registrations}\n"
        "}\n"
    )


def render_readme(skill_names: list[str]) -> str:
    inventory = "\n".join(f"- `stephendolan:{name}`" for name in skill_names)
    return f"""# Stephen Dolan’s skills

This plugin is generated from the canonical `ai/skills` directory in
`stephendolan/dotfiles`. Its registration list and packaged files are generated
together so adding a canonical skill cannot update one without the other.

## Bundled skills

{inventory}

Invoke a skill naturally from a matching request, or explicitly by its
qualified name, such as `stephendolan:writing-for-agents`.

## Updating

From a dotfiles checkout, clone the Amp User Plugins repository and generate its
snapshot:

```bash
amp clone user-plugins ~/.cache/amp/repositories/ampcode.com-user-plugins
python3 ai/scripts/sync_amp_plugin.py ~/.cache/amp/repositories/ampcode.com-user-plugins
python3 ai/scripts/sync_amp_plugin.py --check ~/.cache/amp/repositories/ampcode.com-user-plugins
```

Review and commit the dotfiles and User Plugins changes separately. Pushing the
User Plugins commit makes the qualified skills available after `reload_plugins`
or in a new thread.

Every skill directory under dotfiles `ai/skills` is included. Sources that
remain only in `ai/skillset.json` are intentionally installed independently and
are not part of this plugin. A third-party skill belongs here only when its
complete package, provenance, and license are vendored into `ai/skills`.
"""


def generate_plugin(destination: Path, source_skills: Path = SOURCE_SKILLS) -> list[str]:
    skill_names = canonical_skill_names(source_skills)
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_skills, destination / "skills")
    (destination / "index.ts").write_text(render_index(skill_names))
    (destination / "README.md").write_text(render_readme(skill_names))
    return skill_names


def tree_differences(expected: Path, actual: Path) -> list[str]:
    expected_files = {path.relative_to(expected) for path in expected.rglob("*") if path.is_file()}
    actual_files = {path.relative_to(actual) for path in actual.rglob("*") if path.is_file()}
    differences = [f"missing: {path}" for path in sorted(expected_files - actual_files)]
    differences.extend(f"unexpected: {path}" for path in sorted(actual_files - expected_files))
    differences.extend(
        f"changed: {path}"
        for path in sorted(expected_files & actual_files)
        if (expected / path).read_bytes() != (actual / path).read_bytes()
    )
    return differences


def sync_repository(repository: Path, check: bool) -> list[str]:
    if not repository.is_dir():
        raise ValueError(f"Amp User Plugins repository does not exist: {repository}")
    destination = repository / PLUGIN_NAME
    with tempfile.TemporaryDirectory() as temporary_directory:
        expected = Path(temporary_directory) / PLUGIN_NAME
        skill_names = generate_plugin(expected)
        if check:
            differences = tree_differences(expected, destination)
            if differences:
                raise ValueError("Amp personal plugin is out of sync:\n" + "\n".join(differences))
            return skill_names
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(expected, destination)
        return skill_names


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository", type=Path, help="checkout of Amp's User Plugins repository")
    parser.add_argument("--check", action="store_true", help="verify the generated plugin without changing it")
    args = parser.parse_args()

    try:
        skill_names = sync_repository(args.repository.expanduser().resolve(), args.check)
    except (OSError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1

    verb = "verified" if args.check else "generated"
    print(f"{verb} {PLUGIN_NAME} with {len(skill_names)} skills: {', '.join(skill_names)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
