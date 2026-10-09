#!/usr/bin/env python3
"""Keep the automated Sleeper starter log compatible with the FIG Player Records UI.

Sleeper's raw records use full_name/fantasy_points. The website's player book,
bomb thresholds, top player weeks, team histories and detail pages expect
player_name/starter_points. Convert only officially completed starter weeks.
Reject, rather than publish, data that includes an in-progress week.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def cutoff_by_season(history, league_settings=None):
    # While a week is in progress, leg may advance before Sleeper officially
    # finalizes scoring. Never exceed its last_scored_leg when available.
    last_scored = {}
    for row in league_settings or []:
        cfg = row.get("settings_json", {})
        if isinstance(cfg, str):
            cfg = json.loads(cfg)
        if isinstance(cfg, dict) and cfg.get("last_scored_leg") is not None:
            last_scored[str(row["season"])] = max(0, int(cfg["last_scored_leg"]))
    out = {}
    for item in history:
        season = str(item["season"])
        leg = int(item.get("current_leg") or 0)
        status = str(item.get("status", "")).lower()
        if status == "complete":
            out[season] = leg
        else:
            out[season] = min(max(0, leg - 1), last_scored.get(season, leg))
    return out


def normalize_player_log(rows, history, league_settings=None):
    if not isinstance(rows, list) or not rows:
        raise ValueError("Missing completed player starter data")
    cutoff = cutoff_by_season(history, league_settings)
    output = []
    seen = set()
    for row in rows:
        season = str(row["season"])
        week = int(row["week"])
        if season not in cutoff or week < 1 or week > cutoff[season]:
            raise ValueError(
                f"Unfinished/future player week {season} week {week}; "
                f"only weeks through {cutoff.get(season)} may enter official records"
            )
        if row.get("is_starter") is False or row.get("counts_for_player_records") is False:
            # Raw weekly rosters may contain bench/other games; do not use them.
            continue
        name = str(row.get("player_name") or row.get("full_name") or "").strip()
        points = row.get("starter_points")
        if points is None:
            points = row.get("fantasy_points")
        try:
            score = float(points)
        except (TypeError, ValueError):
            raise ValueError(f"Missing fantasy points for {season} week {week}") from None
        if not math.isfinite(score) or not name:
            raise ValueError(f"Invalid official player row for {season} week {week}")
        player_id = str(row.get("player_id") or "")
        franchise_id = int(row.get("franchise_id") or 0)
        if not player_id or not franchise_id:
            raise ValueError(f"Missing player or franchise in {season} week {week}")
        key = (season, week, franchise_id, player_id)
        if key in seen:
            raise ValueError(f"Duplicate official starter {key}")
        seen.add(key)
        output.append({
            "season": season,
            "week": week,
            "game_type": str(row.get("game_type") or "Regular Season"),
            "franchise_id": franchise_id,
            "owner_name": row.get("owner_name"),
            "player_id": player_id,
            "player_name": name,
            "position": str(row.get("position") or ""),
            "starter_points": score,
        })
    if len(output) < 100:
        raise ValueError(f"Only {len(output)} official player games; refusing incomplete update")
    return output


def main():
    target = DATA / "player_game_log.json"
    history = json.loads((DATA / "league_history.json").read_text(encoding="utf8"))
    settings = json.loads((DATA / "league_settings.json").read_text(encoding="utf8"))
    raw = json.loads(target.read_text(encoding="utf8"))
    converted = normalize_player_log(raw, history, settings)
    tmp = target.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(converted, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    tmp.replace(target)
    print(f"Player Record Book: {len(converted):,} verified completed starter weeks, "
          f"compatible fields restored; no in-progress scores")


if __name__ == "__main__":
    main()
