"""Both-sided conversion audit: no return invented outside a documented trade."""
import unittest
import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('trade_lineage_v52',ROOT/'scripts'/'build_trade_lineage.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class ConversionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output=mod.build()
    def test_both_sides_and_exact_received_counts(self):
        c=self.output['conversions']
        self.assertEqual(set(c),{'6','10'})
        for owner in c.values():
            self.assertEqual(owner['original_assets_received'],
                owner['assets_exchanged']+len(owner['picks_drafted'])+len(owner['assets_not_recorded_as_exchanged']))
            for group in owner['exchange_packages']:
                self.assertTrue(group['contributing_origins'])
                self.assertTrue(group['sent_package'])
                self.assertTrue(group['trade_id'])
                for origin in group['contributing_origins']:
                    self.assertIn(origin['asset'],group['sent_package'])
    def test_gibbs_and_loveland_in_hayden_conversions(self):
        by_id={g['trade_id']:g for g in self.output['conversions']['6']['exchange_packages']}
        self.assertIn('1282243735618342912',by_id)
        gibbs=by_id['1282243735618342912']
        self.assertEqual({a['asset_key'] for a in gibbs['contributing_origins']},
                         {'pick:2028:1:10','pick:2027:4:3'})
        self.assertEqual(len(gibbs['sent_package']),5)
        self.assertIn('Jahmyr Gibbs',[n['asset'] for n in gibbs['received_package']])
        loveland=by_id['1159680671628107776']
        self.assertIn('J.K. Dobbins',[x['asset'] for x in loveland['contributing_origins']])
        self.assertTrue(any(n['drafted_as'] and n['drafted_as']['player']=='Colston Loveland'
                            for n in loveland['received_package']))
    def test_downstream_trace_never_creates_invalid_details(self):
        def inspect(n):
            self.assertIn(n['status'],{'no_later_trade_recorded','drafted_by_recipient',
                'drafted_elsewhere_untraced','exchanged_again','more_trades_exist','ownership_cycle'})
            if n['status']=='exchanged_again':
                x=n['next_exchange'];self.assertTrue(x['trade_id'])
                for child in x['received']:inspect(child)
        for owner in self.output['conversions'].values():
            for group in owner['exchange_packages']:
                for node in group['received_package']:inspect(node)
if __name__=='__main__':unittest.main()
