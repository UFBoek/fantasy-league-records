"""NFL-wide waiver history and zero-history Sleeper projection safety tests."""
import unittest

from scripts.build_playoff_player_scores import (
    fantasy_score, nfl_week_points, nfl_games, player_scores,
    sleeper_fallbacks, source_rows,
)


class NflWideModelTests(unittest.TestCase):
    def setUp(self):
        self.scoring = {
            "rec": 1, "rec_yd": .1, "rush_yd": .1, "rush_td": 6,
            "rec_fd": .3, "bonus_rec_yd_100": 1,
        }

    def test_exact_league_scoring_avoids_canned_ppr_totals(self):
        points = fantasy_score(
            {"rec": 4, "rec_yd": 95, "rush_td": 1, "rec_fd": 2, "pts_ppr": 95},
            self.scoring)
        self.assertEqual(points, 20.1)

    def test_both_sleeper_shapes(self):
        keyed = {"8122": {"gp": 1, "rec": 2, "rec_yd": 30}}
        array = [{"player_id": "8122", "stats": {"gp": 1, "rec": 2, "rec_yd": 30}}]
        self.assertEqual(nfl_week_points(keyed, self.scoring)["8122"], 5)
        self.assertEqual(nfl_week_points(array, self.scoring)["8122"], 5)

    def test_played_zero_supported_but_dnp_rejected(self):
        vals = {"8122": {"gp": 0, "rec": 0, "rec_yd": 0},
                "8123": {"gp": 1, "rec": 0, "rec_yd": 0},
                "8124": {"rec": 0}, "8125": {"rec": 1}}
        scores = nfl_week_points(vals, self.scoring)
        self.assertNotIn("8122", scores)
        self.assertNotIn("8124", scores)
        self.assertEqual(scores["8123"], 0)
        self.assertEqual(scores["8125"], 1)

    def test_unrostered_knight_gets_complete_2026_history(self):
        week_scores = {"season": 2026, "through_week": 6,
                       "weeks": {"2": {"8122": 6.5}, "5": {"8122": 10.5}}}
        rows = [{"season": 2026, "week": 6, "franchise_id": 2,
                 "player_id": "another_player", "fantasy_points": 7,
                 "starter_status": "Starter"}]
        names = {"8122": {"name": "Zonovan Knight", "position": "RB"}}
        model = player_scores(rows, 2026, 6, week_scores,
                              sleeper_projections={"8122": 2, "rookie": 8.25},
                              player_names=names)
        self.assertEqual(model["players"]["8122"]["projection"], 8.5)
        self.assertEqual(model["players"]["8122"]["games"], 2)
        self.assertEqual(model["players"]["8122"]["source"], "nfl_games")
        self.assertEqual(model["player_names"]["8122"]["name"], "Zonovan Knight")
        self.assertEqual(model["players"]["rookie"]["source"], "sleeper_projection")
        self.assertEqual(model["players"]["rookie"]["games"], 0)
        self.assertIsNone(model["players"]["rookie"]["last3_avg"])

    def test_week_cutoff_and_previously_cached_complete_weeks(self):
        cached = {"season": 2026, "weeks": {"1": {str(i): 1 for i in range(25)}}}
        def fake_fetch(kind, season, week):
            self.assertEqual(kind, "stats")
            self.assertEqual(week, 2)
            return {str(i): {"gp": 1, "rec": 1} for i in range(25)}
        data = nfl_games(2026, 2, self.scoring, cached=cached, fetcher=fake_fetch)
        self.assertEqual(len(data["weeks"]), 2)
        self.assertEqual(data["through_week"], 2)

    def test_missing_complete_week_never_silently_drops_nfl_coverage(self):
        with self.assertRaisesRegex(RuntimeError, "Cannot build complete NFL scores"):
            nfl_games(2026, 1, self.scoring, fetcher=lambda *_: {})


if __name__ == "__main__":
    unittest.main()
