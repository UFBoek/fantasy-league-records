"""Keep all-play record displays and automated exports aligned with league rules."""
import json
import unittest
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def data(name):
    return json.loads((ROOT / 'data' / (name + '.json')).read_text())


class AllPlayRecords(unittest.TestCase):
    def test_single_season_win_count_removed_but_percentage_kept(self):
        for table in ('single_season_records', 'team_season_top3'):
            categories = {r['record_category'] for r in data(table)}
            self.assertNotIn('All-Play Wins', categories)
            self.assertIn('All-Play Win Percentage', categories)

    def test_two_career_views_show_total_all_play_wins(self):
        career = {int(r['franchise_id']): int(r['all_play_wins']) for r in data('all_play_career')}
        raw = data('records')
        for view in ('All-Time Combined','Regular Season'):
            rows = [r for r in raw if r['category'] == 'Total All-Play Wins' and r['scoring_view'] == view]
            self.assertEqual(len(rows),len(career))
            self.assertEqual({r['franchise_id']:r['value'] for r in rows}, career)
            self.assertEqual({r['metric'] for r in rows},{'all_play_wins'})
            for r in rows:
                self.assertEqual(r['rank'], 1 + sum(v > r['value'] for v in career.values()))
        self.assertFalse([r for r in raw if r['category']=='Total All-Play Wins' and r['scoring_view']=='Playoffs'])

    def test_all_play_totals_are_regular_season_only(self):
        sums = defaultdict(int)
        for r in data('all_play_seasons'):
            sums[int(r['franchise_id'])] += int(r['all_play_wins'])
        for r in data('all_play_career'):
            self.assertEqual(int(r['all_play_wins']),sums[int(r['franchise_id'])])

    def test_daily_backend_definitions(self):
        source = (ROOT/'scripts'/'build_site_data.py').read_text()
        season_def = source.split('candidate_metrics = [',1)[1].split('season_record_metrics =',1)[0]
        self.assertNotIn('"All-Play Wins"',season_def)
        self.assertIn('"All-Play Win Percentage"',season_def)
        self.assertIn('"Total All-Play Wins"',source)
        self.assertIn('for _record_view in ("All-Time Combined", "Regular Season")',source)

    def test_manifest(self):
        self.assertEqual(data('manifest')['Records'],len(data('records')))

if __name__=='__main__':
    unittest.main()
