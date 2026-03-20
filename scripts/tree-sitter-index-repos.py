#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


DEFAULT_REPOS_ROOT = "~/Repos"
DEFAULT_CHUNK_SIZE = 128


@dataclass(frozen=True)
class GrammarRepo:
    name: str
    url: str


GRAMMAR_REPOS = (
    GrammarRepo("tree-sitter-bash", "https://github.com/tree-sitter/tree-sitter-bash"),
    GrammarRepo("tree-sitter-c", "https://github.com/tree-sitter/tree-sitter-c"),
    GrammarRepo("tree-sitter-cpp", "https://github.com/tree-sitter/tree-sitter-cpp"),
    GrammarRepo("tree-sitter-go", "https://github.com/tree-sitter/tree-sitter-go"),
    GrammarRepo("tree-sitter-javascript", "https://github.com/tree-sitter/tree-sitter-javascript"),
    GrammarRepo("tree-sitter-objc", "https://github.com/tree-sitter-grammars/tree-sitter-objc"),
    GrammarRepo("tree-sitter-python", "https://github.com/tree-sitter/tree-sitter-python"),
    GrammarRepo("tree-sitter-ruby", "https://github.com/tree-sitter/tree-sitter-ruby"),
    GrammarRepo("tree-sitter-rust", "https://github.com/tree-sitter/tree-sitter-rust"),
    GrammarRepo("tree-sitter-swift", "https://github.com/alex-pinkus/tree-sitter-swift"),
    GrammarRepo("tree-sitter-typescript", "https://github.com/tree-sitter/tree-sitter-typescript"),
)

OBJC_TAGS_SCM = """\
(class_interface (identifier) @name) @definition.class
(class_implementation (identifier) @name) @definition.class
(protocol_declaration (identifier) @name) @definition.interface
(method_definition (keyword_declarator (identifier) @name)) @definition.method
(method_definition (identifier) @name) @definition.method
"""

SWIFT_LOCALS_SCM = """\
(import_declaration
  (identifier) @local.definition)

(function_declaration
  name: (simple_identifier) @local.definition)

[
  (statements)
  (for_statement)
  (while_statement)
  (repeat_while_statement)
  (do_statement)
  (if_statement)
  (guard_statement)
  (switch_statement)
  (property_declaration)
  (function_declaration)
  (class_declaration)
  (protocol_declaration)
] @local.scope
"""

EXTENSION_SCOPES = {
    ".bash": "source.shell",
    ".c": "source.c",
    ".cc": "source.cpp",
    ".cjs": "source.js",
    ".cpp": "source.cpp",
    ".cxx": "source.cpp",
    ".go": "source.go",
    ".hh": "source.cpp",
    ".hpp": "source.cpp",
    ".hxx": "source.cpp",
    ".js": "source.js",
    ".jsx": "source.js",
    ".m": "source.objc",
    ".mm": "source.objc",
    ".mjs": "source.js",
    ".py": "source.python",
    ".rb": "source.ruby",
    ".rs": "source.rust",
    ".sh": "source.shell",
    ".swift": "source.swift",
    ".ts": "source.ts",
    ".tsx": "source.tsx",
    ".zsh": "source.shell",
}

SUPPORTED_EXTENSIONS = frozenset(EXTENSION_SCOPES.keys()) | {".h"}

HEADER_SAMPLE_LIMIT = 65_536

HEADER_SIBLING_SCOPES = {
    ".c": "source.c",
    ".cc": "source.cpp",
    ".cpp": "source.cpp",
    ".cxx": "source.cpp",
    ".m": "source.objc",
    ".mm": "source.objc",
}

SCOPE_ORDER = [
    "source.c",
    "source.cpp",
    "source.go",
    "source.js",
    "source.objc",
    "source.python",
    "source.ruby",
    "source.rust",
    "source.shell",
    "source.swift",
    "source.ts",
    "source.tsx",
]

EXCLUDED_DIRS = {
    ".build",
    ".claude",
    ".git",
    ".next",
    ".svn",
    ".treesitter",
    ".trees",
    ".turbo",
    ".venv",
    ".worktrees",
    "DerivedData",
    "SourcePackages",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
    "tmp",
    "vendor",
}

EXCLUDED_TEST_DIRS = {"spec", "specs", "test", "tests", "__specs__", "__tests__"}

