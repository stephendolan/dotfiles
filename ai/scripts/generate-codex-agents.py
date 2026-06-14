#!/usr/bin/env python3
"""Generate Codex native agent roles from canonical markdown agent prompts."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


PLUGIN_ROOT = Path(__file__).resolve().parents[1]
CODEX_HOME = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
DEFAULT_SOURCE = PLUGIN_ROOT / "agents"
DEFAULT_OUTPUT = CODEX_HOME / "agents" / "stephendolan"


CODEX_RUNTIME_CONTRACT = """## Runtime Interpretation

This is a Codex-native copy of a canonical markdown agent definition.
Use the source markdown as the source of truth.

- Use available Codex tools that match the source intent; do not preserve
  Claude-specific tool names in user-facing output.
- Treat source `model` frontmatter as a capability hint, not as a hard runtime
  requirement.
- Treat source `tools` frontmatter as intent: file inspection, search, shell,
  browser, web lookup, user question, or file editing.
- Edit files only when the caller explicitly asks for implementation,
  refinement, or repair. Otherwise, review and report.
- When source instructions mention `CLAUDE.md`, read the runtime-equivalent
  project instructions as well, especially `AGENTS.md`.
- Ask the human only when the answer is required and cannot be safely inferred.
  If this subagent cannot contact the human, return the exact question to the
  parent agent.
- Do not spawn additional agents unless the caller explicitly asks for nested
  delegation.
- Stay within the caller's stated scope, file ownership, and expected output
  format.
"""


def toml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str] | None:
    text = path.read_text(encoding="utf-8")
    marker = "---\n"
    if not text.startswith(marker):
        return None

    try:
        _, frontmatter, body = text.split(marker, 2)
    except ValueError:
        return None

    metadata: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()

    if "name" not in metadata or "description" not in metadata:
        raise ValueError(f"{path} must define name and description frontmatter")

    return metadata, body.strip()


def render_agent(source_path: Path, metadata: dict[str, str], body: str) -> str:
    title = metadata["name"]
    source = str(source_path)
    tools = metadata.get("tools")
    model = metadata.get("model")
    skills = metadata.get("skills")

    source_metadata = [
        f"- Source: `{source}`",
    ]
    if model:
        source_metadata.append(f"- Source model hint: `{model}`")
    if tools:
        source_metadata.append(f"- Source tool intent: `{tools}`")
    if skills:
        source_metadata.append(f"- Source skills: `{skills}`")

    developer_instructions = "\n\n".join(
        [
            f"# {title}",
            "\n".join(source_metadata),
            CODEX_RUNTIME_CONTRACT.strip(),
            "## Source Agent Instructions",
            body,
        ]
    )

    return "\n".join(
        [
            f"# Generated from {source}. Edit the markdown source, then rerun generate-codex-agents.py.",
            f"name = {toml_string(metadata['name'])}",
            f"description = {toml_string(metadata['description'])}",
            f"developer_instructions = {toml_string(developer_instructions)}",
            "",
        ]
    )


def generate(source_dir: Path, output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []

    for source_path in sorted(source_dir.glob("*.md")):
        parsed = parse_frontmatter(source_path)
        if parsed is None:
            continue
        metadata, body = parsed
        target_path = output_dir / f"{metadata['name']}.toml"
        target_path.write_text(render_agent(source_path, metadata, body), encoding="utf-8")
        generated.append(target_path)

    return generated


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    generated = generate(args.source, args.output)
    for path in generated:
        print(path)
    print(f"Generated {len(generated)} Codex agent role(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
