"""Offline checks for stable linear-draft original franchise attribution."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from rookie_pick_attribution import attribute_linear_rookie_picks, CONFIRMED_ORIGINAL_DRAFT_ORDERS


def fixture(year='2024'):
    order=CONFIRMED_ORIGINAL_DRAFT_ORDERS[year]
    d={'draft_id':'test','draft_kind':'rookie','draft_type':'linear','draft_season':year,
       'status':'complete','teams':10,'rounds':1,'slot_to_roster_id':{str(i):p for i,p in enumerate(order,1)}}
    picks=[]
    audit=[]
    for slot, original in enumerate(order,1):
        # Deliberately give every pick to a *different* selection owner.
        chosen=(original % 10) + 1
        picks.append({'draft_kind':'rookie','draft_id':'test','round':1,'draft_slot':slot,
                      'pick_no':slot,'player_name':f'Player {slot}','player_id':str(slot),
                      'selecting_roster_id':chosen})
        audit.append({'draft_id':'test','round':1,'original_franchise':original,
                      'expected_draft_owner':original,'chain_warnings':['PREVIOUS_OWNER_MISMATCH'],
                      'resolution_status':'UNRESOLVED_OWNERSHIP_CHAIN', 'pick_no':None,'player_name':None})
    return d,picks,audit


class AttributionTests(unittest.TestCase):
    def test_all_confirmed_orders_infer_all_slots_not_selectors(self):
        for yr in CONFIRMED_ORIGINAL_DRAFT_ORDERS:
            with self.subTest(year=yr):
                d,picks,audit=fixture(yr)
                result,counts=attribute_linear_rookie_picks(audit,[d],picks)
                self.assertEqual(counts,{yr:10})
                for i,original in enumerate(CONFIRMED_ORIGINAL_DRAFT_ORDERS[yr],1):
                    row=next(a for a in result if a['original_franchise']==original)
                    self.assertEqual((row['pick_no'],row['player_name']), (i,f'Player {i}'))
                    self.assertTrue(row['selection_verified_by_draft_slot'])
                    self.assertEqual(row['chain_warnings'], ['PREVIOUS_OWNER_MISMATCH'])
                    self.assertFalse(row['chain_final_owner_matches_selector'])

    def test_fail_on_confirmed_order_mismatch(self):
        d,picks,audit=fixture()
        d['slot_to_roster_id']['1'],d['slot_to_roster_id']['2']=d['slot_to_roster_id']['2'],d['slot_to_roster_id']['1']
        with self.assertRaisesRegex(ValueError,'no longer matches'):
            attribute_linear_rookie_picks(audit,[d],picks)

    def test_fail_on_duplicate_selection_slot(self):
        d,picks,audit=fixture()
        picks[1]['draft_slot']=1
        with self.assertRaises(ValueError):
            attribute_linear_rookie_picks(audit,[d],picks)

    def test_leave_snake_startup_untouched(self):
        d,picks,audit=fixture()
        d['draft_type']='snake'
        result,counts=attribute_linear_rookie_picks(audit,[d],picks)
        self.assertEqual(counts,{})
        self.assertEqual([r.get('player_name') for r in result], [None]*10)


if __name__ == '__main__': unittest.main()
