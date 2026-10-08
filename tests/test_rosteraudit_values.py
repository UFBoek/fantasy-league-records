import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
from scripts import build_rosteraudit_values as ra

class RosterAuditTests(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.TemporaryDirectory()
        self.addCleanup(self.root.cleanup)
        self.data = Path(self.root.name)
        cfg = [{'season':2026, 'scoring_settings_json': json.dumps({'rec':1,'bonus_rec_te':0,'pass_td':5,'pass_cmp':.15}),
                'roster_positions_json':json.dumps(['QB','RB','WR','TE','FLEX','SUPER_FLEX']), 'total_rosters':10}]
        (self.data/'league_settings.json').write_text(json.dumps(cfg))
        self.patch = mock.patch.object(ra, 'DATA', self.data)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def test_format_from_actual_10_team_sf_full_ppr(self):
        cfg = ra.league_format(json.loads((self.data/'league_settings.json').read_text())[0])
        self.assertEqual((cfg['key'],cfg['teams'],cfg['format']), ('sf_ppr',10,'sf'))
        self.assertTrue(cfg['approximation'])

    def test_values_ignore_metadata_and_preserve_sleeper_ids(self):
        raw = {str(i):{'sf':i*10,'1qb':i*4} for i in range(1000,1060)}
        raw['attribution'] = 'Values by RosterAudit.com'
        obj = ra._iter_lightweight(raw, 'sf')
        self.assertEqual(len(obj),60)
        self.assertEqual(obj['1005']['value'],10050)
        self.assertNotIn('attribution',obj)

    def test_pick_matching_requires_explicit_midpoint(self):
        raw={'picks':[{'year':2027,'round':1,'early':{'val_sf':4300},'mid':{'val_sf':3500},'late':{'val_sf':3000}},
                       {'year':2028,'round':2,'slot':'mid','val_sf':1450}]}
        self.assertEqual(ra.parse_picks(raw,'sf')['2027:1:mid'],3500)
        self.assertEqual(ra.parse_picks(raw,'sf')['2028:2:mid'],1450)
        self.assertNotIn('2027:1:1', ra.parse_picks(raw,'sf'))

    def test_refresh_fixtures_writes_only_verified_values(self):
        values={str(i):{'sf':i+5000,'1qb':i+4000} for i in range(100,160)}
        ranks={'players':[{'sleeper_id':str(i),'value':i+9000,'position':'QB'} for i in range(100,160)]}
        picks={'picks':[{'season':2027,'round':1,'slot':'mid','val_sf':3200}]}
        payload=ra.refresh(fixture_values=values,fixture_rankings=ranks,fixture_picks=picks)
        self.assertTrue(payload['size_adjusted'])
        self.assertEqual(payload['players']['104']['value'],9104)
        self.assertEqual(payload['future_picks']['2027:1:mid'],3200)
        self.assertEqual(payload['attribution']['url'],'https://rosteraudit.com')
        self.assertTrue((self.data/'rosteraudit_values.json').exists())

    def test_early_2027_house_rule_reference_survives_mid_only_api_update(self):
        original = {'status':'ready', 'format':{'key':'sf_ppr'},
                    'future_picks':{'2027:1:early':4924,'2027:2:early':1298,
                                    '2027:3:early':386,'2027:4:early':161}}
        (self.data/'rosteraudit_values.json').write_text(json.dumps(original))
        players={str(i):{'sf':i+5000} for i in range(100,160)}
        picks={'picks':[{'year':2027,'round':1,'slot':'mid','val_sf':2000}]}
        output=ra.refresh(fixture_values=players,fixture_picks=picks,fixture_rankings={})
        self.assertEqual(output['future_picks']['2027:1:early'],4924)
        self.assertEqual(output['future_picks']['2027:4:early'],161)
        self.assertEqual(len(output['carried_early_2027_tiers']),4)
        self.assertEqual(output['future_picks']['2027:1:mid'],2000)

    def test_hayden_boek_late_year_tiers_survive_missing_api_update(self):
        original = {'status':'ready', 'format':{'key':'sf_ppr'},
                    'future_picks':{'2027:1:late':2207,'2028:2:late':594,
                                    '2029:4:late':77,'2027:1:mid':2662}}
        (self.data/'rosteraudit_values.json').write_text(json.dumps(original))
        players={str(i):{'sf':i+5000} for i in range(100,160)}
        picks={'picks':[{'year':2027,'round':1,'slot':'mid','val_sf':2222},
                       {'year':2029,'round':4,'slot':'late','val_sf':80}]}
        output=ra.refresh(fixture_values=players,fixture_picks=picks,fixture_rankings={})
        self.assertEqual(output['future_picks']['2027:1:late'],2207)
        self.assertEqual(output['future_picks']['2028:2:late'],594)
        self.assertEqual(output['future_picks']['2029:4:late'],80)  # fresh beats saved
        self.assertEqual(output['future_picks']['2027:1:mid'],2222)
        self.assertEqual(output['carried_late_pick_tiers'],['2027:1:late','2028:2:late'])

    def test_bad_result_preserves_last_snapshot(self):
        target=self.data/'rosteraudit_values.json'
        target.write_text('old valid snapshot')
        with self.assertRaises(ValueError):
            ra.refresh(fixture_values={'100':{'sf':50}},fixture_picks={},fixture_rankings={})
        self.assertEqual(target.read_text(),'old valid snapshot')

if __name__=='__main__':unittest.main()
