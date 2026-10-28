#!/usr/bin/env python3
"""Tests for the declared skill installer."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path


INSTALLER_PATH = Path(__file__).with_name("install-skills.py")
SPEC = importlib.util.spec_from_file_location("install_skills", INSTALLER_PATH)
assert SPEC is not None and SPEC.loader is not None
install_skills = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(install_skills)


class InstallSkillsTest(unittest.TestCase):
    def test_named_skills_keep_agent_selection(self) -> None:
        self.assertEqual(
            install_skills.command_for(
                ["codex", "claude-code"],
                {"source": "example/skills", "skills": ["postgres"]},
            ),
            ["npx", "--yes", "skills", "add", "example/skills", "--global", "--yes",
             "--skill", "postgres", "--agent", "codex", "claude-code"],
        )

    def test_retired_installer_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            manifest = Path(directory) / "skillset.json"
            manifest.write_text(json.dumps({
                "agents": ["codex"], "marketplaces": [],
                "sources": [{"installer": "interfacecraft"}],
            }))
            with patch.object(install_skills, "SKILLSET_PATH", manifest):
                with self.assertRaisesRegex(ValueError, "unsupported skill installer"):
                    install_skills.load_skillset()

    def test_declared_skillset_is_valid(self) -> None:
        _, marketplaces, sources = install_skills.load_skillset()
        self.assertFalse(any(
            entry.get("installer") == "interfacecraft"
            or entry.get("source") in {"pbakaus/impeccable", "emilkowalski/skills"}
            for entry in sources
        ))
        self.assertIn(
            {
                "name": "dotfiles",
                "source": "stephendolan/dotfiles",
                "plugins": ["stephendolan"],
                "agents": ["codex", "claude-code"],
            },
            marketplaces,
        )

    def test_official_pstack_skill_is_declared(self) -> None:
        _, _, sources = install_skills.load_skillset()
        self.assertIn(
            {
                "source": "https://github.com/cursor/plugins/tree/main/pstack",
                "skills": ["principle-test-behavior-not-implementation"],
            },
            sources,
        )


if __name__ == "__main__":
    unittest.main()
