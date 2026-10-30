#!/usr/bin/env python3
"""Build separate, normalized NFL-wide historical samples for FIG dynasty research.

Uses the same Sleeper raw-stats normalization and 2026 FIG scoring weights as
the existing playoff player score engine. No scored stats are fabricated.
Run: python scripts/build_dynasty_nfl_history.py
The data file is ONLY for experimental dynasty forecasts, not official history.
"""
from __future__ import annotations
import argparse
import json
from collections import defaultdict
from pathlib import Path

from build_playoff_player_scores import nfl_games

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = DATA / "dynasty_nfl_history.json"
SEASONS = (2023, 2024, 2025)
CUTOFF = 17


def collapse_weeks(weeks: dict) -> dict:
    player_weeks = defaultdict(list)
    for week_str, entries in sorted(weeks.items(), key=lambda pair: int(pair[0])):
        if not isinstance(entries, dict):
            raise ValueError(f"Malformed weekly NFL stats for {week_str}")
        for pid, raw_score in entries.items():
            if not str(pid).isdigit():
                continue
            if not isinstance(raw_score, (float, int)):
                continue
            player_weeks[str(pid)].append((int(week_str), round(float(raw_score), 4)))
    return {
        pid: {
            "games": len(samples),
            "mean_ppg": round(sum(p for _, p in samples) / len(samples), 4),
            "total_points": round(sum(p for _, p in samples), 4),
            "weekly": samples,
        }
        for pid, samples in player_weeks.items()
    }


def build_archive(data_dir=DATA, seasons=SEASONS, cutoff=CUTOFF, fetcher=None):
    settings = json.loads((data_dir / "league_settings.json").read_text(encoding="utf-8"))
    current = next((s for s in settings if int(s["season"]) == 2026), None)
    if current is None:
        raise ValueError("2026 FIG scoring settings missing")
    scoring = json.loads(current["scoring_settings_json"])
    if not scoring or not isinstance(scoring, dict):
        raise ValueError("Scoring settings invalid")

    previous = {}
    if (data_dir / "dynasty_nfl_history.json").exists():
        previous = json.loads((data_dir / "dynasty_nfl_history.json").read_text(encoding="utf-8"))
    # Cache is a player-level summary, not a raw weekly cache.
    old_seasons = previous.get("seasons", {}) if previous.get("version") == 1 else {}
    out = {}
    for year in seasons:
        saved = old_seasons.get(str(year))
        if saved and saved.get("through_week") == cutoff and len(saved.get("players", {})) > 100:
            out[str(year)] = saved
            print(f"RETAINED {year}: {len(saved['players'])} NFL players")
            continue
        args = dict(season=int(year), cutoff=int(cutoff), scoring=scoring)
        if fetcher:
            args["fetcher"] = fetcher
        weekly = nfl_games(**args)
        if len(weekly["weeks"]) != cutoff:
            raise ValueError(f"Incomplete {year} NFL season")
        players = collapse_weeks(weekly["weeks"])
        if len(players) < 300:
            raise ValueError(f"Unusually sparse {year} NFL player sample ({len(players)})")
        out[str(year)] = {"through_week": cutoff, "players": players}
        print(f"FETCHED {year}: {len(players)} NFL players from {cutoff} weeks")
    result = {
        "version": 1,
        "source": "Sleeper NFL weekly statistics",
        "scoring_season": 2026,
        "scoring_type": "FIG 2026 scoring rules for all seasons",
        "seasons": out,
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"WROTE {OUTPUT} ({sum(len(y['players']) for y in out.values())} season-player observations)")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", nargs="+", type=int, choices=SEASONS, default=list(SEASONS))
    args = parser.parse_args()
    build_archive(seasons=tuple(args.years))
