"""Structured injury discovery: leads only, never automatically award counts."""
import importlib.util
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "scripts" / "discover_injury_candidates.py"
spec = importlib.util.spec_from_file_location("discover_injury_candidates", MODULE)
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)


def roster(week, season=2026, starter=True, player="Sam Darnold", pid="4943"):
    return {"season": season, "week": week, "franchise_id": 5,
            "player_id": pid, "player_name": player, "position": "QB",
            "owner_name": "Leyton", "starter_status": "Starter" if starter else "Bench",
            "counts_for_official_records": True}


def snap(week, pct, player="Sam Darnold"):
    return {"week": str(week), "player": player, "position": "QB",
            "offense_pct": str(pct), "offense_snaps": str(int(pct * 65))}


def injury(week, player="Sam Darnold"):
    return {"week": str(week), "full_name": player, "report_primary_injury": "Glute",
            "report_status": "Out", "practice_primary_injury": "", "practice_status": ""}


class StructuredInjuryDiscovery(unittest.TestCase):
    def base(self):
        rosters = [roster(1), roster(3), roster(4)]
        snaps = {2026: [snap(1, 0.08), snap(3, 0.95), snap(4, 0.95)]}
        reports = {2026: [injury(2)]}
        return rosters, snaps, reports

    def test_sam_darnold_pattern_found_and_never_verified_automatically(self):
        rosters, snaps, reports = self.base()
        result = scan.find_review_candidates(rosters, snaps, reports, [])
        self.assertEqual(result["candidate_count"], 1)
        lead = result["candidates"][0]
        self.assertEqual(lead["player_name"], "Sam Darnold")
        self.assertEqual(lead["season"], 2026)
        self.assertEqual(lead["week"], 1)
        self.assertEqual(lead["priority"], "higher")
        self.assertEqual(lead["inference_tier"], "automated_estimate")
        self.assertFalse(lead["counts_toward_verified_injuries"])
        self.assertEqual(result["schema_version"], 2)
        self.assertEqual(result["automatic_estimate_count"], 1)
        self.assertEqual(lead["review_status"], "candidate_unverified_do_not_count")
        self.assertFalse(result["counts_toward_injuries"])
        self.assertTrue(lead["starter"])
        self.assertEqual(lead["injury_report_detail"]["injury"], "Glute")

    def test_existing_reviewed_events_are_not_doubled(self):
        rosters, snaps, reports = self.base()
        existing = [{"season": 2026, "week": 1, "sleeper_player_id": "4943",
                     "verification_status": "verified"}]
        result = scan.find_review_candidates(rosters, snaps, reports, existing)
        self.assertTrue(result["candidates"][0]["already_verified"])
        self.assertFalse(result["counts_toward_injuries"])

    def test_normal_snap_share_with_injury_report_is_not_flagged(self):
        rosters, snaps, reports = self.base()
        snaps[2026][0] = snap(1, 0.91)
        self.assertEqual(scan.find_review_candidates(rosters, snaps, reports, [])["candidate_count"], 0)

    def test_questionable_status_is_archived_not_counted(self):
        rosters, snaps, reports = self.base()
        reports[2026][0]["report_status"] = "Questionable"
        result = scan.find_review_candidates(rosters, snaps, reports, [])
        self.assertEqual(result["candidate_count"], 1)
        self.assertEqual(result["automatic_estimate_count"], 0)
        self.assertEqual(result["automatically_archived_count"], 1)
        self.assertEqual(result["candidates"][0]["inference_tier"], "archived_weak_signal")

    def test_out_two_weeks_later_is_not_strong_automatic_signal(self):
        rosters, snaps, reports = self.base()
        reports[2026][0]["week"] = "3"
        result = scan.find_review_candidates(rosters, snaps, reports, [])
        self.assertEqual(result["automatic_estimate_count"], 0)

    def test_illness_excluded_from_auto_injury_estimate(self):
        rosters, snaps, reports = self.base()
        reports[2026][0]["report_primary_injury"] = "Illness"
        result = scan.find_review_candidates(rosters, snaps, reports, [])
        self.assertEqual(result["automatic_estimate_count"], 0)

    def test_short_exit_and_full_normal_finish_cannot_be_verified(self):
        # Both strong snapshots can still describe a coaching benching or
        # a temporary return; estimation is never an official injury event.
        rosters, snaps, reports = self.base()
        result = scan.find_review_candidates(rosters, snaps, reports, [])
        self.assertFalse(result["counts_toward_injuries"])
        self.assertFalse(result["candidates"][0]["counts_toward_verified_injuries"])

    def test_benched_regular_rotation_still_matched(self):
        rosters = [roster(1), roster(2), roster(3, starter=False)]
        snaps = {2026: [snap(1, 0.90), snap(2, 0.91), snap(3, 0.06), snap(4, 0.90)]}
        result = scan.find_review_candidates(rosters, snaps, {2026: [injury(4)]}, [])
        # Only week 3 drop should qualify, with at least two prior fantasy starts.
        matched = [r for r in result["candidates"] if r["week"] == 3]
        self.assertEqual(len(matched), 1)
        self.assertTrue(matched[0]["established_rotation"])
        self.assertFalse(matched[0]["starter"])

    def test_nonappearance_or_bye_does_not_enter_in_game_leads(self):
        rosters, snaps, reports = self.base()
        # Absence in Week 1 is NOT proof of an in-game injury. NFL bye weeks
        # create identical no-snap patterns in weekly fantasy rosters.
        snaps[2026] = [snap(3, 0.90), snap(4, 0.95)]
        result = scan.find_review_candidates(rosters, snaps, reports, [])
        self.assertEqual(result["candidate_count"], 0)
        self.assertEqual(result["candidates"], [])

    def test_incomplete_week_cannot_enter_pilot(self):
        rosters, snaps, reports = self.base()
        rosters[0]["counts_for_official_records"] = False
        self.assertEqual(scan.find_review_candidates(rosters, snaps, reports, [])["candidate_count"], 0)

    def test_lack_of_baseline_does_not_fabricate_injury(self):
        rosters, snaps, reports = self.base()
        snaps[2026] = [snap(1, 0.03), snap(3, 0.92)]
        self.assertEqual(scan.find_review_candidates(rosters, snaps, reports, [])["candidate_count"], 0)

    def test_missed_game_not_counted_even_with_injury_report(self):
        rosters, snaps, reports = self.base()
        # A later Week 2 "Out" designation is not evidence that he left an
        # actual Week 1 game unless there are Week 1 playing-time records.
        snaps[2026] = [snap(3, 0.95), snap(4, 0.93)]
        reports[2026] = [injury(2)]
        self.assertEqual(scan.find_review_candidates(rosters, snaps, reports, [])["candidate_count"], 0)

    def test_percentage_format_variations(self):
        self.assertAlmostEqual(scan.offensive_pct("8.0"), 0.08)
        self.assertAlmostEqual(scan.offensive_pct("8%"), 0.08)
        self.assertAlmostEqual(scan.offensive_pct("0.08"), 0.08)


if __name__ == "__main__":
    unittest.main()
