#!/usr/bin/env python3
"""Compact current-week player projections from every archived rostered appearance.

A fantasy bench performance is a real scoring sample. Do not use the
starter-only player_game_log or partial/unverified current-week results.
This export is exclusively for projection inputs, not official records.
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def player_scores(rows: list[dict], season: int, cutoff: int) -> dict:
    # A player may appear on two fantasy rosters in the same NFL week
    # following a trade. Count the NFL game only once.
    scores = {}
    lineups = defaultdict(lambda: defaultdict(list))
    for row in rows:
        try:
            year = int(row["season"])
            week = int(row["week"])
            player_id = str(row["player_id"]).strip()
            points = float(row["fantasy_points"])
            team = int(row["franchise_id"])
        except (KeyError, TypeError, ValueError):
            continue
        if not player_id or player_id in ("0", "None", "nan"):
            continue
        # Current-season player form only, using completed game performances.
        # Sleeper's roster snapshot supplies 0 for an inactive/DNP player,
        # even if the NFL game took place. This archive has no snap count or
        # participation bit, so zero-only entries are NOT evidence of a game.
        # Keep genuine negative fantasy-point performances as valid samples.
        if (not math.isfinite(points) or year != season or
                week > cutoff or week < 1 or week > 18 or points == 0):
            continue
        key = (player_id, year, week)
        # A trade may duplicate an athlete in the same NFL week.
        if key not in scores:
            scores[key] = points
        if (year == season and week <= cutoff and
                row.get("starter_status") == "Starter" and
                1 <= team <= 10):
            lineups[team][week].append(player_id)

    by_player = defaultdict(list)
    for (pid, year, week), points in scores.items():
        by_player[pid].append((year, week, points))

    projections = {}
    for player_id, games in by_player.items():
        recent = sorted(games, reverse=True)[:8]
        last3 = recent[:3]
        avg8 = sum(x[2] for x in recent) / len(recent)
        avg3 = sum(x[2] for x in last3) / len(last3)
        projections[player_id] = {
            "projection": round(0.70 * avg8 + 0.30 * avg3, 4),
            "last8_avg": round(avg8, 4),
            "last3_avg": round(avg3, 4),
            "games": len(recent),
        }

    previous = {}
    for team in range(1, 11):
        # Oldest team starter group in the window is not necessarily the
        # same as the roster currently held by that franchise.
        valid = [
            (week, starters)
            for week, starters in lineups[team].items()
            if len(starters) == 10 and len(set(starters)) == 10
        ]
        previous[str(team)] = [
            starters for week, starters in
            sorted(valid, key=lambda pair: pair[0], reverse=True)[:3]
        ]

    return {
        "season": season,
        "through_week": cutoff,
        "players": projections,
        "previous_lineups": previous,
    }


def main() -> None:
    history = json.loads((DATA / "league_history.json").read_text(encoding="utf-8"))
    season = max(int(row["season"]) for row in history)
    cutoffs = json.loads((DATA / "verified_week_cutoffs.json").read_text(encoding="utf-8"))
    cutoff = int(cutoffs.get(str(season), 0))
    if not 0 <= cutoff <= 18:
        raise ValueError("Invalid verified-week cutoff")
    rows = json.loads((DATA / "weekly_full_rosters.json").read_text(encoding="utf-8"))
    result = player_scores(rows, season, cutoff)
    if not result["players"]:
        raise ValueError("No current-season player performances for playoff projections")
    path = DATA / "playoff_player_scores.json"
    path.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"WROTE | playoff_player_scores.json | {len(result['players'])} players; verified through W{cutoff}")


if __name__ == "__main__":
    main()
