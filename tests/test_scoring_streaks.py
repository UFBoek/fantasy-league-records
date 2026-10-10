"""Regression tests for weekly high-score and top-three league scoring streaks."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from scoring_streaks import build_scoring_streaks, SCORING_STREAK_FIELDS


def week(year, number, first=1, second=2, third=3):
    output = []
    for franchise in range(1, 11):
        rank = ([first, second, third] + [
            x for x in range(1, 11) if x not in (first, second, third)
        ]).index(franchise) + 1
        output.append({
            "season": year, "week": number, "franchise_id": franchise,
            "owner_name": f"Team {franchise}", "points_for": 200 - rank,
            "weekly_score_rank": rank,
            "weekly_high_score": rank == 1,
            "weekly_top_3": rank <= 3,
        })
    return output


class ScoringStreakTests(unittest.TestCase):
    def test_across_seasons_and_current_week(self):
        data = (week(2025, 14) + week(2026, 1) + week(2026, 2, first=4))
        output = build_scoring_streaks(data)
        high = [x for x in output if x["streak_type"] == "Weekly High Score"]
        self.assertEqual(len(high), 1)
        self.assertEqual(high[0]["franchise_id"], 1)
        self.assertEqual(high[0]["length"], 2)
        self.assertFalse(high[0]["active"])
        top = [x for x in output if x["streak_type"] == "Top-3 Scoring Weeks"]
        self.assertEqual([x["franchise_id"] for x in top], [1, 2, 3])
        self.assertTrue(all(x["active"] for x in top))
        self.assertEqual(top[0]["length"], 3)

    def test_missing_week_breaks_consecutive_streak(self):
        data = week(2024, 1) + week(2024, 3) + week(2024, 4)
        output = build_scoring_streaks(data)
        high = [x for x in output if x["streak_type"] == "Weekly High Score"]
        self.assertEqual(len(high), 1)
        self.assertEqual((high[0]["start_week"], high[0]["end_week"]), (3, 4))

    def test_incomplete_week_cannot_be_treated_as_official(self):
        incomplete = week(2026, 5)[:-1]
        with self.assertRaises(ValueError):
            build_scoring_streaks(week(2026, 4) + incomplete)

    def test_current_published_snapshot(self):
        ranks = json.loads((ROOT / "data/weekly_scoring_ranks.json").read_text())
        website = json.loads((ROOT / "data/website_streaks.json").read_text())
        generated = build_scoring_streaks(ranks)
        actual = [s for s in website if s["streak_type"] in SCORING_STREAK_FIELDS]
        self.assertEqual(len(actual), len(generated))
        for a,b in zip(actual,generated):
            self.assertEqual(
                (a["franchise_id"],a["streak_type"],a["length"],
                 a["start_season"],a["start_week"],a["end_season"],a["end_week"],
                 a["total_points"],a["active"]),
                (b["franchise_id"],b["streak_type"],b["length"],
                 b["start_season"],b["start_week"],b["end_season"],b["end_week"],
                 b["total_points"],b["active"])
            )

    def test_ui_streak_details_load_rank_history(self):
        frontend = (ROOT / "app.js").read_text()
        self.assertIn("type==='Weekly High Score'||type==='Top-3 Scoring Weeks'",frontend)
        self.assertIn("'weeklyRanks'",frontend)
        self.assertIn("rankedWeeks.has(String(g.season)+'|'+String(g.week))",frontend)
        self.assertIn("LEAGUE RANK #",frontend)
        self.assertIn("fig-streak-game",frontend)
        script=(ROOT / "scripts/build_site_data.py").read_text()
        self.assertIn("build_scoring_streaks(",script)


if __name__ == "__main__":
    unittest.main()
