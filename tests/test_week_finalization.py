"""Offline regression checks for independently finalizing completed NFL weeks."""
import unittest
from datetime import datetime, timedelta
from scripts.week_finalization import (
    EASTERN, all_games_final, independent_week_final, week_cutoff, signature,
)
from scripts.prepare_player_records import cutoff_by_season


def et(day, hour, minute=0):
    return datetime.fromisoformat(f"{day}T{hour:02}:{minute:02}:00").replace(tzinfo=EASTERN)


def week_games(monday="2026-10-12", unfinished=False, count=13):
    start = datetime.fromisoformat(monday + "T20:00:00+00:00")
    return {"events": [{
        "id": str(i),
        "date": (start - timedelta(days=4 if i == 0 else 0)).isoformat(),
        "status": {"type": {"completed": not (unfinished and i == 2)}},
    } for i in range(count)]}


class FinalizationChecks(unittest.TestCase):
    def test_monday_eastern_cutoff_is_exact(self):
        self.assertFalse(all_games_final(week_games(), et("2026-10-12", 23, 44)))
        self.assertTrue(all_games_final(week_games(), et("2026-10-12", 23, 45)))
        self.assertTrue(all_games_final(week_games(), et("2026-10-13", 0)))

    def test_finalization_rejects_ongoing_or_partial_schedule(self):
        self.assertFalse(all_games_final(week_games(unfinished=True), et("2026-10-12", 23, 58)))
        self.assertFalse(all_games_final(week_games(count=9), et("2026-10-12", 23, 58)))

    def test_independent_confirmation_must_pass_both_conditions(self):
        calls = []
        def fetch(year, week):
            calls.append((year, week))
            return week_games()
        self.assertFalse(independent_week_final(2026, 5, et("2026-10-12", 23, 44), fetch))
        self.assertEqual(calls, [])
        self.assertTrue(independent_week_final(2026, 5, et("2026-10-12", 23, 45), fetch))
        self.assertEqual(calls, [(2026, 5)])

    def test_verified_week_used_while_sleeper_marker_lags(self):
        self.assertEqual(week_cutoff("in_season", 5, 4, 0), 4)
        self.assertEqual(week_cutoff("in_season", 5, 4, 5), 5)
        self.assertEqual(week_cutoff("in_season", 6, 4, 5), 5)
        self.assertEqual(week_cutoff("in_season", 5, 4, 9), 5)
        history = [{"season": 2026, "status": "in_season", "current_leg": 5}]
        settings = [{"season": 2026, "settings_json": '{"last_scored_leg":4}'}]
        self.assertEqual(cutoff_by_season(history, settings, {"2026": 5})["2026"], 5)
        self.assertEqual(cutoff_by_season(history, settings, {})["2026"], 4)

    def test_stat_corrections_change_stored_scores(self):
        scores = [{"roster_id": i, "points": i * 11.0} for i in range(1, 11)]
        before = signature(scores)
        scores[0]["points"] = 11.01
        self.assertNotEqual(signature(scores), before)
        self.assertIsNone(signature(scores[:9]))


if __name__ == "__main__":
    unittest.main()
