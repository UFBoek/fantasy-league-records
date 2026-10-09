#!/usr/bin/env python3
"""Source-led injury review discovery, 2023 through the active NFL season.

Every season: intersect *completed* Sleeper fantasy lineups with nflverse PFR
offensive snap counts and the following week's NFL injury reports. A sharp
snap-share drop plus an ensuing report is a lead, NOT a verified in-game
injury; game-ending impact still requires game-day/film or team evidence.

This file never mutates reviewed injury events, fantasy stats, or records.
Source fetch failures are fatal, preserving the last published candidate set.
"""
import csv
import io
import json
import math
import re
import statistics
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RELEASE = "https://github.com/nflverse/nflverse-data/releases/download"
SEASONS = (2023, 2024, 2025, 2026)
POSITIONS = {"QB", "RB", "WR", "TE"}
MIN_REFERENCE_SHARE = 0.45
MIN_DROP = 0.35

# Conservative, entirely data-backed screening signal. A qualifying event
# needs documented NFL game participation, a severe playing-time drop and an
# Out/Doubtful injury designation *the following week*. This is an estimate,
# never evidence the injury made a player unable to finish normally.
AUTO_MAX_SHARE = 0.35
AUTO_MAX_RELATIVE_SHARE = 0.45
EXCLUDED_INJURY_DESCRIPTIONS = ("illness", "rest", "personal", "not injury related")


def strong_injury_signal(current_share, baseline, snaps, followup, week):
    if current_share is None or baseline is None or snaps is None:
        return False
    if snaps < 1 or baseline < MIN_REFERENCE_SHARE:
        return False
    if current_share > AUTO_MAX_SHARE or current_share > baseline * AUTO_MAX_RELATIVE_SHARE:
        return False
    for report in followup:
        if int(report.get("week") or 0) != week + 1:
            continue
        injury = str(report.get("injury") or "").strip()
        status = str(report.get("status") or "").strip().casefold()
        if status in {"out", "doubtful"} and injury and not any(
            x in injury.casefold() for x in EXCLUDED_INJURY_DESCRIPTIONS
        ):
            return True
    return False



def canonical(value):
    """Conservative person-name comparison; a match is a lead, not identity proof."""
    return re.sub(r"[^a-z0-9]", "", str(value or "").casefold())


def offensive_pct(value):
    try:
        x = float(str(value or "0").strip().replace("%", ""))
        if not math.isfinite(x) or x < 0:
            return 0.
        return min(x / 100 if x > 1 else x, 1.)
    except ValueError:
        return 0.


def numeric(value):
    try:
        x = float(value)
        return x if math.isfinite(x) else 0.
    except (ValueError, TypeError):
        return 0.


def download_csv(season, dataset):
    url = f"{RELEASE}/{dataset}/{dataset}_{season}.csv"
    request = urllib.request.Request(url, headers={
        "User-Agent": "FIG-league-injury-discovery/1.0",
        "Accept": "text/csv,application/octet-stream",
    })
    with urllib.request.urlopen(request, timeout=75) as response:
        payload = response.read(12 * 1024 * 1024 + 1)
        if len(payload) > 12 * 1024 * 1024:
            raise RuntimeError(f"Source file too large: {url}")
    text = payload.decode("utf-8-sig")
    records = list(csv.DictReader(io.StringIO(text)))
    min_rows = 1000 if dataset == "snap_counts" else 100
    if len(records) < min_rows:
        raise RuntimeError(f"Suspiciously incomplete nflverse {dataset} {season}: {len(records)} rows")
    return records, url


