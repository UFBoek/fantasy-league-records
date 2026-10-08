import json
from pathlib import Path
import shutil
import tempfile
import unittest
from scripts.import_rosteraudit_csv import import_csv, REFERENCE

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'resources'/'rosteraudit-rankings-2026-10-08.csv'

class SnapshotImportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.data = Path(self.tmp.name)
        for name in set(REFERENCE)|{'league_settings'}:
            shutil.copy2(ROOT/'data'/f'{name}.json', self.data/f'{name}.json')

    def test_import_verified_csv_rows_without_guessing(self):
        snapshot = import_csv(SOURCE, '2026-10-08', self.data)
        self.assertEqual(snapshot['status'], 'ready')
        self.assertEqual(snapshot['updated_at'], '2026-10-08')
        self.assertEqual((len(snapshot['players']),len(snapshot['future_picks'])), (389,36))
        self.assertEqual(snapshot['coverage']['current_roster_matched_players'],304)
        self.assertEqual(snapshot['coverage']['current_roster_unique_players'],315)
        self.assertFalse(snapshot['snapshot_source']['preset_verified'])
        self.assertEqual(snapshot['players']['9509']['value'],9954)
        self.assertEqual(snapshot['future_picks']['2027:1:mid'],2662)
        self.assertEqual(len(snapshot['coverage']['unmatched_csv']),18)
        self.assertEqual(snapshot['coverage']['ambiguous_csv'],[])
        self.assertEqual(snapshot['attribution']['url'],'https://rosteraudit.com')
        self.assertEqual(json.loads((self.data/'rosteraudit_values.json').read_text())['players']['9509']['value'],9954)

    def test_bad_csv_preserves_last_good_snapshot(self):
        dest=self.data/'rosteraudit_values.json'
        dest.write_text('previous verified snapshot')
        bad=self.data/'bad.csv';bad.write_text('Rank,Player,Value\n1,Test,999\n')
        with self.assertRaises(ValueError):
            import_csv(bad, '2026-10-08', self.data)
        self.assertEqual(dest.read_text(), 'previous verified snapshot')

if __name__=='__main__': unittest.main()
