#!/usr/bin/env python3
"""Tests for the declared skill installer."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


INSTALLER_PATH = Path(__file__).with_name("install-skills.py")
SPEC = importlib.util.spec_from_file_location("install_skills", INSTALLER_PATH)
assert SPEC is not None and SPEC.loader is not None
install_skills = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(install_skills)


class InstallSkillsTest(unittest.TestCase):
    def test_interfacecraft_uses_its_maintained_installer(self) -> None:
        self.assertEqual(
            install_skills.command_for([], {"installer": "interfacecraft"}),
            ["curl", "-sL", "https://interfacecraft.dev/api/install-skills"],
        )

    def test_declared_skillset_is_valid(self) -> None:
        _, marketplaces, sources = install_skills.load_skillset()
        self.assertIn({"installer": "interfacecraft"}, sources)
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
