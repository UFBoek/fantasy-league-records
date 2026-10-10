"""Draft history must attribute selections to the team that actually picked them."""
import json
import unittest
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def rows(file):
    return json.loads((DATA / (file + ".json")).read_text(encoding="utf-8"))


def resolved_origins(audit):
    # Only match a pick to its original franchise when the pick audit
    # explicitly resolved its position; never use today's Sleeper ownership.
    accepted = {"DIRECT_DRAFT_SLOT_MATCH", "UNIQUE_OWNER_ROUND_MATCH"}
    return {
        (str(row["draft_id"]), int(row["pick_no"])): int(row["original_franchise"])
        for row in audit if row.get("resolution_status") in accepted
        and str(row.get("original_franchise", "")).isdigit()
    }


class DraftByFranchiseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.picks = rows("draft_picks")
        cls.audit = rows("draft_pick_outcomes_audit")
        cls.origins = resolved_origins(cls.audit)

    def test_all_draft_years_have_permanent_team_ids(self):
        years = {str(p["draft_season"]) for p in self.picks}
        self.assertTrue({"2023", "2024", "2025", "2026"} <= years)
        self.assertTrue(all(1 <= int(p["franchise_id"]) <= 10 for p in self.picks))

    def test_exactly_one_picking_team_per_selection(self):
        per_year = defaultdict(list)
        for pick in self.picks:
            per_year[str(pick["draft_id"])].append(pick)
        for picks in per_year.values():
            self.assertEqual(len({int(p["pick_no"]) for p in picks}), len(picks))
            self.assertTrue(all(p.get("player_id") and p.get("player_name") for p in picks))
            grouped = Counter(int(p["franchise_id"]) for p in picks)
            self.assertEqual(sum(grouped.values()), len(picks))

    def test_traded_rookie_picks_keep_actual_drafter(self):
        for year in ("2024", "2025", "2026"):
            picks = [p for p in self.picks if str(p["draft_season"]) == year]
            self.assertEqual(len(picks), 40)
            mapped = [p for p in picks if (str(p["draft_id"]), int(p["pick_no"])) in self.origins]
            self.assertEqual(len(mapped), len(picks))
            transferred = [
                p for p in picks
                if self.origins[(str(p["draft_id"]), int(p["pick_no"]))] != int(p["franchise_id"])
            ]
            self.assertGreater(len(transferred), 0)
            for p in transferred:
                original = self.origins[(str(p["draft_id"]), int(p["pick_no"]))]
                self.assertIn(original, range(1, 11))
                # A drafted player is attributed to whoever selected him,
                # while the original owner is a separate historical field.
                self.assertNotEqual(original, int(p["franchise_id"]))

    def test_all_ten_franchises_including_zero_pick_teams(self):
        for year in ("2024", "2025", "2026"):
            picks = [p for p in self.picks if str(p["draft_season"]) == year]
            owner_counts = Counter(int(p["franchise_id"]) for p in picks)
            cards = {franchise: owner_counts.get(franchise, 0) for franchise in range(1, 11)}
            self.assertEqual(len(cards), 10)
            self.assertEqual(sum(cards.values()), 40)
        # Franchise #10 made zero selections in the 2024 and 2025 drafts.
        for year in ("2024", "2025"):
            self.assertFalse(any(str(p["draft_season"]) == year and int(p["franchise_id"]) == 10
                                 for p in self.picks))

    def test_full_2023_startup_rounds_preserved(self):
        startup = [p for p in self.picks if str(p["draft_season"]) == "2023"]
        self.assertEqual(len(startup), 250)
        self.assertEqual({int(p["round"]) for p in startup}, set(range(1, 26)))

    def test_frontend_includes_routed_team_draft_history(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("async function draft(selectedYear)", app)
        self.assertIn("await draft(parts[1])", app)
        self.assertIn("async function team(id,selectedTab,selectedDraftYear)", app)
        self.assertIn("await team(parts[1],parts[2],parts[3])", app)
        self.assertIn('data-tab="drafts">DRAFT HISTORY', app)
        self.assertIn("ALL YEARS", app)
        self.assertIn("SELECT A FRANCHISE", app)
        self.assertIn("figDraftFranchiseHistory(id,selectedDraftYear)", app)
        self.assertIn("figDraftTeamTotals(all,+id,origins)", app)
        self.assertIn("ROSTERAUDIT DRAFT GRADES", app)
        self.assertIn("RA CURRENT VALUE", app)
        self.assertIn("franchise_starter_points", app)
        self.assertIn("ORIGINAL PICKS USED BY OTHER TEAMS", app)
        # We do not invent RosterAudit provider letter grades from live
        # player market values; their documented API does not expose grades.
        self.assertIn("not a historical draft grade", app)


if __name__ == "__main__":
    unittest.main()
