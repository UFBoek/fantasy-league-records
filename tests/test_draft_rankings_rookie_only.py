"""Rookie draft rankings must never include the 2023 startup draft."""
import json
import shutil
import subprocess
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
        self.assertIn("RETURN %", view)

    def test_aggregate_return_only(self):
        self.assertNotIn("AVG RETURN", self.app)
        self.assertNotIn("avgReturn", self.app)
        self.assertIn("const ratio=slot?current/slot:null", self.app)
        ranking = self.app.split("async function draft(selectedYear){", 1)[1].split(
            "// Team drill-down in the Draft area", 1
        )[0]
        self.assertIn("['return','RETURN %']", ranking)
        self.assertNotIn("['average','AVG RETURN']", ranking)
        self.assertIn("fig-draft-rank-return-pct", ranking)
        self.assertIn("yearGrade.ratio", self.app)

    def test_return_is_weighted_by_draft_slot_cost(self):
        picks = [(1000, 1000), (100, 1000)]
        total_slot = sum(slot for slot, current in picks)
        total_current = sum(current for slot, current in picks)
        aggregate = total_current / total_slot
        mean_individual = sum(current / slot for slot, current in picks) / len(picks)
        self.assertAlmostEqual(aggregate, 2000 / 1100)
        self.assertLess(aggregate, mean_individual)

    def test_third_and_fourth_round_200_percent_return_is_at_least_b(self):
        # Execute the actual frontend grading function, not a reimplementation.
        if not shutil.which("node"):
            self.skipTest("Node.js is not installed")
        source = self.app.split("function figDraftGradeLetter(current,slot,pick){", 1)[1].split(
            "\\nconst FIG_GRADE_POINTS", 1
        )[0]
        function_source = "function figDraftGradeLetter(current,slot,pick){" + source
        javascript = function_source + """
const cases = [
  [376,188,{round:3,draft_class:'Rookie'},'B'],  // exactly 200%, under 550
  [200,100,{round:4,draft_class:'Rookie'},'B'],  // exactly 200%, under 550
  [375,188,{round:3,draft_class:'Rookie'},'C'],  // less than 200%
  [199,100,{round:4,draft_class:'Rookie'},'C'],  // less than 200%
  [1010,505,{round:2,draft_class:'Rookie'},'C'], // no late-round rule
  [200,100,{round:4,draft_class:'Startup'},'C'],// no startup rule
  [3000,100,{round:4,draft_class:'Rookie'},'A'] // higher grade still wins
];
for (const [current,slot,pick,expected] of cases) {
  const actual = figDraftGradeLetter(current,slot,pick);
  if (actual !== expected) {
    throw new Error(JSON.stringify({current,slot,pick,expected,actual}));
  }
}
"""
        result = subprocess.run(
            ["node", "-e", javascript], capture_output=True, text=True, check=False
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
