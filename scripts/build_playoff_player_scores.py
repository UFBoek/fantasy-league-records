#!/usr/bin/env python3
"""Current-season fantasy player form, independent of FIG-league roster ownership.

Unrostered NFL appearances come from Sleeper's weekly NFL statistics; their
raw categories are scored using FIG's current scoring_settings_json. The
historical league roster archive remains the source of exact rostered points
and starting groups. Sleeper's current-week projections are a labeled fallback
only for athletes with no observed 2026 games. Never publish in-progress games.
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CACHE = DATA / "playoff_nfl_weekly_scores.json"


def finite(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError, OverflowError):
        return None


def source_rows(payload):
    """Normalize the keyed legacy endpoint and the array-shaped stats endpoint."""
    if isinstance(payload, dict):
        if isinstance(payload.get("players"), (dict, list)):
            payload = payload["players"]
        if isinstance(payload, dict):
            items = payload.items()
        else:
            items = ((None, row) for row in payload)
    elif isinstance(payload, list):
        items = ((None, row) for row in payload)
    else:
        return
    for key, row in items:
        if not isinstance(row, dict):
            continue
        player_id = str(row.get("player_id") or key or "").strip()
        if not player_id or player_id in ("None", "null", "0") or player_id.startswith("TEAM_"):
            continue
        values = row.get("stats") if isinstance(row.get("stats"), dict) else row
        if isinstance(values, dict):
            yield player_id, values


def fantasy_score(values, scoring):
    """Apply the league's exact scoring weights to raw Sleeper stat categories."""
    supported = [(k, finite(values.get(k)), finite(w)) for k, w in scoring.items()
                 if k in values]
    supported = [(k, v, w) for k, v, w in supported if v is not None and w is not None]
    if not supported:
        return None
    return round(sum(v * w for _, v, w in supported), 4)


def nfl_week_points(payload, scoring):
    result = {}
    for pid, stats in source_rows(payload):
        played = finite(stats.get("gp"))
        if played is not None and played <= 0:
            continue
        scored = fantasy_score(stats, scoring)
        if scored is None:
            continue
        # A verified GP=1 with 0 fantasy points is a real played game.
        # Without GP evidence, zero can just mean an inactive roster slot.
        if played is None and scored == 0:
            continue
        result[pid] = scored
    return result


def fetch_sleeper(kind, season, week):
    """The weekly stats API is undocumented; try both published URL conventions."""
    urls = (
        f"https://api.sleeper.app/v1/{kind}/nfl/regular/{season}/{week}",
        f"https://api.sleeper.app/{kind}/nfl/{season}/{week}?season_type=regular",
        f"https://api.sleeper.com/{kind}/nfl/{season}/{week}?season_type=regular",
    )
    messages = []
    for url in urls:
        try:
            response = requests.get(url, timeout=22, headers={"Accept": "application/json",
                                                                "User-Agent": "FIGLeagueProjection/1.0"})
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, (dict, list)) and payload:
                return payload
            messages.append(f"{url}: empty")
        except (requests.RequestException, ValueError) as error:
            messages.append(f"{url}: {str(error)[:120]}")
    raise RuntimeError("Sleeper " + kind + " unavailable: " + "; ".join(messages))


def nfl_games(season, cutoff, scoring, cached=None, fetcher=fetch_sleeper):
    existing = cached if isinstance(cached, dict) and cached.get("season") == season else {}
    saved = existing.get("weeks") if isinstance(existing.get("weeks"), dict) else {}
    weeks = {}
    for week in range(1, cutoff + 1):
        prior = saved.get(str(week))
        if isinstance(prior, dict) and len(prior) >= 20:
            weeks[str(week)] = prior
            continue
        try:
            scores = nfl_week_points(fetcher("stats", season, week), scoring)
            if len(scores) < 20:
                raise ValueError(f"Week {week} has only {len(scores)} playable NFL score entries")
            weeks[str(week)] = scores
        except (RuntimeError, ValueError) as error:
            # Never silently replace complete, previously published NFL coverage
            # with the roster-only subset if the stats provider is down.
            raise RuntimeError(f"Cannot build complete NFL scores for {season} W{week}: {error}") from error
    return {"season": season, "through_week": cutoff, "weeks": weeks}


def sleeper_fallbacks(payload, scoring):
    forecasts = {}
    for pid, stats in source_rows(payload):
        score = fantasy_score(stats, scoring)
        if score is not None and score > 0:
            forecasts[pid] = score
    return forecasts


