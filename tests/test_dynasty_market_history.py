"""Regression coverage for daily dynasty market valuation history."""
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("market_history", ROOT / "scripts" / "build_dynasty_market_history.py")
market = importlib.util.module_from_spec(spec)
spec.loader.exec_module(market)


def fixtures():
    current = datetime.now(timezone.utc).isoformat(timespec="seconds")
    roster = [
        {"franchise_id": fid, "player_id": str(1000 + fid), "position": "QB"}
        for fid in range(1, 11)
    ]
    values = {str(1000 + fid): {"value": fid * 100} for fid in range(1, 11)}
    values.update({str(i): {"value": 0} for i in range(100, 155)})
    feed = {"status": "ready", "updated_at": current, "format": {"key": "sf_ppr"},
            "players": values, "future_picks": {
                "2027:1:late": 2239, "2027:1:mid": 2700,
            }}
    picks = [
        {"pick_season": 2027, "round": 1, "original_franchise_id": 10, "current_franchise_id": 1},
        {"pick_season": 2027, "round": 1, "original_franchise_id": 6, "current_franchise_id": 2},
        {"pick_season": 2027, "round": 1, "original_franchise_id": 3, "current_franchise_id": 3},
        {"pick_season": 2027, "round": 4, "original_franchise_id": 2, "current_franchise_id": 4},
        {"pick_season": 2026, "round": 1, "original_franchise_id": 10, "current_franchise_id": 5},
    ]
    drafts = [{"draft_season": 2026, "draft_status": "complete", "draft_type": "rookie"}]
    return feed, roster, picks, drafts


class MarketHistoryTests(unittest.TestCase):
    def test_agrees_with_current_league_pick_rules(self):
        snapshot = market.build_snapshot(*fixtures())
        teams = {row["franchise_id"]: row for row in snapshot["teams"]}
        self.assertEqual(len(teams), 10)
        self.assertEqual(teams[1]["picks_value"], 6300)  # James fixed-price 1st
        self.assertEqual(teams[2]["picks_value"], 2239)  # Hayden-origin late
        self.assertEqual(teams[3]["picks_value"], 2700)  # Normal mid
        self.assertEqual(teams[4]["picks_value"], 0)     # Missing tier is not invented
        self.assertFalse(teams[4]["all_valued"])
        self.assertEqual(teams[5]["picks"], [])  # Completed draft excluded
        self.assertEqual(teams[1]["players_value"], 100)

    def test_stale_feed_does_not_create_new_day(self):
        feed, roster, picks, drafts = fixtures()
        feed["updated_at"] = (datetime.now(timezone.utc) - timedelta(days=4)).isoformat()
        self.assertIsNone(market.build_snapshot(feed, roster, picks, drafts))

    def test_daily_snapshot_is_idempotent(self):
        feed, roster, picks, drafts = fixtures()
        with tempfile.TemporaryDirectory() as directory:
            original_data, original_target = market.DATA, market.TARGET
            try:
                market.DATA = Path(directory)
                market.TARGET = market.DATA / "dynasty_market_history.json"
                for name, value in [
                    ("rosteraudit_values", feed), ("current_roster", roster),
                    ("current_future_picks", picks), ("draft_picks", drafts),
                ]:
                    (market.DATA / (name + ".json")).write_text(json.dumps(value))
                market.main()
                before = market.TARGET.read_text()
                market.main()
                self.assertEqual(market.TARGET.read_text(), before)
                feed["players"]["1001"]["value"] = 999
                (market.DATA / "rosteraudit_values.json").write_text(json.dumps(feed))
                market.main()
                after = json.loads(market.TARGET.read_text())
                self.assertEqual(len(after["snapshots"]), 1)
                self.assertEqual(after["snapshots"][0]["teams"][0]["players_value"], 999)
            finally:
                market.DATA, market.TARGET = original_data, original_target


if __name__ == "__main__":
    unittest.main()
