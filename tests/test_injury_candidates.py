"""Prospective injury leads are matched to fantasy roles but never counted."""
import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("build_injury_candidates", SCRIPTS / "build_injury_candidates.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def player(week, starter, owner=5, name="Demo Player", player_id="42", season=2026):
    return {
        "season": season, "week": week, "franchise_id": owner,
        "owner_name": "manager", "player_name": name, "player_id": player_id,
        "starter_status": "Starter" if starter else "Bench",
        "counts_for_official_records": True,
    }


class InjuryLeadTests(unittest.TestCase):
    def lead(self, week=4, name="Demo Player"):
        return [{"season": 2026, "week": week, "player_name": name,
                 "source_url": "https://www.nfl.com/news/verified-article",
                 "reason": "Potential game-exit evidence"}]

    def test_started_lead_is_only_review_candidate(self):
        rows = [player(1, True), player(2, True), player(3, False), player(4, True)]
        report = mod.build_candidates(self.lead(), rows, [])
        self.assertEqual(report["lead_count"], 1)
        self.assertEqual(report["potentially_relevant_leads"], 1)
        self.assertFalse(report["counts_toward_injuries"])
        self.assertEqual(report["leads"][0]["review_status"], "unverified_lead_do_not_count")
        match = report["leads"][0]["roster_matches"][0]
        self.assertTrue(match["starter"])
        self.assertTrue(match["established_rotation"])
        self.assertFalse(match["already_verified"])

    def test_bench_rotation_lead_remains_uncounted(self):
        rows = [player(1, True), player(2, True), player(3, False), player(4, False)]
        report = mod.build_candidates(self.lead(), rows, [])
        match = report["leads"][0]["roster_matches"][0]
        self.assertFalse(match["starter"])
        self.assertTrue(match["established_rotation"])
        self.assertTrue(match["potentially_relevant"])
        self.assertFalse(report["counts_toward_injuries"])

    def test_cannot_count_current_incomplete_week(self):
        rows = [player(1, True), player(2, True), {
            **player(5, True), "counts_for_official_records": False
        }]
        report = mod.build_candidates(self.lead(5), rows, [])
        self.assertEqual(report["potentially_relevant_leads"], 0)
        self.assertEqual(report["leads"][0]["roster_matches"], [])

    def test_reviewed_event_links_without_duplicate_counting(self):
        rows = [player(4, True)]
        reviewed = [{"season": 2026, "week": 4, "sleeper_player_id": "42",
                     "verification_status": "verified"}]
        report = mod.build_candidates(self.lead(), rows, reviewed)
        self.assertTrue(report["leads"][0]["roster_matches"][0]["already_verified"])
        self.assertFalse(report["counts_toward_injuries"])

    def test_untrusted_or_duplicated_lead_is_rejected(self):
        rows = [player(4, True)]
        bad = self.lead()[0].copy()
        bad["source_url"] = "http://unknown.invalid"
        with self.assertRaises(ValueError):
            mod.build_candidates([bad], rows, [])
        with self.assertRaises(ValueError):
            mod.build_candidates(self.lead() * 2, rows, [])

    def test_unrostered_lead_does_not_attribute_to_manager(self):
        rows = [player(4, True, name="Another Player")]
        report = mod.build_candidates(self.lead(), rows, [])
        self.assertEqual(report["leads"][0]["roster_matches"], [])
        self.assertEqual(report["potentially_relevant_leads"], 0)


if __name__ == "__main__":
    unittest.main()
