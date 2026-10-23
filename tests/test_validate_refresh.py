"""Regression coverage for RosterAudit provider schema/coverage changes."""
import unittest
from unittest import mock

from scripts import validate_refresh as vr


class RosterAuditRefreshValidationTests(unittest.TestCase):
    def setUp(self):
        # Reproduce the October 2026 change: a previous 1,939-player snapshot
        # contained 1,098 floor-value players; the API now returns ~833.
        players = {str(i): {"value": 9500 - i} for i in range(834)}
        players.update({str(i): {"value": 1} for i in range(834, 1932)})
        players.update({str(i): {"value": 0} for i in range(1932, 1939)})
        picks = {f"{year}:{rnd}:{slot}": 1000
                 for year in (2027, 2028, 2029)
                 for rnd in range(1, 6)
                 for slot in ("early", "mid", "late")}
        self.old = {
            "status": "ready", "format": {"key": "sf_ppr", "teams": 10},
            "players": players, "future_picks": picks,
        }
        self.new = {
            "status": "ready", "format": {"key": "sf_ppr", "teams": 10},
            "players": {str(i): {"value": 9500 - i} for i in range(833)},
            "future_picks": dict(picks),
        }
        self.roster = [
            {"player_id": str(i), "franchise_id": (i - 100) // 30 + 1}
            for i in range(100, 400)
        ]

    def validate(self):
        def load(name):
            if name == "rosteraudit_values":
                return self.new
            if name == "current_roster":
                return self.roster
            raise AssertionError(name)

        with mock.patch.object(vr, "previous", return_value=self.old), \
             mock.patch.object(vr, "load", side_effect=load), \
             mock.patch.object(vr.subprocess, "run") as restore:
            accepted = vr.protect_rosteraudit()
        return accepted, restore

    def test_legitimate_833_player_response_passes_without_floor_value_padding(self):
        accepted, restore = self.validate()
        self.assertTrue(accepted)
        restore.assert_not_called()

    def test_entire_team_missing_is_rejected_even_if_total_coverage_looks_good(self):
        for pid in range(100, 130):
            self.new["players"].pop(str(pid))
        accepted, restore = self.validate()
        self.assertFalse(accepted)
        restore.assert_called_once()
        self.assertIn("restore", restore.call_args.args[0])

    def test_mass_downgrade_to_floor_value_is_rejected(self):
        self.new["players"] = {pid: {"value": 1}
                               for pid in self.new["players"]}
        accepted, restore = self.validate()
        self.assertFalse(accepted)
        restore.assert_called_once()

    def test_losing_key_draft_picks_is_rejected(self):
        self.new["future_picks"] = {
            key: value for key, value in self.new["future_picks"].items()
            if key != "2027:1:early"
        }
        accepted, restore = self.validate()
        self.assertFalse(accepted)
        restore.assert_called_once()

    def test_changed_scoring_format_is_rejected(self):
        self.new["format"]["key"] = "1qb_ppr"
        accepted, restore = self.validate()
        self.assertFalse(accepted)
        restore.assert_called_once()

    def test_partial_high_value_coverage_is_rejected(self):
        for pid in range(20):
            self.new["players"].pop(str(pid))
        accepted, restore = self.validate()
        self.assertFalse(accepted)
        restore.assert_called_once()


if __name__ == "__main__":
    unittest.main()
