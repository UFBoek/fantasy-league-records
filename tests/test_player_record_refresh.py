"""Offline contract tests for the daily Sleeper player archive and week cutoff."""
import unittest

from scripts.prepare_player_records import cutoff_by_season, normalize_player_log


HISTORY = [
    {"season": 2025, "status": "complete", "current_leg": 17},
    {"season": 2026, "status": "in_season", "current_leg": 5},
]


def row(**kwargs):
    example = {
        "season": "2026", "week": 4, "game_type": "Regular Season",
        "franchise_id": 1, "owner_name": "Boek",
        "player_id": "123", "full_name": "Sample Player",
        "position": "QB", "fantasy_points": 27.5,
        "is_starter": True, "counts_for_player_records": True,
    }
    example.update(kwargs)
    return example


class LivePlayerLogContract(unittest.TestCase):
    def test_active_season_excludes_current_week(self):
        self.assertEqual(cutoff_by_season(HISTORY), {"2025": 17, "2026": 4})
        rows = [row(player_id=str(i), week=4) for i in range(1, 102)]
        self.assertEqual(len(normalize_player_log(rows, HISTORY)), 101)
        with self.assertRaisesRegex(ValueError, "Unfinished/future player week"):
            normalize_player_log(rows + [row(player_id="999", week=5)], HISTORY)

    def test_unfinished_week_rejected_even_if_current_leg_advanced(self):
        settings = [{
            "season": 2026,
            "settings_json": '{"leg": 5, "last_scored_leg": 3}',
        }]
        self.assertEqual(cutoff_by_season(HISTORY, settings)["2026"], 3)
        rows = [row(player_id=str(i), week=4) for i in range(1, 102)]
        with self.assertRaisesRegex(ValueError, "Unfinished/future"):
            normalize_player_log(rows, HISTORY, settings)

    def test_restores_previous_website_fields(self):
        rows = [row(player_id=str(i), week=4) for i in range(1, 102)]
        result = normalize_player_log(rows, HISTORY)
        self.assertEqual(result[0]["player_name"], "Sample Player")
        self.assertEqual(result[0]["starter_points"], 27.5)
        self.assertNotIn("fantasy_points", result[0])
        self.assertNotIn("full_name", result[0])

    def test_legacy_fields_remain_compatible(self):
        rows = [row(player_id=str(i), player_name="Legacy Name", starter_points=8.5) for i in range(1, 102)]
        self.assertEqual(normalize_player_log(rows, HISTORY)[0]["starter_points"], 8.5)

    def test_requires_complete_and_unique_starter_rows(self):
        rows = [row(player_id=str(i)) for i in range(1, 102)]
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            normalize_player_log(rows + [row(player_id="1")], HISTORY)
        with self.assertRaisesRegex(ValueError, "Only 0 official"):
            normalize_player_log([row(is_starter=False)], HISTORY)
        with self.assertRaisesRegex(ValueError, "Invalid official player row"):
            normalize_player_log([row(player_id=str(i), fantasy_points=float("nan")) for i in range(1, 102)], HISTORY)

    def test_completed_season_accepts_final_week(self):
        rows = [row(season="2025", week=17, player_id=str(i)) for i in range(1, 102)]
        self.assertEqual(len(normalize_player_log(rows, HISTORY)), 101)


if __name__ == "__main__":
    unittest.main()
