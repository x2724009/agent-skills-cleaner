import os
import shutil
import tempfile
import unittest

from skillsweep import actions
from skillsweep.analyzer import analyze
from skillsweep.scanner import parse_frontmatter, scan

PROMPT_ONLY = """---
name: be-careful
description: Behavioral guidelines to reduce common LLM mistakes. Use when starting any conversation.
---
# Be careful
You MUST think first. ALWAYS plan. NEVER skip steps. Before any task, invoke the planning skill.
You MUST verify. ALWAYS test. NEVER guess. Before every reply, check again. MUST MUST ALWAYS.
"""

TOOL_SKILL = """---
name: web-clean
description: >
  Extract clean markdown
  from web pages.
---
# Web clean
```bash
webclean parse https://example.com --md
webclean parse https://example.com -p title
webclean parse https://example.com -o out.md
```
"""


def write_skill(root, name, text, script=False):
    path = os.path.join(root, name)
    os.makedirs(path)
    with open(os.path.join(path, "SKILL.md"), "w", encoding="utf-8") as f:
        f.write(text)
    if script:
        with open(os.path.join(path, "run.py"), "w") as f:
            f.write("print('hi')\n")
    return path


class SweepTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.shared = os.path.join(self.tmp, "shared")
        self.agent = os.path.join(self.tmp, "agent")
        os.makedirs(self.shared)
        os.makedirs(self.agent)
        self.prompt = write_skill(self.shared, "be-careful", PROMPT_ONLY)
        self.tool = write_skill(self.shared, "web-clean", TOOL_SKILL)
        os.symlink(self.prompt, os.path.join(self.agent, "be-careful"))
        os.symlink(os.path.join(self.tmp, "gone"), os.path.join(self.agent, "old"))
        self.roots = [("Shared", self.shared), ("Agent", self.agent)]

        self._saved = (actions.STATE_DIR, actions.HISTORY_PATH, actions.trash_dir)
        actions.STATE_DIR = os.path.join(self.tmp, "state")
        actions.HISTORY_PATH = os.path.join(actions.STATE_DIR, "history.json")
        trash = os.path.join(self.tmp, "trash")
        os.makedirs(trash)
        actions.trash_dir = lambda: trash

    def tearDown(self):
        actions.STATE_DIR, actions.HISTORY_PATH, actions.trash_dir = self._saved
        shutil.rmtree(self.tmp)

    def report(self):
        return analyze(scan(self.roots), known=[])

    def by_name(self, name):
        return next(s for s in self.report()["skills"] if s["name"] == name)

    def test_frontmatter_block_scalar(self):
        meta, _ = parse_frontmatter(TOOL_SKILL)
        self.assertEqual(meta["description"], "Extract clean markdown from web pages.")

    def test_groups_installs_by_real_path(self):
        s = self.by_name("be-careful")
        self.assertEqual(sorted(i["kind"] for i in s["installs"]), ["folder", "link"])

    def test_prompt_only_scores_high_tool_scores_low(self):
        self.assertEqual(self.by_name("be-careful")["verdict"], "remove")
        tool = self.by_name("web-clean")
        self.assertEqual(tool["verdict"], "keep")
        self.assertIn("teaches_cli", [r["id"] for r in tool["reasons"]])

    def test_known_rule_wins(self):
        known = [{"names": ["web-clean"], "verdict": "remove", "reason": {"zh": "x", "en": "x"}}]
        s = next(s for s in analyze(scan(self.roots), known=known)["skills"] if s["name"] == "web-clean")
        self.assertEqual(s["verdict"], "remove")

    def test_broken_link_found(self):
        self.assertEqual([b["name"] for b in self.report()["broken"]], ["old"])

    def test_uninstall_and_restore(self):
        s = self.by_name("be-careful")
        link = os.path.join(self.agent, "be-careful")
        entry = actions.uninstall(s, link)
        self.assertFalse(os.path.lexists(link))
        self.assertTrue(os.path.isdir(self.prompt))
        actions.restore(entry["id"])
        self.assertEqual(os.path.realpath(link), os.path.realpath(self.prompt))

    def test_uninstall_refuses_real_folder(self):
        s = self.by_name("be-careful")
        with self.assertRaises(actions.ActionError):
            actions.uninstall(s, self.prompt)

    def test_delete_moves_to_trash_and_restores(self):
        s = self.by_name("be-careful")
        entry = actions.delete(s)
        self.assertFalse(os.path.exists(self.prompt))
        self.assertFalse(os.path.lexists(os.path.join(self.agent, "be-careful")))
        actions.restore(entry["id"])
        self.assertTrue(os.path.isfile(os.path.join(self.prompt, "SKILL.md")))
        self.assertTrue(os.path.islink(os.path.join(self.agent, "be-careful")))
        with self.assertRaises(actions.ActionError):
            actions.restore(entry["id"])


if __name__ == "__main__":
    unittest.main()
