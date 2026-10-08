"""Regression coverage for Sleeper-verified James/Hayden asset pathways."""
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('trade_lineage',ROOT/'scripts'/'build_trade_lineage.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class TradeLineageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result=mod.build()
    def test_direct_trades(self):
        self.assertEqual(self.result['trade_count'],12)
        self.assertEqual(len(self.result['asset_paths']),55)
    def test_gibbs_package(self):
        g=self.result['featured']['gibbs']
        self.assertEqual(g['trade_id'],'1282243735618342912')
        self.assertEqual(g['assets_received'],['Jahmyr Gibbs'])
        self.assertEqual({x['asset_key'] for x in g['direct_archive_links']},{'pick:2028:1:10','pick:2027:4:3'})
        self.assertEqual(len(g['assets_sent']),5)
        self.assertIn('Bucky Irving',g['assets_sent'])
        for link in g['direct_archive_links']:
            path=self.result['asset_paths'][f"{link['source_trade_id']}:6:{link['asset_key']}"]
            self.assertEqual(path['first_exchange']['trade_id'],g['trade_id'])
    def test_loveland_chain(self):
        l=self.result['featured']['loveland']
        self.assertEqual(l['trade_id'],'1159680671628107776')
        self.assertEqual(l['pick'],'2.01')
        self.assertEqual(l['pick_acquired'],"2025 R2 · Sack's pick")
        self.assertEqual(len(l['direct_archive_links']),1)
        origin=l['direct_archive_links'][0]
        self.assertEqual(origin['source_trade_id'],'1004211530289729536')
        self.assertEqual(origin['asset'],'J.K. Dobbins')
        self.assertEqual(len(l['assets_sent']),2)
        self.assertIn('J.K. Dobbins',l['assets_sent'])
    def test_pick_drafted_while_moving(self):
        p=self.result['asset_paths']['999843359558574080:10:pick:2025:3:5']
        self.assertTrue(p['transfers'])
        self.assertTrue(p['draft_outcome']['verified'])
        self.assertEqual(p['draft_outcome']['player_name'],'Tyler Shough')
    def test_every_transfer_has_evidence_and_no_ownership_jumps(self):
        for row in self.result['asset_paths'].values():
            last=row['received_by']
            seen=set()
            for step in row['transfers']:
                self.assertEqual(step['from'],last)
                self.assertNotIn(step['trade_id'],seen)
                seen.add(step['trade_id'])
                self.assertTrue(step['package_size']>=1)
                last=step['to']

if __name__=='__main__':unittest.main()
