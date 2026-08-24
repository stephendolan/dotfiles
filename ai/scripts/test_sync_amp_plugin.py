from __future__ import annotations

import re
import tempfile
import unittest
from pathlib import Path

from sync_amp_plugin import SOURCE_SKILLS, canonical_skill_names, generate_plugin, tree_differences


class SyncAmpPluginTest(unittest.TestCase):
    def test_generation_registers_and_packages_every_canonical_skill(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            destination = Path(temporary_directory) / "stephendolan"
            expected_names = canonical_skill_names()

            generated_names = generate_plugin(destination)
            registered_names = re.findall(
                r"registerSkill\(\{ path: 'skills/([a-z0-9-]+)' \}\)",
                (destination / "index.ts").read_text(),
            )
            packaged_names = sorted(
                path.name for path in (destination / "skills").iterdir() if path.is_dir()
            )

            self.assertEqual(generated_names, expected_names)
            self.assertEqual(registered_names, expected_names)
            self.assertEqual(packaged_names, expected_names)
            self.assertEqual(tree_differences(SOURCE_SKILLS, destination / "skills"), [])

    def test_packaged_skill_references_resolve(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            destination = Path(temporary_directory) / "stephendolan"
            generate_plugin(destination)

            for skill_file in (destination / "skills").glob("*/SKILL.md"):
                for target in re.findall(r"\]\(([^)]+)\)", skill_file.read_text()):
                    if "://" in target or target.startswith("#"):
                        continue
                    relative_target = target.split("#", 1)[0]
                    self.assertTrue(
                        (skill_file.parent / relative_target).exists(),
                        f"{skill_file} references missing resource {target}",
                    )

            writing_for_agents = destination / "skills" / "writing-for-agents"
            self.assertTrue((writing_for_agents / "SKILL-MECHANICS.md").is_file())
            self.assertTrue((writing_for_agents / "agents" / "openai.yaml").is_file())
            self.assertTrue((writing_for_agents / "LICENSE.upstream").is_file())
            self.assertTrue((writing_for_agents / "UPSTREAM.md").is_file())


if __name__ == "__main__":
    unittest.main()
