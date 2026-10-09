#!/usr/bin/env python3
"""Prepare a cited 2026 injury-review queue; never auto-credit injuries.

NFL injury roundup leads are manually recorded with URLs, then mechanically
matched to completed Sleeper week rosters and established fantasy rotations.
Only reviewed entries in injury_events_reviewed.json can affect leaderboards.
"""
import json
import re
from collections import defaultdict
from pathlib import Path
from build_injury_history import rotation_starts, verified_url

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def normalized(name):
    return re.sub(r"[^a-z0-9]", "", str(name or "").casefold().replace("’", "'"))


def build_candidates(leads, weekly_rosters, reviewed_events):
    finished = [
        row for row in weekly_rosters
        if row.get("counts_for_official_records") is True
        and int(row.get("week") or 0) > 0
    ]
    by_person = defaultdict(list)
    for row in finished:
        by_person[(int(row["season"]), int(row["week"]),
                   normalized(row.get("player_name")))].append(row)
    reviewed = {
        (int(x["season"]), int(x["week"]), str(x["sleeper_player_id"]))
        for x in reviewed_events
        if x.get("verification_status") == "verified"
    }
    queue = []
    seen = set()
    for lead in leads:
        season = int(lead["season"])
        week = int(lead["week"])
        name = str(lead["player_name"]).strip()
        url = str(lead["source_url"])
        key = (season, week, normalized(name))
        if key in seen:
            raise ValueError(f"Duplicate lead for {name}, {season} W{week}")
        seen.add(key)
        if not name or not verified_url(url) or season < 2023 or not 1 <= week <= 18:
            raise ValueError(f"Invalid source or date for lead: {key}")
        matched = []
        unique_roster = set()
        for row in by_person.get(key, []):
            unique_key = (str(row["player_id"]), int(row["franchise_id"]))
            if unique_key in unique_roster:
                continue
            unique_roster.add(unique_key)
            starts_before = rotation_starts(
                finished, season, int(row["franchise_id"]), str(row["player_id"]), week
            )
            started = row.get("starter_status") == "Starter"
            is_rotation = starts_before >= 2
            matched.append({
                "franchise_id": int(row["franchise_id"]),
                "owner_name": str(row.get("owner_name") or ""),
                "player_id": str(row["player_id"]),
                "starter": bool(started),
                "previous_four_week_starts": starts_before,
                "established_rotation": is_rotation,
                "potentially_relevant": bool(started or is_rotation),
                "already_verified": (season, week, str(row["player_id"])) in reviewed,
            })
        matched.sort(key=lambda row: row["franchise_id"])
        queue.append({
            "season": season, "week": week,
            "player_name": name, "source_url": url,
            "source_reason": str(lead.get("reason") or ""),
            "review_status": "unverified_lead_do_not_count",
            "roster_matches": matched,
            "relevant_manager_count": sum(int(m["potentially_relevant"]) for m in matched),
        })
    queue.sort(key=lambda row: (-row["season"], -row["week"], row["player_name"]))
    return {
        "schema_version": 1,
        "scope": "2026-regular-season-pilot",
        "coverage": "curated_nfl_roundup_leads_not_comprehensive",
        "counts_toward_injuries": False,
        "lead_count": len(queue),
        "potentially_relevant_leads": sum(any(m["potentially_relevant"] for m in x["roster_matches"]) for x in queue),
        "review_required": "Confirm injury-forced loss of normal game completion, not merely a temporary exit or reduced snap share.",
        "leads": queue,
    }


def main():
    leads = json.loads((DATA / "injury_candidate_leads.json").read_text(encoding="utf-8"))
    rosters = json.loads((DATA / "weekly_full_rosters.json").read_text(encoding="utf-8"))
    reviewed = json.loads((DATA / "injury_events_reviewed.json").read_text(encoding="utf-8"))
    if not all(isinstance(x, list) for x in (leads, rosters, reviewed)):
        raise ValueError("Expected candidate leads, weekly rosters and verified events as arrays")
    report = build_candidates(leads, rosters, reviewed)
    (DATA / "injury_candidates.json").write_text(
        json.dumps(report, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    print("Injury-review leads:", report["lead_count"], "league-relevant:",
          report["potentially_relevant_leads"], "published injury totals unaffected")


if __name__ == "__main__":
    main()
