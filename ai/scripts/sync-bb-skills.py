#!/usr/bin/env python3
"""Sync the skill sources declared in ai/skillset.json into bb user skills.

Run this on the bb server host. bb injects user skills into every provider
thread on every connected machine, so one sync replaces per-machine installs for
bb threads. Repositories are fetched with git, so private repositories work
wherever git can authenticate to GitHub, such as after `gh auth setup-git`.

Marketplace plugins stay per-machine installs: they also carry agents, and
syncing their skills would list each one twice in bb.

Each synced skill carries a .bb-skill-sync.json marker. A run rewrites only
changed skills, never replaces a skill it did not create, and removes a marked
skill only when the manifest no longer declares it and its source was fetched.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = REPOSITORY_ROOT / "ai" / "skillset.json"
MARKER = ".bb-skill-sync.json"
INSTALLER_URLS = {"interfacecraft": "https://interfacecraft.dev/api/install-skills"}
GITHUB_TREE_URL = re.compile(
    r"^https://github\.com/(?P<slug>[^/]+/[^/]+?)(?:\.git)?(?:/tree/(?P<ref>[^/]+)(?:/(?P<path>.+))?)?/?$"
)
SKIPPED_PARTS = {".git", "node_modules", "__pycache__", ".DS_Store"}
SKILL_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")
COPY_IGNORE = shutil.ignore_patterns(".git", "node_modules", "__pycache__", ".DS_Store", MARKER)


@dataclass
class Source:
    label: str
    requested: list[str] | None
    skills: dict[str, Path] = field(default_factory=dict)
    revision: str = ""
    error: str | None = None


def run(command: list[str], **kwargs: object) -> str:
    result = subprocess.run(command, check=True, capture_output=True, text=True, **kwargs)
    return result.stdout


def frontmatter_name(skill_file: Path) -> str | None:
    text = skill_file.read_text(errors="replace")
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    for line in text[3:end if end > 0 else None].splitlines():
        key, separator, value = line.partition(":")
        if separator and key.strip() == "name":
            return value.strip().strip("'\"") or None
    return None


def discover_skills(root: Path) -> dict[str, Path]:
    found: dict[str, Path] = {}
    skill_files = (path for path in root.rglob("SKILL.md") if path.is_file())
    for skill_file in sorted(skill_files, key=lambda path: (len(path.parts), str(path))):
        if SKIPPED_PARTS.intersection(skill_file.relative_to(root).parts):
            continue
        found.setdefault(frontmatter_name(skill_file) or skill_file.parent.name, skill_file.parent)
    return found


def fetch_repository(cache: Path, slug: str, ref: str | None) -> tuple[Path, str]:
    checkout = cache / "repos" / (slug.replace("/", "__") + (f"@{ref}" if ref else ""))
    if (checkout / ".git").exists():
        run(["git", "-C", str(checkout), "fetch", "--quiet", "--depth", "1", "origin", ref or "HEAD"])
        run(["git", "-C", str(checkout), "reset", "--quiet", "--hard", "FETCH_HEAD"])
        run(["git", "-C", str(checkout), "clean", "--quiet", "-fdx"])
    else:
        shutil.rmtree(checkout, ignore_errors=True)
        branch = ["--branch", ref] if ref else []
        url = f"https://github.com/{slug}.git"
        run(["git", "clone", "--quiet", "--depth", "1", *branch, url, str(checkout)])
    return checkout, run(["git", "-C", str(checkout), "rev-parse", "--short", "HEAD"]).strip()


def parse_repository(source: str) -> tuple[str, str | None, str | None]:
    match = GITHUB_TREE_URL.match(source)
    if match:
        return match["slug"], match["ref"], match["path"]
    if re.fullmatch(r"[\w.-]+/[\w.-]+", source):
        return source, None, None
    raise ValueError(f"unsupported source {source!r}; use owner/repo or a GitHub tree URL")


def run_installer(cache: Path, name: str) -> tuple[Path, str]:
    url = INSTALLER_URLS.get(name)
    if url is None:
        raise ValueError(f"unsupported skill installer: {name}")
    with urllib.request.urlopen(url, timeout=60) as response:
        script = response.read()
    digest = hashlib.sha256(script).hexdigest()
    output = cache / "installers" / name
    if (output / ".script-sha256").exists() and (output / ".script-sha256").read_text() == digest:
        return output / "skills", digest[:7]

    with tempfile.TemporaryDirectory() as home:
        env = {**os.environ, "HOME": home}
        subprocess.run(["bash"], input=script, env=env, check=True, capture_output=True)
        shutil.rmtree(output, ignore_errors=True)
        (output / "skills").mkdir(parents=True)
        for skills_dir in (Path(home) / ".agents" / "skills", Path(home) / ".claude" / "skills"):
            for skill in sorted(skills_dir.glob("*/SKILL.md")) if skills_dir.is_dir() else []:
                target = output / "skills" / skill.parent.name
                if not target.exists():
                    shutil.copytree(skill.parent, target, symlinks=False)
    (output / ".script-sha256").write_text(digest)
    return output / "skills", digest[:7]


def collect_sources(manifest: dict[str, object], cache: Path) -> list[Source]:
    sources: list[Source] = []
    for entry in manifest.get("sources", []):
        requested = entry.get("skills")
        if "installer" in entry:
            source = Source(label=f"installer:{entry['installer']}", requested=requested)
            try:
                root, source.revision = run_installer(cache, str(entry["installer"]))
                source.skills = discover_skills(root)
            except (OSError, ValueError, subprocess.CalledProcessError) as error:
                source.error = str(error)
        else:
            source = Source(label=str(entry["source"]), requested=requested)
            try:
                slug, ref, path = parse_repository(str(entry["source"]))
                checkout, source.revision = fetch_repository(cache, slug, ref)
                source.skills = discover_skills(checkout / path if path else checkout)
            except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
                source.error = getattr(error, "stderr", None) or str(error)
        sources.append(source)
    return sources


def tree_digest(path: Path) -> str:
    digest = hashlib.sha256()
    files = sorted(
        file for file in path.rglob("*")
        if file.is_file() and file.name != MARKER
        and not SKIPPED_PARTS.intersection(file.relative_to(path).parts)
    )
    for file in files:
        digest.update(file.relative_to(path).as_posix().encode() + b"\0")
        digest.update(file.read_bytes() + b"\0")
    return digest.hexdigest()


def read_marker(skill_dir: Path) -> dict[str, str] | None:
    try:
        return json.loads((skill_dir / MARKER).read_text())
    except (OSError, json.JSONDecodeError):
        return None


def install_skill(skills_dir: Path, staging: Path, name: str, source_dir: Path, marker: dict) -> None:
    fresh = staging / f"{name}.new"
    retired = staging / f"{name}.old"
    shutil.rmtree(fresh, ignore_errors=True)
    shutil.rmtree(retired, ignore_errors=True)
    shutil.copytree(source_dir, fresh, symlinks=False, ignore=COPY_IGNORE, ignore_dangling_symlinks=True)
    (fresh / MARKER).write_text(json.dumps(marker, indent=2) + "\n")
    destination = skills_dir / name
    if destination.exists():
        os.replace(destination, retired)
    os.replace(fresh, destination)
    shutil.rmtree(retired, ignore_errors=True)


def bb_data_dir() -> Path:
    if os.environ.get("BB_DATA_DIR"):
        return Path(os.environ["BB_DATA_DIR"])
    bb = os.environ.get("BB_CLI") or shutil.which("bb")
    if bb is None:
        raise RuntimeError("bb is not on PATH; pass --data-dir or set BB_DATA_DIR")
    return Path(json.loads(run([bb, "settings", "show", "--json"]))["dataDir"])


def sync(sources: list[Source], skills_dir: Path, dry_run: bool) -> int:
    staging = skills_dir.parent / ".bb-skill-sync-staging"
    staging.mkdir(parents=True, exist_ok=True)
    synced_at = datetime.now(UTC).isoformat(timespec="seconds")
    declared: dict[str, tuple[Source, Path]] = {}
    failures = 0
    counts = {"installed": 0, "updated": 0, "unchanged": 0, "removed": 0}

    for source in sources:
        if source.error:
            failures += 1
            print(f"! {source.label}: {source.error.strip().splitlines()[-1]}")
            continue
        for name in source.requested or sorted(source.skills):
            if name not in source.skills:
                failures += 1
                print(f"! {source.label}: no skill named {name}")
                continue
            if not SKILL_NAME.match(name):
                failures += 1
                print(f"! {source.label}: skill name {name!r} is not lowercase-hyphenated")
                continue
            if name in declared:
                if declared[name][0] is not source:
                    print(f"  {name}: kept from {declared[name][0].label}, skipped in {source.label}")
                continue
            declared[name] = (source, source.skills[name])

    for name, (source, source_dir) in sorted(declared.items()):
        destination = skills_dir / name
        existing = read_marker(destination) if destination.exists() else None
        if destination.exists() and existing is None:
            print(f"  {name}: left alone (not created by this sync)")
            continue
        digest = tree_digest(source_dir)
        if existing and existing.get("digest") == digest and existing.get("source") == source.label:
            counts["unchanged"] += 1
            continue
        action = "updated" if existing else "installed"
        counts[action] += 1
        print(f"{'~' if existing else '+'} {name} ({source.label}@{source.revision})")
        if not dry_run:
            marker = {"source": source.label, "revision": source.revision, "digest": digest,
                      "path": str(source_dir), "syncedAt": synced_at}
            install_skill(skills_dir, staging, name, source_dir, marker)

    failed_labels = {source.label for source in sources if source.error}
    requested = {name for source in sources for name in source.requested or []}
    for skill_dir in sorted(path for path in skills_dir.iterdir() if path.is_dir()):
        marker = read_marker(skill_dir)
        if marker is None or skill_dir.name in declared or skill_dir.name in requested:
            continue
        if marker.get("source") in failed_labels:
            continue
        counts["removed"] += 1
        print(f"- {skill_dir.name} (no longer declared by {marker.get('source')})")
        if not dry_run:
            shutil.rmtree(skill_dir)

    summary = ", ".join(f"{count} {label}" for label, count in counts.items())
    print(f"{'dry run: ' if dry_run else ''}{summary}; {failures} problem(s)")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--data-dir", type=Path, help="bb data directory (default: from bb settings)")
    parser.add_argument("--cache", type=Path,
                        default=Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "bb-skill-sync")
    parser.add_argument("--dry-run", action="store_true", help="report changes without writing them")
    args = parser.parse_args()

    try:
        manifest = json.loads(args.manifest.read_text())
        skills_dir = (args.data_dir or bb_data_dir()) / "skills"
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"cannot start: {error}", file=sys.stderr)
        return 1

    skills_dir.mkdir(parents=True, exist_ok=True)
    args.cache.mkdir(parents=True, exist_ok=True)
    return sync(collect_sources(manifest, args.cache), skills_dir, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
