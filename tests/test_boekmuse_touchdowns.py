import unittest
from scripts.build_boekmuse_touchdowns import parse_stat_rows, make_week, stat_td


class TouchdownBuilderTests(unittest.TestCase):
    def setUp(self):
        self.starters = [{
            "season": "2026", "week": 7, "game_type": "Regular Season",
            "franchise_id": 1, "player_id": "9509", "player_name": "Bijan Robinson",
            "position": "RB",
        }, {
            "season": "2026", "week": 7, "game_type": "Regular Season",
            "franchise_id": 1, "player_id": "9493", "player_name": "Puka Nacua",
            "position": "WR",
        }]

    def test_count_actual_rushing_and_receiving_tds(self):
        stats = {"9509": {"rush_td": 2, "rec_td": 1, "pass_td": 3},
                 "9493": {"rec_td": 1}}
        result = make_week(self.starters, stats)
        self.assertEqual([r["touchdowns"] for r in result], [3, 1])
        self.assertEqual(sum(r["touchdowns"] for r in result), 4)
        self.assertEqual(result[0]["rush_td"], 2)

    def test_no_zero_for_missing_player_data(self):
        self.assertIsNone(make_week(self.starters, {"9509": {"rush_td": 1}}))

    def test_verified_zero_for_present_player(self):
        result = make_week(self.starters, {"9509": {}, "9493": {}})
        self.assertEqual([r["touchdowns"] for r in result], [0, 0])

    def test_nonnumeric_touchdown_rejected(self):
        with self.assertRaises(ValueError):
            stat_td({"rec_td": "1"}, "rec_td")

    def test_parse_provider_payload(self):
        rows = [{"player": {"player_id": str(i)}, "stats": {"rush_td": 0}}
                for i in range(1, 205)]
        result = parse_stat_rows(rows)
        self.assertEqual(len(result), 204)
        self.assertEqual(result["1"]["rush_td"], 0)


if __name__ == "__main__":
    unittest.main()
