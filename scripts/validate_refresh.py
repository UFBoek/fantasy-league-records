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
    """Accept normal provider coverage changes without permitting damaged rankings.

    RosterAudit may omit the thousands of players worth only the minimum 1
    point. Compare substantive values and actual league rosters, not the raw
    size of an old Sleeper-ID dictionary.
    """
    prior = previous("rosteraudit_values")
    current = load("rosteraudit_values")
    if not isinstance(prior, dict) or prior.get("status") != "ready":
        check(isinstance(current, dict) and current.get("status") == "ready",
              "RosterAudit has no valid market snapshot")
        return True

    old_players = prior.get("players", {})
    old_picks = prior.get("future_picks", {})
    players = current.get("players", {}) if isinstance(current, dict) else {}
    picks = current.get("future_picks", {}) if isinstance(current, dict) else {}
    roster = load("current_roster")

    def meaningful(entry):
        value = entry.get("value") if isinstance(entry, dict) else None
        return type(value) in (int, float) and 1 < value < 100000

    failures = []
    def require(condition, message):
        if not condition:
            failures.append(message)

    valid_objects = (isinstance(players, dict) and isinstance(picks, dict)
                     and isinstance(old_players, dict) and isinstance(old_picks, dict))
    require(isinstance(current, dict) and current.get("status") == "ready",
            "missing ready status")
    require(valid_objects, "invalid player or draft-pick data structure")
    if not valid_objects:
        subprocess.run(["git", "restore", "--", "data/rosteraudit_values.json"],
                       cwd=ROOT, check=True)
        print("::warning::RosterAudit rejected: " + "; ".join(failures)
              + ". Retained the previous verified snapshot.")
        return False

    old_format = prior.get("format", {})
    new_format = current.get("format", {}) if isinstance(current, dict) else {}
    require(isinstance(old_format, dict) and isinstance(new_format, dict)
            and old_format.get("key") == new_format.get("key")
            and old_format.get("teams") == new_format.get("teams"),
            "league format or size differs from previous snapshot")

    old_meaningful = {pid for pid, entry in old_players.items() if meaningful(entry)}
    new_meaningful = {pid for pid, entry in players.items() if meaningful(entry)}
    kept_meaningful = len(old_meaningful & new_meaningful)
    # Ignore disappearing floor-value (1) entries, but require continuing
    # coverage of actual dynasty assets, including established top players.
    meaningful_floor = max(100, int(len(old_meaningful) * 0.70))
    require(len(new_meaningful) >= meaningful_floor,
            f"only {len(new_meaningful)} materially valued players (need {meaningful_floor})")
    require(kept_meaningful >= meaningful_floor,
            f"only {kept_meaningful}/{len(old_meaningful)} prior valued players retained")
    top_ids = sorted(old_meaningful,
                     key=lambda pid: old_players[pid]["value"], reverse=True)[:50]
    top_matched = sum(pid in new_meaningful for pid in top_ids)
    require(top_matched >= int(len(top_ids) * 0.90),
            f"only {top_matched}/{len(top_ids)} top dynasty assets retained")

    roster_ids = {str(r["player_id"]) for r in roster if r.get("player_id")}
    roster_matches = len(roster_ids & set(players))
    total_needed = int(len(roster_ids) * 0.85)
    require(roster_matches >= total_needed,
            f"only {roster_matches}/{len(roster_ids)} rostered players covered "
            f"(need {total_needed})")
    team_rosters = {}
    for row in roster:
        if row.get("player_id") and row.get("franchise_id") is not None:
            team_rosters.setdefault(str(row["franchise_id"]), set()).add(str(row["player_id"]))
    for team, team_ids in sorted(team_rosters.items()):
        if len(team_ids) >= 5:
            covered = len(team_ids & set(players))
            minimum = int(len(team_ids) * 0.70)
            require(covered >= minimum,
                    f"franchise {team} has only {covered}/{len(team_ids)} player values")

    pick_floor = max(8, int(len(old_picks) * 0.60))
    require(len(picks) >= pick_floor,
            f"only {len(picks)}/{len(old_picks)} draft-pick tiers (need {pick_floor})")
    for tier in ("2027:1:early", "2027:1:mid", "2027:1:late"):
        if tier in old_picks:
            require(tier in picks, f"missing important draft-pick tier {tier}")

    summary = (f"{len(players)} total players, {len(new_meaningful)} valued (>1), "
               f"{kept_meaningful}/{len(old_meaningful)} prior valued retained, "
               f"{top_matched}/{len(top_ids)} top assets, "
               f"{roster_matches}/{len(roster_ids)} rostered players, "
               f"{len(picks)} pick tiers")
    if not failures:
        print("RosterAudit coverage OK: " + summary)
        return True

    subprocess.run(["git", "restore", "--", "data/rosteraudit_values.json"],
                   cwd=ROOT, check=True)
    print("::warning::RosterAudit validation rejected: " + "; ".join(failures))
    print("::warning::Rejected snapshot had " + summary
          + ". Retained the previous verified dynasty rankings.")
    return False


def guard_completed_weeks(history):
    """Fail closed if any official stat or record uses an unfinished Sleeper week.

    Unfiltered roster archives and future schedule rows can exist for app
    navigation, but rows tagged as official scoring must not be from those weeks.
    """
    from prepare_player_records import cutoff_by_season
    from week_finalization import previous_verified

    limits = cutoff_by_season(history, load("league_settings"), previous_verified())
    # These exports represent completed, scored weeks ONLY.
    for name in ("games", "all_games", "player_game_log",
                 "weekly_scoring_ranks", "playoffs"):
        records = load(name)
        for row in records:
            year = str(row.get("season"))
            week = int(row.get("week") or 0)
            check(year in limits and 1 <= week <= limits[year],
                  f"{name}.json contains unfinished week {year} W{week}; "
                  f"completed through W{limits.get(year)}")

    # Raw weekly roster archive intentionally includes current/future weeks,
    # but only past completed weeks may be tagged for official records.
    for row in load("weekly_full_rosters"):
        if row.get("counts_for_official_records") is not True:
            continue
        year = str(row.get("season"))
        week = int(row.get("week") or 0)
        check(year in limits and 1 <= week <= limits[year],
              f"weekly_full_rosters.json marked live week {year} W{week} as official")

    for name in ("streaks", "website_streaks"):
        for row in load(name):
            year = str(row.get("end_season"))
            week = int(row.get("end_week") or 0)
            check(year in limits and 1 <= week <= limits[year],
                  f"{name}.json includes unfinished streak ending {year} W{week}")

    # An accidental export-field change can break every player record display
    # without shrinking the JSON file. Assert the actual website contract.
    logs = load("player_game_log")
    for row in logs:
        check(bool(row.get("player_name")) and
              isinstance(row.get("starter_points"), (int, float)),
              "player_game_log.json missing player_name/starter_points; "
              "the Player Records interface would display blank statistics")
    print("Official week safety passed: scored records come only from "
          "Sleeper-completed or independently verified weeks.")



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

    guard_completed_weeks(history)

    protect_rosteraudit()

    # Parse EVERY export, including files not listed above, before publication.
    for path in DATA.glob("*.json"):
        json.loads(path.read_text(encoding="utf-8"))

    print("FIG data validation passed. Existing historical league records preserved.")


if __name__ == "__main__":
    main()
