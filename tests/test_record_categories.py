"""Guard against returning redundant scoring-average team record categories."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RemovedScoringAverageRecords(unittest.TestCase):
    def test_shipped_record_categories(self):
        excluded = {'Career Scoring Average', 'Season Scoring Average', 'Scoring Average'}
        for name, key in (
            ('records.json', 'category'),
            ('single_season_records.json', 'record_category'),
            ('team_season_top3.json', 'record_category'),
        ):
            with self.subTest(dataset=name):
                rows = json.loads((ROOT / 'data' / name).read_text())
                categories = {row.get(key) for row in rows}
                self.assertFalse(excluded & categories)
                if name == 'records.json':
                    self.assertIn('Career Points Scored', categories)
                    self.assertIn('NFL Player Career Average', categories)
                if name == 'single_season_records.json':
                    self.assertIn('Points For', categories)
                    self.assertIn('Median Score', categories)

    def test_backend_does_not_rebuild_removed_categories(self):
        source = (ROOT / 'scripts' / 'build_site_data.py').read_text()
        for name in ('Career Scoring Average', 'Season Scoring Average'):
            self.assertNotIn('"' + name + '"', source)
        self.assertNotIn('"Scoring Average",\n        "points_per_game"', source)
        self.assertIn('"Career Points Scored"', source)

    def test_manifest_matches_record_count(self):
        manifest = json.loads((ROOT / 'data' / 'manifest.json').read_text())
        records = json.loads((ROOT / 'data' / 'records.json').read_text())
        self.assertEqual(manifest['Records'], len(records))
