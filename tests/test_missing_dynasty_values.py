"""Missing RosterAudit player values default to zero when the feed is ready."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MissingDynastyPlayerValuesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "app.js").read_text(encoding="utf-8")
        cls.ra = json.loads((ROOT / "data/rosteraudit_values.json").read_text(encoding="utf-8"))
        cls.drafts = json.loads((ROOT / "data/draft_picks.json").read_text(encoding="utf-8"))

    def test_missing_named_rookies_are_zero_value_candidates(self):
        for name in ("Travis Hunter", "Ja'Lynn Polk"):
            selection = next(p for p in self.drafts if p["player_name"] == name)
            self.assertNotIn(str(selection["player_id"]), self.ra["players"])
        self.assertIn("return Number.isFinite(value)?Math.max(0,value):0;", self.app)

    def test_no_player_specific_overrides_and_all_drafts_use_shared_lookup(self):
        self.assertNotIn("Travis Hunter", self.app)
        self.assertNotIn("Ja'Lynn Polk", self.app)
        self.assertIn("const current=raPlayer(pick.player_id);", self.app)
        self.assertIn("valued=scoped.filter(x=>x.current!==null)", self.app)
        self.assertIn("if(current<=50||ratio<.2&&slot>=400)return 'F';", self.app)

    def test_frontend_valuations_and_grades(self):
        if not shutil.which("node"):
            self.skipTest("Node.js is not installed")
        ra_source = self.app.split("const raReady=()=>", 1)[1].split("// The original franchise", 1)[0]
        ra_source = "const raReady=()=>" + ra_source
        grade_source = self.app.split("function figDraftGradeLetter(current,slot,pick){", 1)[1].split(
            "const FIG_GRADE_POINTS", 1
        )[0]
        grade_source = "function figDraftGradeLetter(current,slot,pick){" + grade_source
        script = ra_source + grade_source + """
const data = {
 status: 'ready', players: {
  'ok': {value: 1200}, 'zero': {value: 0},
  'invalid': {value: null}, 'nan': {value: 'missing'},
  'negative': {value:-1}
 }
};
const DATA = {raValues: data};
function expect(got, wanted, label) {
 if (got !== wanted) throw new Error(label+': '+got+' !== '+wanted);
}
expect(raPlayer('ok'),1200,'known provider value');
expect(raPlayer('zero'),0,'reported zero');
for(const id of ['12530','11619','invalid','nan','negative']) {
 expect(raPlayer(id),0,'missing/invalid '+id);
}
expect(figDraftGradeLetter(raPlayer('12530'),3100,{round:1,draft_class:'Rookie'}),'F','Travis');
expect(figDraftGradeLetter(raPlayer('11619'),765,{round:2,draft_class:'Rookie'}),'F','Polk');
expect(raPlayer(''),null,'no player ID');
DATA.raValues={status:'unavailable',players:{ok:{value:1200}}};
expect(raPlayer('12530'),null,'feed outage is not zero');
"""
        result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
