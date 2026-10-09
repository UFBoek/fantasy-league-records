"""No zero-snap-loss injury may enter the fantasy injury totals."""
import importlib.util
import unittest
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts" / "build_injury_history.py"
spec = importlib.util.spec_from_file_location("build_injury_history", PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def week(n, started=True, player="123", franchise=6):
    return {
        "season": 2026, "week": n, "franchise_id": franchise,
        "player_id": player, "player_name": "Sample Player",
        "owner_name": "Sample Manager", "position": "QB",
        "starter_status": "Starter" if started else "Bench",
        "counts_for_official_records": True,
    }


def event(key, week_number=4, **changes):
    row = {
        "event_id": key, "season": 2026, "week": week_number,
        "sleeper_player_id": "123", "player_name": "Sample Player",
        "verification_status": "verified",
        "source_url": "https://example.org/verified-injury",
        "injury_description": "Game exit with confirmed missed playing time",
        "exited_due_to_injury": True, "missed_snaps_confirmed": True,
        "subsequent_nfl_games_missed": 1,
        "placed_on_ir": False, "season_ending": False,
        "severity_source_url": None,
    }
    row.update(changes)
    return row


class InjuryHistoryTests(unittest.TestCase):
    def setUp(self):
        self.roster = [week(1), week(2), week(3, False), week(4)]

    def test_confirmed_exit_counts_started_and_rotation(self):
        result = mod.compute_injuries([event("exit-1")], self.roster)
        totals = result["by_franchise"]["6"]
        self.assertEqual(totals["started_in_game_injuries"], 1)
        self.assertEqual(totals["rotation_injuries"], 1)
        self.assertEqual(totals["major_rotation_injuries"], 0)

    def test_player_plays_through_injury_with_zero_missed_snaps(self):
        result = mod.compute_injuries([
            event("played-through", missed_snaps_confirmed=False,
                  exited_due_to_injury=False, subsequent_nfl_games_missed=0)
        ], self.roster)
        self.assertEqual(result["events"], [])
        self.assertEqual(result["by_franchise"], {})
        self.assertEqual(len(result["rejected_unverified_events"]), 1)

    def test_rotation_injury_counts_when_benched(self):
        roster = [week(1), week(2), week(3, False), week(4, False)]
        result = mod.compute_injuries([event("bench-exit")], roster)
        self.assertEqual(result["by_franchise"]["6"]["started_in_game_injuries"], 0)
        self.assertEqual(result["by_franchise"]["6"]["rotation_injuries"], 1)

    def test_major_requires_severity_evidence(self):
        injury = event("major", placed_on_ir=True, subsequent_nfl_games_missed=4,
                       severity_source_url="https://example.org/ir-confirmation")
        result = mod.compute_injuries([injury], self.roster)
        self.assertEqual(result["by_franchise"]["6"]["major_rotation_injuries"], 1)

    def test_no_evidence_cannot_count_major(self):
        injury = event("not-proven", placed_on_ir=True, subsequent_nfl_games_missed=4,
                       missed_snaps_confirmed=False, exited_due_to_injury=False)
        result = mod.compute_injuries([injury], self.roster)
        self.assertEqual(result["events"], [])
        self.assertEqual(len(result["rejected_unverified_events"]), 1)

    def test_no_in_progress_fantasy_matchups(self):
        roster = [week(1), week(2), week(3, False), {**week(4), "counts_for_official_records": False}]
        result = mod.compute_injuries([event("in-progress")], roster)
        self.assertEqual(result["events"], [])

    def test_empty_ledger_is_partial_evidence_not_zero_injuries(self):
        result = mod.compute_injuries([], self.roster)
        self.assertEqual(result["events"], [])
        self.assertFalse(result["is_complete_historical_census"])
        self.assertEqual(result["coverage"], "reviewed_events_only")

    def test_one_event_does_not_duplicate_categories(self):
        result = mod.compute_injuries([event("one"), event("one")], self.roster)
        self.assertEqual(len(result["events"]), 1)
        self.assertEqual(len(result["rejected_unverified_events"]), 1)


if __name__ == "__main__":
    unittest.main()
