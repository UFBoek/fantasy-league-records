"""Rookie draft rankings must never include the 2023 startup draft."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RookieDraftRankingsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "app.js").read_text(encoding="utf-8")
        cls.picks = json.loads((ROOT / "data" / "draft_picks.json").read_text(encoding="utf-8"))

    def test_startup_is_preserved_only_as_history(self):
        startup = [p for p in self.picks if p["draft_class"].lower() == "startup"]
        rookie = [p for p in self.picks if p["draft_class"].lower() == "rookie"]
        self.assertEqual(len(startup), 250)
        self.assertEqual(len(rookie), 120)
        self.assertEqual({str(p["draft_season"]) for p in rookie}, {"2024", "2025", "2026"})
        self.assertIn("figDraftFranchiseHistory(id,selectedDraftYear)", self.app)

    def test_rankings_filter_to_rookie_class_and_keep_pick_grades(self):
        view = self.app.split("async function draft(selectedYear){", 1)[1].split(
            "// Team drill-down in the Draft area", 1
        )[0]
        self.assertIn("filter(p=>String(p.draft_class||'').toLowerCase()==='rookie')", view)
        self.assertNotIn("fig-draft-startup-filter", view)
        self.assertNotIn("fig-draft-startup-only", view)
        self.assertIn("figDraftGradeStrip(pick)", view)
        self.assertIn("TEAM DRAFT VALUE RANKINGS", view)
        self.assertIn("location.hash='#/draft'", view)

    def test_team_breakdowns_also_filter_startup_and_redirect_old_links(self):
        view = self.app.split("async function draftTeamRanking(teamId,requestedYear){", 1)[1].split(
            "async function ", 1
        )[0]
        self.assertIn("filter(p=>String(p.draft_class||'').toLowerCase()==='rookie')", view)
        self.assertIn("location.hash='#/draft/team/'", view)
        self.assertIn("DRAFT SLOT COST", view)
        self.assertIn("AVG RETURN", view)


if __name__ == "__main__":
    unittest.main()