TEST_FILE_PATTERNS = re.compile(
    r"[_.](?:test|spec)\.\w+$",
    re.IGNORECASE,
)

OBJC_HEADER_MARKERS = re.compile(
    r"@interface|@implementation|@protocol|@property|@class|@selector|"
    r"NS_ASSUME_NONNULL|NS_SWIFT_NAME|FOUNDATION_EXPORT|OBJC_EXPORT|"
    r"#import\s+<(Foundation|UIKit|AppKit|Cocoa)/",
    re.IGNORECASE,
)

CPP_HEADER_MARKERS = re.compile(
    r"\bclass\s+\w|\bnamespace\s+\w|\btemplate\s*<|std::|"
    r"\bvirtual\b|\bconstexpr\b|\bfriend\b|\bpublic:\b|\bprivate:\b|"
    r"#include\s+<(string|vector|memory|map|set|unordered_map|unordered_set)>",
    re.IGNORECASE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap tree-sitter grammars and generate .treesitter/symbols.txt for repos."
    )
    parser.add_argument(
        "--repo",
        action="append",
        default=[],
        help="Index a specific git repository. Can be passed multiple times.",
    )
    parser.add_argument(
        "--repos-root",
        default=DEFAULT_REPOS_ROOT,
        help="Root directory to scan for git repos when --repo is not provided.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=DEFAULT_CHUNK_SIZE,
        help="Maximum files per tree-sitter batch.",
    )
    parser.add_argument(
        "--no-setup",
        action="store_true",
        help="Skip grammar sync and config generation.",
    )
    return parser.parse_args()


def xdg_config_home() -> Path:
    configured = os.environ.get("XDG_CONFIG_HOME")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / ".config"


def config_path() -> Path:
    return xdg_config_home() / "tree-sitter" / "config.json"


def grammars_dir() -> Path:
    return xdg_config_home() / "tree-sitter" / "grammars"


def run(cmd: list[str], *, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if check and result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"{' '.join(cmd)} failed: {stderr}")
    return result


def ensure_command(name: str) -> None:
    if shutil.which(name):
        return
    raise RuntimeError(
        f"Missing required command: {name}. Install dotfiles packages or add it to PATH first."
    )


def sync_grammar(repo: GrammarRepo, destination: Path) -> None:
    if destination.is_dir() and (destination / ".git").exists():
        result = run(["git", "-C", str(destination), "pull", "--ff-only", "--quiet"], check=False)
        if result.returncode == 0:
            print(f"[setup] Updated {repo.name}")
            return
        stderr = result.stderr.strip()
        print(f"[setup] Could not update {repo.name}: {stderr or 'unknown error'}", file=sys.stderr)
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    run(["git", "clone", "--depth", "1", repo.url, str(destination)])
    print(f"[setup] Cloned {repo.name}")


def ensure_dependency_link(base_dir: Path, consumer: str, dependency: str) -> None:
    consumer_dir = base_dir / consumer
    dependency_dir = base_dir / dependency
    if not consumer_dir.is_dir() or not dependency_dir.is_dir():
        return

    node_modules_dir = consumer_dir / "node_modules"
    node_modules_dir.mkdir(exist_ok=True)

    link_path = node_modules_dir / dependency
    if link_path.is_symlink():
        if link_path.resolve() == dependency_dir.resolve():
            return
        link_path.unlink()
    elif link_path.exists():
        return

    link_path.symlink_to(dependency_dir)


def patch_swift_grammar(base_dir: Path) -> None:
    grammar_dir = base_dir / "tree-sitter-swift"
    config_file = grammar_dir / "tree-sitter.json"
    if not config_file.exists():
        return

    config = json.loads(config_file.read_text(encoding="utf-8"))
    config["grammars"][0]["tags"] = "queries/tags.scm"
    config_file.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")

    queries_dir = grammar_dir / "queries"
    queries_dir.mkdir(exist_ok=True)
    (queries_dir / "locals.scm").write_text(SWIFT_LOCALS_SCM, encoding="utf-8")


def patch_objc_grammar(base_dir: Path) -> None:
    grammar_dir = base_dir / "tree-sitter-objc"
    config_file = grammar_dir / "tree-sitter.json"
    if not config_file.exists():
        return

    config = json.loads(config_file.read_text(encoding="utf-8"))
    grammar = config["grammars"][0]
    file_types = grammar.setdefault("file-types", [])
    if "mm" not in file_types:
        file_types.append("mm")
    grammar["tags"] = "queries/tags.scm"
    config_file.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")

    queries_dir = grammar_dir / "queries"
    queries_dir.mkdir(exist_ok=True)
    (queries_dir / "tags.scm").write_text(OBJC_TAGS_SCM, encoding="utf-8")


