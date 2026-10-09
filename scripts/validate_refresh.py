#!/usr/bin/env python3
"""Guard a refreshed FIG data snapshot before GitHub Actions publishes it.

Compare accumulated Sleeper history with the previously committed snapshot so a
temporary API problem cannot replace league history with missing or empty data.
RosterAudit is independent: if its new response has suspiciously poor coverage,
restore its last good values while still allowing valid Sleeper updates.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

REQUIRED_LISTS = (
    "league_history", "league_settings", "standings_career",
    "standings_seasons", "games", "player_game_log", "trades",
    "trade_sides", "trade_assets", "transactions", "current_roster",
    "team_season_master", "website_streaks", "weekly_full_rosters",
    "draft_pick_outcomes_audit", "draft_pick_round_reconciliation",
)

# The following are cumulative historical exports, not live-only leaderboards.
# Allow a modest number of corrections but reject catastrophic data loss.
CUMULATIVE = (
    "league_history", "games", "trades", "trade_assets", "transactions",
    "player_game_log", "weekly_full_rosters", "draft_pick_outcomes_audit",
)


def load(name):
    return json.loads((DATA / (name + ".json")).read_text(encoding="utf-8"))


def previous(name):
    proc = subprocess.run(
        ["git", "show", "HEAD:data/" + name + ".json"],
        cwd=ROOT, check=False, capture_output=True, text=True,
    )
    return json.loads(proc.stdout) if proc.returncode == 0 else None


def check(condition, message):
    if not condition:
        raise ValueError("REFRESH REJECTED: " + message)


def protect_rosteraudit():
    prior = previous("rosteraudit_values")
    current = load("rosteraudit_values")
    if not isinstance(prior, dict) or prior.get("status") != "ready":
        check(isinstance(current, dict) and current.get("status") == "ready",
              "RosterAudit has no valid market snapshot")
        return

    old_players = prior.get("players", {})
    old_picks = prior.get("future_picks", {})
    players = current.get("players", {}) if isinstance(current, dict) else {}
    picks = current.get("future_picks", {}) if isinstance(current, dict) else {}
    roster = load("current_roster")
    roster_ids = {str(r.get("player_id")) for r in roster if r.get("player_id")}
    roster_matches = len(roster_ids & set(players)) if isinstance(players, dict) else 0

    healthy = (
        current.get("status") == "ready"
        and isinstance(players, dict) and isinstance(picks, dict)
        and len(players) >= max(100, int(len(old_players) * 0.70))
        and len(picks) >= max(8, int(len(old_picks) * 0.60))
        and roster_matches >= int(len(roster_ids) * 0.65)
    )
    if healthy:
        print("RosterAudit coverage OK:",
              len(players), "players,", len(picks), "pick tiers,",
              roster_matches, "/", len(roster_ids), "rostered player IDs")
        return

    subprocess.run(
        ["git", "restore", "--", "data/rosteraudit_values.json"],
        cwd=ROOT, check=True,
    )
    print("::warning::RosterAudit returned partial or incompatible values; "
          "preserving the previous verified dynasty snapshot instead.")


def main():
    for item in REQUIRED_LISTS:
        contents = load(item)
        check(isinstance(contents, list) and bool(contents),
              item + ".json must be a nonempty list")
        original = previous(item)
        if item in CUMULATIVE and isinstance(original, list) and original:
            floor = max(1, int(len(original) * 0.80))
            check(len(contents) >= floor,
                  f"{item}.json shrank from {len(original)} to {len(contents)} rows")

    history = load("league_history")
    years = {str(x.get("season")) for x in history}
    check({"2023", "2024", "2025", "2026"}.issubset(years),
          "required original league seasons missing")
    check(all(int(x.get("total_rosters", 0)) == 10 for x in history),
          "10-team franchise configuration changed unexpectedly")

    standings = load("standings_career")
    actual_ids = {int(x.get("franchise_id", 0)) for x in standings}
    check(actual_ids == set(range(1, 11)),
          "all ten permanent franchise IDs must be present")
    check(len(load("current_roster")) >= 100,
          "unexpectedly small current roster")
    check(len(load("games")) >= 100,
          "too few completed historical games")

    lineage = load("trade_lineage")
    check(isinstance(lineage, dict) and
          int(lineage.get("trade_count", 0)) >= 12 and
          isinstance(lineage.get("asset_paths"), dict),
          "James/Hayden trade evidence is missing")

    protect_rosteraudit()

    # Parse EVERY export, including files not listed above, before publication.
    for path in DATA.glob("*.json"):
        json.loads(path.read_text(encoding="utf-8"))

    print("FIG data validation passed. Existing historical league records preserved.")


if __name__ == "__main__":
    main()