def player_scores(rows: list[dict], season: int, cutoff: int,
                  nfl_weeks: dict | None = None, sleeper_projections: dict | None = None,
                  player_names: dict | None = None) -> dict:
    scores = {}
    lineups = defaultdict(lambda: defaultdict(list))
    all_stats = (nfl_weeks or {}).get("weeks", {})
    for week_str, player_map in all_stats.items():
        week = int(week_str)
        if not 1 <= week <= cutoff or not isinstance(player_map, dict):
            continue
        for pid, points in player_map.items():
            value = finite(points)
            if value is not None:
                scores[(str(pid), week)] = value

    # Preserve official roster points where they exist; Sleeper game stats for
    # waiver players fill the (player,week) gaps, not an extra appearance.
    seen_starters = defaultdict(lambda: defaultdict(set))
    for row in rows:
        try:
            yr, week, team = int(row["season"]), int(row["week"]), int(row["franchise_id"])
            pid = str(row["player_id"]).strip()
        except (KeyError, TypeError, ValueError):
            continue
        if yr != season or not 1 <= week <= cutoff or not pid or pid in ("0", "None", "nan"):
            continue
        if row.get("starter_status") == "Starter" and 1 <= team <= 10:
            if pid not in seen_starters[team][week]:
                lineups[team][week].append(pid)
                seen_starters[team][week].add(pid)
        points = finite(row.get("fantasy_points"))
        if points is None or points == 0:
            continue
        key = (pid, week)
        # If multiple league teams held a player that week, use the first
        # roster score (normally identical). This also overrides raw-stat
        # rounding differences for established rostered NFL performers.
        if key not in scores or not all_stats:
            scores[key] = points

    by_player = defaultdict(list)
    for (pid, week), value in scores.items():
        by_player[pid].append((week, value))

    projections = {}
    for pid, games in by_player.items():
        recent = sorted(games, reverse=True)[:8]
        last3 = recent[:3]
        avg8 = sum(x[1] for x in recent) / len(recent)
        avg3 = sum(x[1] for x in last3) / len(last3)
        projections[pid] = {
            "projection": round(0.70 * avg8 + 0.30 * avg3, 4),
            "last8_avg": round(avg8, 4),
            "last3_avg": round(avg3, 4),
            "games": len(recent),
            "source": "nfl_games" if all_stats else "rostered_games",
        }

    for pid, value in (sleeper_projections or {}).items():
        points = finite(value)
        if str(pid) not in projections and points is not None and points > 0:
            projections[str(pid)] = {
                "projection": round(points, 4),
                "last8_avg": None,
                "last3_avg": None,
                "games": 0,
                "source": "sleeper_projection",
            }

    previous = {}
    for team in range(1, 11):
        valid = [(week, starters) for week, starters in lineups[team].items()
                 if len(starters) == 10 and len(set(starters)) == 10]
        previous[str(team)] = [starters for week, starters in
                               sorted(valid, key=lambda item: item[0], reverse=True)[:3]]
    return {
        "season": season,
        "through_week": cutoff,
        "players": projections,
        "player_names": player_names or {},
        "previous_lineups": previous,
    }


def main():
    history = json.loads((DATA / "league_history.json").read_text(encoding="utf-8"))
    season = max(int(row["season"]) for row in history)
    cutoffs = json.loads((DATA / "verified_week_cutoffs.json").read_text(encoding="utf-8"))
    cutoff = int(cutoffs.get(str(season), 0))
    if not 0 <= cutoff <= 18:
        raise ValueError("Invalid verified-week cutoff")
    league = json.loads((DATA / "league_settings.json").read_text(encoding="utf-8"))
    settings = next(row for row in league if int(row["season"]) == season)
    scoring = json.loads(settings["scoring_settings_json"])
    if not isinstance(scoring, dict) or not scoring:
        raise ValueError("Missing 2026 league fantasy scoring settings")
    rows = json.loads((DATA / "weekly_full_rosters.json").read_text(encoding="utf-8"))
    cached = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    archive = nfl_games(season, cutoff, scoring, cached=cached)

    week = min(cutoff + 1, 18)
    try:
        future = sleeper_fallbacks(fetch_sleeper("projections", season, week), scoring)
    except RuntimeError as error:
        print(f"WARN | Sleeper W{week} projections unavailable: {error}")
        old = json.loads((DATA / "playoff_player_scores.json").read_text(encoding="utf-8"))
        future = {pid: row["projection"] for pid, row in old.get("players", {}).items()
                  if old.get("season") == season and old.get("through_week") == cutoff
                  and row.get("source") == "sleeper_projection"}

    names = {}
    waiver_path = DATA / "waiver_player_names.json"
    if waiver_path.exists():
        names.update(json.loads(waiver_path.read_text(encoding="utf-8")))
    for row in json.loads((DATA / "current_roster.json").read_text(encoding="utf-8")):
        pid, player_name = str(row.get("player_id") or ""), row.get("player_name")
        if pid and player_name:
            names[pid] = {"name": player_name, "position": row.get("position") or ""}
    result = player_scores(rows, season, cutoff, archive, future, names)
    if not result["players"]:
        raise ValueError("No player performances for 70/30 model")
    CACHE.write_text(json.dumps(archive, separators=(",", ":")) + "\n", encoding="utf-8")
    output = DATA / "playoff_player_scores.json"
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n",
                      encoding="utf-8")
    actual = sum(int(p["games"] > 0) for p in result["players"].values())
    fallback = sum(int(p["source"] == "sleeper_projection") for p in result["players"].values())
    print(f"WROTE | playoff_player_scores.json | {actual} NFL-form players, "
          f"{fallback} Sleeper fallbacks, {len(archive['weeks'])} completed NFL weeks")


if __name__ == "__main__":
    main()