def find_review_candidates(rosters, snap_by_year, injuries_by_year, verified_events):
    completed = [
        r for r in rosters
        if r.get("counts_for_official_records") is True
        and str(r.get("season")) in {str(y) for y in SEASONS}
        and 1 <= int(r.get("week") or 0) <= 18
        and str(r.get("position") or "").upper() in POSITIONS
    ]
    roster_by_player = defaultdict(list)
    starts_by_manager = defaultdict(set)
    for r in completed:
        roster_by_player[(int(r["season"]), canonical(r.get("player_name")), int(r["week"]))].append(r)
        if r.get("starter_status") == "Starter":
            starts_by_manager[(int(r["season"]), int(r["franchise_id"]), str(r["player_id"]))].add(int(r["week"]))
    verified = {
        (int(r["season"]), int(r["week"]), str(r["sleeper_player_id"]))
        for r in verified_events if r.get("verification_status") == "verified"
    }
    observed = defaultdict(list)
    game_share = defaultdict(list)
    next_reports = defaultdict(list)
    for year, rows in snap_by_year.items():
        for r in rows:
            week = int(numeric(r.get("week")))
            if week < 1 or week > 18 or str(r.get("position") or "").upper() not in POSITIONS:
                continue
            name = canonical(r.get("player"))
            if not name:
                continue
            share = offensive_pct(r.get("offense_pct"))
            snaps = int(numeric(r.get("offense_snaps")))
            observed[(year, name, week)].append((share, snaps, r))
            if share >= MIN_REFERENCE_SHARE:
                game_share[(year, name)].append((week, share))
    for year, rows in injuries_by_year.items():
        for r in rows:
            week = int(numeric(r.get("week")))
            name = canonical(r.get("full_name"))
            if not name or not 1 <= week <= 18:
                continue
            injury = str(r.get("report_primary_injury") or r.get("practice_primary_injury") or "").strip()
            injury_status = str(r.get("report_status") or r.get("practice_status") or "").strip()
            if injury and injury.lower() not in ("nan", "none", "na"):
                next_reports[(year, name, week)].append({
                    "injury": injury, "status": injury_status, "week": week,
                })
    # One row per player/week/manager. Same player may have multiple NFL snaps
    # rows only for unusual multi-team weeks: reject ambiguity rather than guess.
    candidates = []
    checked = 0
    for (year, player_key, week), participants in sorted(roster_by_player.items()):
        snaps = observed.get((year, player_key, week), [])
        if len(snaps) > 1:
            continue
        matched = snaps[0] if snaps else None
        current_share = matched[0] if matched else None
        current_snaps = matched[1] if matched else None
        reference_shares = [p for w, p in game_share.get((year, player_key), []) if w != week]
        baseline = statistics.median(reference_shares) if len(reference_shares) >= 2 else None
        followup = []
        for report_week in (week + 1, week + 2):
            followup.extend(next_reports.get((year, player_key, report_week), []))
        # In-game detection requires proof the player actually participated
        # on the field. No-snap weeks include NFL byes and pregame inactive
        # players; neither is evidence of an in-game injury.
        decline = (
            current_share is not None and current_snaps > 0
            and baseline is not None and baseline >= MIN_REFERENCE_SHARE
            and current_share <= baseline - MIN_DROP
            and current_share <= baseline * 0.55
        )
        if not decline:
            continue
        checked += 1
        strong = strong_injury_signal(current_share, baseline, current_snaps, followup, week)
        report = next((r for r in followup if int(r["week"]) == week+1
                       and str(r.get("status") or "").strip().casefold() in ("out", "doubtful")),
                      followup[0] if followup else None)
        for fantasy in participants:
            franchise = int(fantasy["franchise_id"])
            player_id = str(fantasy["player_id"])
            started = fantasy.get("starter_status") == "Starter"
            prior_weeks = {
                w for w in starts_by_manager.get((year, franchise, player_id), ())
                if max(1, week - 4) <= w < week
            }
            established = len(prior_weeks) >= 2
            if not (started or established):
                continue
            evidence = ["unusual_offensive_snap_reduction"]
            if report:
                evidence.append("following_weeks_injury_report")
            candidates.append({
                "season": year, "week": week,
                "player_name": str(fantasy.get("player_name") or ""),
                "player_id": player_id, "franchise_id": franchise,
                "owner_name": str(fantasy.get("owner_name") or ""),
                "position": str(fantasy.get("position") or ""),
                "starter": bool(started), "established_rotation": established,
                "prior_four_week_starts": len(prior_weeks),
                "offense_snaps": current_snaps,
                "offense_pct": round(current_share, 3) if current_share is not None else None,
                "reference_offense_pct": round(baseline, 3),
                "injury_report_detail": report,
                "signal_types": evidence,
                "priority": "higher" if strong else "background",
                "inference_tier": "automated_estimate" if strong else "archived_weak_signal",
                "counts_toward_verified_injuries": False,
                "already_verified": (year, week, player_id) in verified,
                "review_status": "candidate_unverified_do_not_count",
                "disclaimer": "Automatic injury estimate, not evidence of injury-limited NFL game finish.",
                "snaps_source_url": f"{RELEASE}/snap_counts/snap_counts_{year}.csv",
                "injury_report_source_url": f"{RELEASE}/injuries/injuries_{year}.csv",
            })
    candidates.sort(key=lambda x: (
        x["season"], -int(x["priority"] == "higher"),
        x["week"], x["player_name"], x["franchise_id"]
    ))
    summary = []
    for year in SEASONS:
        group = [c for c in candidates if c["season"] == year]
        summary.append({
            "season": year, "review_leads": len(group),
            "high_priority": sum(c["priority"] == "higher" for c in group),
            "previously_verified": sum(bool(c["already_verified"]) for c in group),
            "automated_estimates": sum(c["inference_tier"] == "automated_estimate"
                                       and not c["already_verified"] for c in group),
            "archived_weak_signals": sum(c["inference_tier"] == "archived_weak_signal"
                                         for c in group),
        })
    return {
        "schema_version": 2,
        "status": "automatic_injury_estimates_separate_from_verified",
        "counts_toward_injuries": False,
        "is_complete_injury_history": False,
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seasons_checked": list(SEASONS),
        "sources": {
            "injury_reports": "nflverse/nflverse-data injuries CSV; preliminary weekly reports",
            "snap_counts": "nflverse/nflverse-data PFR offensive snap counts",
            "fantasy": "completed Sleeper weekly lineups; starters or regular rotation",
        },
        "signals_matched": checked,
        "excluded_absences_and_bye_weeks": "No-snap fantasy players do not enter the in-game injury discovery list.",
        "candidate_count": len(candidates),
        "automatic_estimate_count": sum(c["inference_tier"] == "automated_estimate"
                                        and not c["already_verified"] for c in candidates),
        "automatically_archived_count": sum(c["inference_tier"] == "archived_weak_signal"
                                            for c in candidates),
        "by_season": summary,
        "candidates": candidates,
    }


def main():
    snap_by_year = {}
    injuries_by_year = {}
    for year in SEASONS:
        snap_by_year[year], snap_url = download_csv(year, "snap_counts")
        injuries_by_year[year], injury_url = download_csv(year, "injuries")
        print(year, "snaps:", len(snap_by_year[year]),
              "injury reports:", len(injuries_by_year[year]))
    rosters = json.loads((DATA / "weekly_full_rosters.json").read_text(encoding="utf-8"))
    verified = json.loads((DATA / "injury_events_reviewed.json").read_text(encoding="utf-8"))
    report = find_review_candidates(rosters, snap_by_year, injuries_by_year, verified)
    if not report["candidate_count"]:
        raise RuntimeError("No historical injury leads; refusing to overwrite prior discovery data")
    path = DATA / "injury_discovery_candidates.json"
    path.write_text(json.dumps(report, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print("Historical NFL injury review candidates:", report["candidate_count"])
    for row in report["by_season"]:
        print(row)


if __name__ == "__main__":
    main()
