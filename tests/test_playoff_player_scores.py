"""Player score forecasts include bench games and ignore unfinalized weeks."""
import unittest
from scripts.build_playoff_player_scores import player_scores


class PlayoffPlayerScoresTests(unittest.TestCase):
    def test_last_eight_last_three_include_bench(self):
        rows = [
            {"season": 2026, "week": week, "player_id": "qb", "franchise_id": 1,
             "fantasy_points": week,
             "starter_status": "Starter" if week == 4 else "Bench"}
            for week in range(1, 11)
        ]
        rows.append({"season": 2026, "week": 9, "player_id": "qb", "franchise_id": 2,
                     "fantasy_points": 9, "starter_status": "Bench"})
        result = player_scores(rows, 2026, 9)
        rate = result["players"]["qb"]
        # Completed weeks 2..9 -> 5.5 PPG; completed weeks 7..9 -> 8 PPG.
        self.assertEqual(rate["last8_avg"], 5.5)
        self.assertEqual(rate["last3_avg"], 8.0)
        self.assertEqual(rate["projection"], 6.25)
        self.assertEqual(rate["games"], 8)
        self.assertEqual(result["through_week"], 9)

    def test_last_eight_rolls_across_seasons(self):
        rows = [
            {"season": 2025, "week": 16, "player_id": "rb", "franchise_id": 1,
             "fantasy_points": 30, "starter_status": "Bench"},
            {"season": 2026, "week": 1, "player_id": "rb", "franchise_id": 1,
             "fantasy_points": 10, "starter_status": "Bench"},
        ]
        result = player_scores(rows, 2026, 1)
        self.assertEqual(result["players"]["rb"]["projection"], 20)
        self.assertEqual(result["players"]["rb"]["games"], 2)

    def test_only_complete_ten_player_starter_groups(self):
        rows = []
        for week in (1, 2, 3):
            for slot in range(10):
                rows.append({"season": 2026, "week": week, "player_id": str(slot + 1),
                             "franchise_id": 1, "fantasy_points": slot + week,
                             "starter_status": "Starter"})
        for slot in range(9):
            rows.append({"season": 2026, "week": 4, "player_id": str(slot + 1),
                         "franchise_id": 1, "fantasy_points": 100,
                         "starter_status": "Starter"})
        result = player_scores(rows, 2026, 3)
        self.assertEqual(len(result["previous_lineups"]["1"]), 3)
        self.assertTrue(all(len(ids) == 10 for ids in result["previous_lineups"]["1"]))
        self.assertEqual(result["players"]["1"]["last3_avg"], 2.0)


if __name__ == "__main__":
    unittest.main()
