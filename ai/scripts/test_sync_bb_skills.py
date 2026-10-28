from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("sync-bb-skills.py")


class SyncBBSkillsTest(unittest.TestCase):
    def test_manifest_cleanup_preserves_another_managers_skills(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            skills = root / "bb" / "skills"
            purchased = skills / "emil-ui-review"
            purchased.mkdir(parents=True)
            (purchased / "SKILL.md").write_text("Purchased review guidance\n")
            marker = json.dumps({"owner": "aiforui", "contentHash": "purchased-hash"})
            (purchased / ".aiforui-managed.json").write_text(marker)
            retired = skills / "retired-skill"
            retired.mkdir()
            (retired / "SKILL.md").write_text("Retired guidance\n")
            (retired / ".bb-skill-sync.json").write_text(json.dumps({"source": "example/retired"}))
            manifest = root / "skillset.json"
            manifest.write_text(json.dumps({"sources": []}))

            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--manifest", str(manifest),
                 "--data-dir", str(root / "bb"), "--cache", str(root / "cache")],
                capture_output=True, text=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((purchased / "SKILL.md").read_text(), "Purchased review guidance\n")
            self.assertEqual((purchased / ".aiforui-managed.json").read_text(), marker)
            self.assertFalse(retired.exists())


if __name__ == "__main__":
    unittest.main()
