"""Offline regression checks for independently finalizing completed NFL weeks."""
import unittest
from datetime import datetime, timedelta
from scripts.week_finalization import (
    EASTERN, all_games_final, independent_week_final, league_scores_complete,
    week_cutoff, signature,
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
    def test_all_complete_week_does_not_wait_until_1145(self):
        self.assertTrue(all_games_final(week_games(), et("2026-10-12", 22)))
        self.assertTrue(all_games_final(week_games(), et("2026-10-12", 23, 44)))
        self.assertTrue(all_games_final(week_games(), et("2026-10-13", 0)))
        self.assertFalse(all_games_final(week_games(), et("2026-10-12", 15)))
        # NFL weeks without a Monday game can finalize once all events end
        sunday = week_games("2026-10-11")
        self.assertTrue(all_games_final(sunday, et("2026-10-11", 22)))

    def test_finalization_rejects_ongoing_or_partial_schedule(self):
        self.assertFalse(all_games_final(week_games(unfinished=True), et("2026-10-12", 23, 58)))
        self.assertFalse(all_games_final(week_games(count=9), et("2026-10-12", 23, 58)))

    def test_independent_confirmation_requires_final_nfl_and_stable_sleeper_scores(self):
        calls,score_reads,sleeps=[],[],[]
        def fetch(year, week):
            calls.append((year, week))
            return week_games()
        def scores(league, week):
            score_reads.append((league, week))
            return self.full_matchups()
        self.assertTrue(independent_week_final(
            2026, 5, et("2026-10-12", 22), fetch,
            league_id="league", score_fetcher=scores,
            sleep_fn=lambda seconds:sleeps.append(seconds)))
        self.assertEqual(calls, [(2026, 5)])
        self.assertEqual(score_reads, [("league", 5), ("league", 5)])
        self.assertEqual(sleeps, [10])

        def unfinished(year, week):
            return week_games(unfinished=True)
        self.assertFalse(independent_week_final(
            2026, 5, et("2026-10-12", 23, 58), unfinished,
            league_id="league", score_fetcher=scores, sleep_fn=lambda _:None))
        self.assertEqual(len(score_reads), 2,
                         "NFL in progress must skip Sleeper final scoring checks")

    @staticmethod
    def full_matchups():
        return [{
            "roster_id": team, "points": float(team * 10),
            "starters": [f"{team}-player-{slot}" for slot in range(10)],
            "starters_points": [float(team) for slot in range(10)],
        } for team in range(1,11)]

    def test_score_completion_rejects_partial_or_inconsistent_sleeper(self):
        rows = self.full_matchups()
        self.assertEqual(len(league_scores_complete(rows)), 10)
        self.assertIsNone(league_scores_complete(rows[:9]))
        self.assertIsNone(league_scores_complete(rows + [rows[0]]))
        self.assertIsNone(league_scores_complete([
            {**rows[0], "points": 500}, *rows[1:]]))
        self.assertIsNone(league_scores_complete([
            {**rows[0], "starters_points": [1]*9}, *rows[1:]]))
        self.assertIsNone(league_scores_complete([
            {**rows[0], "starters": ["bad"]*10}, *rows[1:]]))

    def test_changing_score_snapshots_delay_finalization(self):
        calls=[0]
        def shifting_scores(_league, _week):
            calls[0] += 1
            rows=self.full_matchups()
            if calls[0]==2:
                rows[0]["points"]+=1
                rows[0]["starters_points"][0]+=1
            return rows
        self.assertFalse(independent_week_final(
            2026, 5, et("2026-10-12", 22), lambda *_:week_games(),
            league_id="league", score_fetcher=shifting_scores,
            sleep_fn=lambda _:None))
        self.assertEqual(calls[0], 2)

    def test_no_sleeper_scores_published_when_any_team_is_unscored(self):
        def incomplete(_league, _week):
            return self.full_matchups()[:9]
        self.assertFalse(independent_week_final(
            2026, 5, et("2026-10-12", 22), lambda *_:week_games(),
            league_id="league", score_fetcher=incomplete,
            sleep_fn=lambda _:None))

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