def generate_swift_parser(base_dir: Path) -> None:
    grammar_dir = base_dir / "tree-sitter-swift"
    if not grammar_dir.is_dir():
        return

    parser_file = grammar_dir / "src" / "parser.c"
    if parser_file.exists():
        return

    result = run(["tree-sitter", "generate"], cwd=grammar_dir, check=False)
    if result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"tree-sitter generate failed for swift grammar: {stderr}")


def write_config(path: Path, parser_dir: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    config: dict[str, object]
    if path.exists():
        config = json.loads(path.read_text(encoding="utf-8"))
    else:
        config = {}

    parser_directories = config.get("parser-directories", [])
    if not isinstance(parser_directories, list):
        parser_directories = []

    parser_dir_str = str(parser_dir)
    updated_directories = [parser_dir_str]
    updated_directories.extend(
        entry for entry in parser_directories if isinstance(entry, str) and entry != parser_dir_str
    )
    config["parser-directories"] = updated_directories

    path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


def ensure_tree_sitter_setup() -> Path:
    ensure_command("git")
    ensure_command("tree-sitter")

    parser_dir = grammars_dir()
    for repo in GRAMMAR_REPOS:
        sync_grammar(repo, parser_dir / repo.name)

    ensure_dependency_link(parser_dir, "tree-sitter-cpp", "tree-sitter-c")
    ensure_dependency_link(parser_dir, "tree-sitter-objc", "tree-sitter-c")
    ensure_dependency_link(parser_dir, "tree-sitter-typescript", "tree-sitter-javascript")
    patch_swift_grammar(parser_dir)
    patch_objc_grammar(parser_dir)
    generate_swift_parser(parser_dir)
    write_config(config_path(), parser_dir)
    return config_path()


def resolve_repo_root(path: str) -> Path:
    candidate = Path(path).expanduser().resolve()
    working_dir = candidate if candidate.is_dir() else candidate.parent
    result = run(
        ["git", "-C", str(working_dir), "rev-parse", "--show-toplevel"],
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{candidate} is not inside a git repository")
    return Path(result.stdout.strip()).resolve()


def discover_repos(root: Path) -> list[Path]:
    repos: list[Path] = []
    if not root.exists():
        return repos

    for current_root, dirs, files in os.walk(root, topdown=True):
        current = Path(current_root)
        has_git_marker = ".git" in dirs or ".git" in files
        if has_git_marker:
            repos.append(current)
            dirs[:] = []
            continue
        dirs[:] = [name for name in dirs if name not in EXCLUDED_DIRS]
    return sorted(repos)


def is_test_file(rel_path: Path) -> bool:
    if any(part.lower() in EXCLUDED_TEST_DIRS for part in rel_path.parts):
        return True
    return bool(TEST_FILE_PATTERNS.search(rel_path.name))


def collect_source_files(repo_dir: Path) -> list[Path]:
    files: list[Path] = []
    for root, dirs, filenames in os.walk(repo_dir, topdown=True):
        dirs[:] = [name for name in dirs if name not in EXCLUDED_DIRS]
        root_path = Path(root)
        for filename in filenames:
            rel_path = (root_path / filename).relative_to(repo_dir)
            if rel_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            if is_test_file(rel_path):
                continue
            files.append(rel_path)
    return sorted(files)


def classify_header(header_path: Path, sibling_map: dict[tuple[Path, str], str], repo_dir: Path) -> str:
    sibling_scope = sibling_map.get((header_path.parent, header_path.stem))
    if sibling_scope:
        return sibling_scope

    try:
        sample = (repo_dir / header_path).read_text(encoding="utf-8", errors="ignore")[:HEADER_SAMPLE_LIMIT]
    except OSError:
        return "source.cpp"

    if OBJC_HEADER_MARKERS.search(sample):
        return "source.objc"
    if CPP_HEADER_MARKERS.search(sample):
        return "source.cpp"
    return "source.cpp"


def group_files_by_scope(files: list[Path], repo_dir: Path) -> dict[str, list[Path]]:
    sibling_map: dict[tuple[Path, str], str] = {}
    for rel_path in files:
        sibling_scope = HEADER_SIBLING_SCOPES.get(rel_path.suffix.lower())
        if sibling_scope:
            sibling_map[(rel_path.parent, rel_path.stem)] = sibling_scope

    grouped: dict[str, list[Path]] = defaultdict(list)
    for rel_path in files:
        suffix = rel_path.suffix.lower()
        if suffix == ".h":
            scope = classify_header(rel_path, sibling_map, repo_dir)
        else:
            scope = EXTENSION_SCOPES.get(suffix)
            if scope is None:
                continue
        grouped[scope].append(rel_path)
    return grouped


def chunked(paths: list[Path], size: int) -> list[list[Path]]:
    return [paths[index:index + size] for index in range(0, len(paths), size)]


def run_tree_sitter_batch(
    repo_dir: Path,
    config: Path,
    scope: str,
    files: list[Path],
) -> tuple[str, list[str]]:
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=False) as handle:
        for rel_path in files:
            handle.write(f"{rel_path.as_posix()}\n")
        list_path = Path(handle.name)

    try:
        result = run(
            [
                "tree-sitter",
                "tags",
                "--config-path",
                str(config),
                "--scope",
                scope,
                "--paths",
                str(list_path),
            ],
            cwd=repo_dir,
            check=False,
        )
    finally:
        list_path.unlink(missing_ok=True)

    if result.returncode == 0:
        return result.stdout, []

    return run_tree_sitter_individually(repo_dir, config, scope, files)


def run_tree_sitter_individually(
    repo_dir: Path,
    config: Path,
    scope: str,
    files: list[Path],
) -> tuple[str, list[str]]:
    output = ""
    failures: list[str] = []
    for rel_path in files:
        single = run(
            [
                "tree-sitter",
                "tags",
                "--config-path",
                str(config),
                "--scope",
                scope,
                rel_path.as_posix(),
            ],
            cwd=repo_dir,
            check=False,
        )
        if single.returncode != 0:
            failures.append(rel_path.as_posix())
            continue
        output += single.stdout

    return output, failures


def index_repo(repo_dir: Path, config: Path, chunk_size: int) -> tuple[int, int, int]:
    files = collect_source_files(repo_dir)
    output_dir = repo_dir / ".treesitter"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / "symbols.txt"

    if not files:
        output_path.write_text("", encoding="utf-8")
        print(f"[index] {repo_dir}: no supported files")
        return 0, 0, 0

    grouped = group_files_by_scope(files, repo_dir)
    outputs: list[str] = []
    failures: list[str] = []

    for scope in SCOPE_ORDER:
        scope_files = grouped.get(scope)
        if not scope_files:
            continue
        for batch in chunked(scope_files, chunk_size):
            stdout, batch_failures = run_tree_sitter_batch(repo_dir, config, scope, batch)
            if stdout:
                outputs.append(stdout)
            failures.extend(batch_failures)

    combined_output = "".join(outputs)
    output_path.write_text(combined_output, encoding="utf-8")

    symbol_count = combined_output.count("\n")
    if failures:
        preview = ", ".join(failures[:5])
        print(
            f"[index] {repo_dir}: {symbol_count} symbols with {len(failures)} skipped files ({preview})",
            file=sys.stderr,
        )
    else:
        print(f"[index] {repo_dir}: {symbol_count} symbols")

    return len(files), symbol_count, len(failures)


def main() -> int:
    args = parse_args()

    try:
        ensure_command("git")
        ensure_command("tree-sitter")
        config = ensure_tree_sitter_setup() if not args.no_setup else config_path()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1

    if not config.exists():
        print(f"Missing tree-sitter config: {config}", file=sys.stderr)
        return 1

    try:
        if args.repo:
            repos = sorted({resolve_repo_root(path) for path in args.repo})
        else:
            repos_root = Path(args.repos_root).expanduser().resolve()
            repos = discover_repos(repos_root)
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1

    if not repos:
        print("[index] No repositories found")
        return 0

    total_files = 0
    total_symbols = 0
    total_failures = 0

    for repo_dir in repos:
        files, symbols, failures = index_repo(repo_dir, config, args.chunk_size)
        total_files += files
        total_symbols += symbols
        total_failures += failures

    print(
        f"[index] Summary: {len(repos)} repos, {total_files} files, {total_symbols} symbols, {total_failures} skipped files"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
