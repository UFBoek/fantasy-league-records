"""Active streaks should be compact, readable, sortable, and clickable."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


class ActiveStreakLeaderboardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app=(ROOT/"app.js").read_text(encoding="utf-8")
        cls.streaks=cls.app.split("async function streaks(){",1)[1].split("async function streakDetail(",1)[0]
        cls.style=(ROOT/"active-streaks-v130.css").read_text(encoding="utf-8")

    def test_compact_active_board_not_wide_sortable_table(self):
        self.assertIn("section('ACTIVE STREAKS',activeBoard)",self.streaks)
        self.assertNotIn("activeRows.length?sortableTable",self.streaks)
        self.assertIn("matching.slice(0,8)",self.streaks)
        self.assertIn("SHOW TOP 8",self.streaks)
        self.assertIn("SHOW ALL ",self.streaks)
        self.assertIn('id="figActiveStreakType"',self.streaks)
        self.assertIn('id="figActiveStreakSort"',self.streaks)
        self.assertIn("fig-active-streak-avatar",self.streaks)
        self.assertIn("fig-active-streak-since",self.streaks)
        self.assertIn("fig-active-streak-length",self.streaks)
        self.assertIn("'#/breakdown/streak/'",self.streaks)
        self.assertIn("aria-live",self.streaks)
        self.assertIn("@media(max-width:760px)",self.style)

    def test_filter_and_sort_match_running_streaks(self):
        if not shutil.which("node"):
            self.skipTest("Node.js unavailable")
        source=self.app.split("function figActiveStreakOrder(rows,type='all',sort='longest'){",1)[1].split(
            "async function streaks(){",1
        )[0]
        js="const num=n=>Number(n||0);\n"+"function figActiveStreakOrder(rows,type='all',sort='longest'){"+source+"""
const runs=[
 {streak_type:'Winning',length:3,franchise_id:1},
 {streak_type:'Above Median',length:9,franchise_id:2},
 {streak_type:'Winning',length:5,franchise_id:3},
 {streak_type:'Below Median',length:4,franchise_id:4}
];
function assert(actual,want){
 if(actual!==want)throw new Error(actual+' !== '+want);
}
const ids=values=>values.map(x=>x.franchise_id).join(',');
assert(ids(figActiveStreakOrder(runs,'all','longest')),'2,3,4,1');
assert(ids(figActiveStreakOrder(runs,'all','shortest')),'1,4,3,2');
assert(ids(figActiveStreakOrder(runs,'all','type')),'2,4,3,1');
assert(ids(figActiveStreakOrder(runs,'Winning','longest')),'3,1');
assert(ids(figActiveStreakOrder(runs,'Below Median','longest')),'4');
"""
        result=subprocess.run(["node","-e",js],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_entrypoint_and_service_worker_cache(self):
        html=(ROOT/"index.html").read_text(encoding="utf-8")
        sw=(ROOT/"sw.js").read_text(encoding="utf-8")
        self.assertIn("active-streaks-v130.css?v=130",html)
        self.assertIn("active-streaks-v130.css?v=130",sw)
        self.assertIn("app.js?v=130",html)
        self.assertIn("app.js?v=130",sw)


if __name__=="__main__":
    unittest.main()
