"""Build audited player touchdown totals for finalized fantasy starts.

Data: Sleeper's weekly NFL box-score categories, which are not included in the
normal fantasy player points log. Uses only finalized starter records already
published on the website. An incomplete week is excluded, never filled with
fabricated zeros.
"""
import json
import sys
import time
from collections import defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "player_game_log.json"
OUTPUT = ROOT / "data" / "player_weekly_touchdowns.json"
OFFENSE_POSITIONS = frozenset(("RB", "WR", "TE", "FB"))
SOURCE = "Sleeper raw NFL weekly stats: rush_td + rec_td (started non-QB offense only)"
API = "https://api.sleeper.app/stats/nfl/{season}/{week}?season_type=regular"


def key_of(row):
    return ":".join(str(row[k]) for k in ("season", "week", "game_type", "franchise_id"))


def parse_stat_rows(data):
    """The documented-by-community Sleeper endpoint is an array of stats objects."""
    if not isinstance(data, list) or len(data) < 100:
        raise ValueError("Missing or unexpectedly small weekly NFL stats payload")
    result = {}
    for row in data:
        if not isinstance(row, dict):
            continue
        player = row.get("player") or {}
        player_id = str(row.get("player_id") or player.get("player_id") or "")
        if not player_id:
            continue
        stats = row.get("stats") or {}
        if not isinstance(stats, dict):
            continue
        result[player_id] = stats
    if len(result) < 100:
        raise ValueError("NFL player identifiers missing from stats payload")
    return result


def stat_td(stats, field):
    x = stats.get(field, 0)
    if x is None:
        x = 0
    if isinstance(x, bool) or not isinstance(x, (float, int)):
        raise ValueError("Non-numeric " + field)
    if x < 0 or x > 12 or int(x) != x:
        raise ValueError("Invalid touchdown count " + field)
    return int(x)


def make_week(starters, stats_by_player):
    """None signals incomplete source coverage; never interpret missing as zero."""
    ids = [str(p["player_id"]) for p in starters]
    if len(ids) != len(set(ids)) or not ids:
        return None
    if any(pid not in stats_by_player for pid in ids):
        return None
    out = []
    for player in starters:
        stats = stats_by_player[str(player["player_id"])]
        rushing = stat_td(stats, "rush_td")
        receiving = stat_td(stats, "rec_td")
        out.append({
            "season": int(player["season"]),
            "week": int(player["week"]),
            "game_type": player["game_type"],
            "franchise_id": int(player["franchise_id"]),
            "player_id": str(player["player_id"]),
            "player_name": player["player_name"],
            "position": player["position"],
            "rush_td": rushing,
            "rec_td": receiving,
            "touchdowns": rushing + receiving,
        })
    return out


def fetch_stats(season, week):
    url = API.format(season=season, week=week)
    for attempt in range(2):
        try:
            req = Request(url, headers={"User-Agent": "FantasyLeagueRecords/BoekMuse (read-only)"})
            with urlopen(req, timeout=28) as response:
                return parse_stat_rows(json.load(response))
        except (HTTPError, URLError, ValueError, TimeoutError, OSError) as exc:
            if attempt == 1:
                print(f"WARNING Sleeper stats unavailable for {season} Week {week}: {exc}", flush=True)
                return None
            time.sleep(1)
    return None


def build():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    if not isinstance(source, list):
        raise ValueError("Missing verified player start log")
    groups = defaultdict(list)
    for p in source:
        if p.get("position") not in OFFENSE_POSITIONS:
            continue
        if p.get("game_type") not in ("Regular Season", "Playoffs"):
            continue
        groups[key_of(p)].append(p)
    old = {"source": SOURCE, "records": [], "coverage": {}}
    if OUTPUT.exists():
        old = json.loads(OUTPUT.read_text(encoding="utf-8"))
        if old.get("source") != SOURCE:
            old = {"source": SOURCE, "records": [], "coverage": {}}
    old_coverage = old.get("coverage", {})
    previous = defaultdict(list)
    for row in old.get("records", []):
        previous[key_of(row)].append(row)
    completed = {}
    coverage = {}
    todo = defaultdict(list)
    for k, starters in groups.items():
        ids = sorted(str(p["player_id"]) for p in starters)
        if old_coverage.get(k) == ids and len(previous.get(k, [])) == len(ids):
            completed[k] = previous[k]
            coverage[k] = ids
        else:
            p = starters[0]
            todo[(int(p["season"]), int(p["week"]))].append((k, starters, ids))
    if todo:
        print(f"BoekMuse touchdown archive: {len(todo)} weeks require provider stats", flush=True)
    for (season, week), requested in sorted(todo.items()):
        stats = fetch_stats(season, week)
        if stats is None:
            continue
        for k, starters, ids in requested:
            result = make_week(starters, stats)
            if result is None:
                missing = [p["player_name"] for p in starters if str(p["player_id"]) not in stats]
                print(f"WARNING incomplete touchdowns {k}: {missing[:4]}", flush=True)
                continue
            completed[k] = result
            coverage[k] = ids
    records = [row for k in sorted(completed) for row in
               sorted(completed[k], key=lambda r: (r["season"], r["week"], r["franchise_id"], r["player_id"]))]
    out = {"source": SOURCE, "records": records, "coverage": dict(sorted(coverage.items()))}
    new_text = json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"
    if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != new_text:
        OUTPUT.write_text(new_text, encoding="utf-8")
        print(f"BoekMuse TD archive written: {len(records)} player starts, {len(coverage)} complete team-weeks", flush=True)
    else:
        print(f"BoekMuse TD archive unchanged: {len(records)} starts in {len(coverage)} verified team-weeks", flush=True)
    return len(coverage)


if __name__ == "__main__":
    if not build():
        print("WARNING no touchdown coverage; feature will not invent results", file=sys.stderr)
