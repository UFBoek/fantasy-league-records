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
            "const FIG_GRADE_POINTS", 1
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

    def test_near_slot_value_is_at_least_c_for_all_rounds(self):
        # Exercise the production grading function at and just below 80%,
        # without reimplementing the grade algorithm in Python.
        if not shutil.which("node"):
            self.skipTest("Node.js is not installed")
        body = self.app.split("function figDraftGradeLetter(current,slot,pick){", 1)[1].split(
            "const FIG_GRADE_POINTS", 1
        )[0]
        javascript = "function figDraftGradeLetter(current,slot,pick){" + body + """
const pick = round => ({round, draft_class:'Rookie'});
const checks = [
  [5040,6300,1,'C'], // 1.01: exactly 80%
  [5039,6300,1,'D'], // 1.01: just under 80%
  [612,765,2,'C'],   // 2.06: exactly 80%
  [611,765,2,'D'],   // 2.06: just under 80%
  [240,300,3,'C'],   // 3.05: exactly 80%, below old 300/800 gates
  [239,300,3,'D'],
  [76,95,4,'C'],     // 4.10: exactly 80%, below old absolute minimums
  [75,95,4,'D'],
  [0,95,4,'F'],      // missing value is zero, still F
  [190,95,4,'B'],    // late-round 200% B requirement is unchanged
  [2300,765,2,'A'],  // higher grades take precedence
  [6500,6300,1,'C'],// retained 103%, but gain too small for S or A
  [7000,3000,1,'S'] // S threshold unchanged
];
for (const [current, slot, round, expected] of checks) {
  const actual=figDraftGradeLetter(current,slot,pick(round));
  if(actual!==expected)throw new Error(
    JSON.stringify({current,slot,round,expected,actual}));
}
"""
        result = subprocess.run(["node", "-e", javascript], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_each_year_full_board_starts_expanded(self):
        draft = self.app.split("async function draft(selectedYear){", 1)[1].split(
            "// Team drill-down in the Draft area", 1
        )[0]
        self.assertIn('<details class="fig-draft-rank-board" open>', draft)
        self.assertIn("fig-draft-board-hide", draft)
        self.assertIn("fig-draft-board-show", draft)

    def test_all_rookie_pick_explorer_after_rankings(self):
        draft = self.app.split("async function draft(selectedYear){", 1)[1].split(
            "// Team drill-down in the Draft area", 1
        )[0]
        self.assertIn("const explorer=year==='all'?", draft)
        self.assertIn("explorer+boardDetail", draft)
        for field in ("figDraftExplorerSearch", "figDraftExplorerGrade",
                      "figDraftExplorerReturn", "figDraftExplorerYear",
                      "figDraftExplorerRound", "figDraftExplorerTeam",
                      "figDraftExplorerMin", "figDraftExplorerSort",
                      "figDraftExplorerReset", "figDraftExplorerMore"):
            self.assertIn(field, draft)
        self.assertIn("figDraftExplorerSelect(explorerRows,options)", draft)
        self.assertIn("shown+=40", draft)

    def test_explorer_filters_and_order_use_actual_grade_data(self):
        if not shutil.which("node"):
            self.skipTest("Node.js is not installed")
        source = self.app.split("function figDraftExplorerSelect(rows,opts){", 1)[1].split(
            "function figDraftFranchiseHistory", 1
        )[0]
        js = "const FIG_GRADE_POINTS={S:5,A:4,B:3,C:2,D:1,F:0};\n" + (
            "function figDraftExplorerSelect(rows,opts){" + source
        ) + """
const rows=[
 {pick:{draft_season:2024,round:4,franchise_id:2,pick_no:40},grade:{letter:'B',ratio:2.0,current:190,delta:95,slot:95},searchText:'2024 rookie alpha matt 4.10'},
 {pick:{draft_season:2025,round:1,franchise_id:1,pick_no:1},grade:{letter:'A',ratio:1.5,current:9450,delta:3150,slot:6300},searchText:'2025 beta jack 1.01'},
 {pick:{draft_season:2026,round:3,franchise_id:2,pick_no:24},grade:{letter:'F',ratio:0,current:0,delta:-340,slot:340},searchText:'2026 gamma matt 3.04'},
 {pick:{draft_season:2026,round:2,franchise_id:3,pick_no:11},grade:{letter:'C',ratio:.9,current:1440,delta:-160,slot:1600},searchText:'2026 delta other 2.01'}
];
const pickNo=x=>x.map(y=>y.pick.pick_no).join(',');
function assert(actual,expected,label){
 if(actual!==expected)throw new Error(label+' got '+actual+', expected '+expected);
}
assert(pickNo(figDraftExplorerSelect(rows,{sort:'draft'})),'11,24,1,40','draft order');
assert(pickNo(figDraftExplorerSelect(rows,{grade:'B'})),'40','grade B');
assert(pickNo(figDraftExplorerSelect(rows,{returnBand:'200+'})),'40','200% return');
assert(pickNo(figDraftExplorerSelect(rows,{returnBand:'80-99'})),'11','80-99% return');
assert(pickNo(figDraftExplorerSelect(rows,{returnBand:'0'})),'24','0 return');
assert(pickNo(figDraftExplorerSelect(rows,{round:'4',team:'2'})),'40','round and team');
assert(pickNo(figDraftExplorerSelect(rows,{year:'2025'})),'1','year');
assert(pickNo(figDraftExplorerSelect(rows,{query:'gamma'})),'24','player search');
assert(pickNo(figDraftExplorerSelect(rows,{minValue:'200'})),'11,1','minimum value');
assert(pickNo(figDraftExplorerSelect(rows,{sort:'return'})),'40,1,11,24','return sort');
assert(pickNo(figDraftExplorerSelect(rows,{sort:'grade'})),'1,40,11,24','grade sort');
"""
        result = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
