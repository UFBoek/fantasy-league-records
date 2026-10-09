#!/usr/bin/env python3
"""Verified fantasy injury history; deliberately not an injury detector.

The input is a reviewed NFL injury-event ledger. NFL injury reports, fantasy
points and snap-count anomalies are leads, never proof of a missed-snap exit.
Only explicit, cited, completed-week events contribute to published counts.
"""
import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RULES_VERSION = 1


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def verified_url(value):
    parsed = urlparse(str(value or ""))
    return parsed.scheme == "https" and bool(parsed.netloc)


def rotation_starts(history, season, franchise, player, week):
    """Established rotation: at least 2 of the preceding 4 fantasy weeks started."""
    previous = {
        int(row["week"])
        for row in history
        if int(row.get("season") or 0) == season
        and int(row.get("franchise_id") or 0) == franchise
        and str(row.get("player_id")) == player
        and row.get("counts_for_official_records") is True
        and row.get("starter_status") == "Starter"
        and max(1, week - 4) <= int(row.get("week") or 0) < week
    }
    return len(previous)


def compute_injuries(events, weekly_rosters):
    # Only finalized Sleeper weeks can contribute injury records.
    completed = [
        row for row in weekly_rosters
        if row.get("counts_for_official_records") is True
        and int(row.get("week") or 0) > 0
    ]
    roster_index = defaultdict(list)
    for row in completed:
        key = (int(row["season"]), int(row["week"]), str(row["player_id"]))
        roster_index[key].append(row)

    valid = []
    rejected = []
    seen = set()
    for event in events:
        try:
            event_id = str(event["event_id"])
            season = int(event["season"])
            week = int(event["week"])
            player = str(event["sleeper_player_id"])
            verified = event.get("verification_status") == "verified"
            has_source = verified_url(event.get("source_url"))
            missed_snaps = event.get("missed_snaps_confirmed") is True
            exited = event.get("exited_due_to_injury") is True
            missed_games = event.get("subsequent_nfl_games_missed")
            missed_games = None if missed_games is None else int(missed_games)
            severity_source = verified_url(event.get("severity_source_url"))
            # Major may also be verified by documented IR or season-ending status.
            major = (
                (missed_games is not None and missed_games >= 4)
                or event.get("season_ending") is True
                or event.get("placed_on_ir") is True
            ) and severity_source
            # One physical injury is one event regardless of fantasy owners.
            if event_id in seen:
                raise ValueError("duplicate event ID")
            seen.add(event_id)
            if not (verified and has_source and season >= 2023 and 1 <= week <= 18
                    and player and (exited and missed_snaps or major)):
                raise ValueError("insufficient verified game exit or major injury evidence")
            if missed_games is not None and missed_games < 0:
                raise ValueError("negative NFL games missed")
            participants = roster_index.get((season, week, player), [])
            if not participants:
                raise ValueError("no matched completed-week fantasy roster")
            for row in participants:
                manager = int(row["franchise_id"])
                started = row.get("starter_status") == "Starter"
                established = rotation_starts(completed, season, manager, player, week) >= 2
                # In-game totals require an actual missed-snap injury while STARTED.
                in_game = bool(started and exited and missed_snaps)
                # Rotation totals include previously regular starters when benched,
                # but only if they suffered a meaningful verified injury.
                rotation = bool(established and (exited and missed_snaps or major))
                if not (in_game or rotation):
                    continue
                valid.append({
                    "event_id": event_id, "season": season, "week": week,
                    "franchise_id": manager, "owner_name": str(row.get("owner_name") or ""),
                    "player_id": player,
                    "player_name": str(row.get("player_name") or event.get("player_name") or player),
                    "position": str(row.get("position") or ""),
                    "started": bool(started), "established_rotation": bool(established),
                    "started_in_game_injury": in_game, "rotation_injury": rotation,
                    "major_injury": bool(major),
                    "injury_description": str(event.get("injury_description") or ""),
                    "missed_snaps_confirmed": missed_snaps,
                    "nfl_games_missed": missed_games,
                    "source_url": str(event["source_url"]),
                    "severity_source_url": str(event.get("severity_source_url") or ""),
                })
        except (KeyError, TypeError, ValueError) as exc:
            rejected.append({"event_id": str(event.get("event_id") if isinstance(event, dict) else ""),
                             "reason": str(exc)})
    totals = defaultdict(lambda: {"started_in_game_injuries": 0,
                                  "rotation_injuries": 0,
                                  "major_rotation_injuries": 0})
    for row in valid:
        key = str(row["franchise_id"])
        totals[key]["started_in_game_injuries"] += int(row["started_in_game_injury"])
        totals[key]["rotation_injuries"] += int(row["rotation_injury"])
        totals[key]["major_rotation_injuries"] += int(row["rotation_injury"] and row["major_injury"])
    valid.sort(key=lambda row: (-row["season"], -row["week"], row["franchise_id"], row["player_name"]))
    return {
        "schema_version": RULES_VERSION,
        "coverage": "reviewed_events_only",
        "is_complete_historical_census": False,
        "source_event_count": len(events),
        "verified_fantasy_injury_events": len(valid),
        "rejected_unverified_events": rejected,
        "definitions": {
            "started_in_game_injury": "Fantasy starter, documented injury-related exit, and confirmed missed NFL game snaps.",
            "rotation_injury": "Started >=2 of prior 4 completed fantasy weeks for this manager; meaningful verified injury even if benched this week.",
            "major_rotation_injury": "Rotation injury resulting in >=4 NFL games missed, injured reserve or season-ending absence, supported by evidence.",
            "non_additive": "A single injury may qualify for multiple categories; do not sum category totals.",
        },
        "by_franchise": dict(sorted(totals.items(), key=lambda item: int(item[0]))),
        "events": valid,
    }


def main():
    ledger = read_json(DATA / "injury_events_reviewed.json")
    rosters = read_json(DATA / "weekly_full_rosters.json")
    if not isinstance(ledger, list) or not isinstance(rosters, list):
        raise ValueError("Injury ledger and weekly rosters must be arrays")
    output = compute_injuries(ledger, rosters)
    # Do not let malformed reviewed evidence silently disappear from totals.
    if output["rejected_unverified_events"]:
        raise ValueError("Invalid reviewed injury evidence: "
                         + json.dumps(output["rejected_unverified_events"]))
    (DATA / "injury_history.json").write_text(
        json.dumps(output, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print("Verified injury events matched:",
          output["verified_fantasy_injury_events"],
          "| Coverage is partial pending reviewed NFL game exit evidence.")


if __name__ == "__main__":
    main()
