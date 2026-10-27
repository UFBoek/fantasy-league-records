"""Independently finalize a week after the last NFL game ends, not at a fixed hour.

ESPN confirms that every NFL game is final. Two complete and matching Sleeper
score snapshots, 10 seconds apart, verify that league points have propagated.
The existing archive correction watcher can still revise later stat corrections.
Failures never advance the committed verified-week cutoff.
"""
import json
import math
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

EASTERN = ZoneInfo("America/New_York")
DATA = Path(__file__).resolve().parents[1] / "data"
ESPN_URL = ("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
            "?dates={year}&seasontype=2&week={week}&limit=1000")


def previous_verified():
    file = DATA / "verified_week_cutoffs.json"
    if not file.exists():
        return {}
    value = json.loads(file.read_text(encoding="utf-8"))
    return {str(k): max(0, int(v)) for k, v in value.items()}


def week_cutoff(status, leg, last_scored=None, verified=0):
    leg = max(0, int(leg or 0))
    if str(status).lower() == "complete":
        return leg
    sleeper = max(0, leg - 1)
    if last_scored is not None:
        sleeper = min(sleeper, max(0, int(last_scored)))
    return min(leg, max(sleeper, int(verified or 0)))


def all_games_final(payload, now=None):
    events = payload.get("events") if isinstance(payload, dict) else None
    if not isinstance(events, list) or len(events) < 10:
        return False
    ids = set()
    starts = []
    for event in events:
        if not isinstance(event, dict) or not event.get("id"):
            return False
        ids.add(str(event["id"]))
        try:
            start = datetime.fromisoformat(str(event["date"]).replace("Z", "+00:00"))
        except (KeyError, ValueError, TypeError):
            return False
        if start.tzinfo is None:
            return False
        starts.append(start.astimezone(EASTERN))
        if ((event.get("status") or {}).get("type") or {}).get("completed") is not True:
            return False
    if len(ids) != len(events):
        return False
    clock = (now or datetime.now(timezone.utc)).astimezone(EASTERN)
    # A broken scoreboard must never mark a future fixture as completed.
    # With all final flags and the entire week visible, the latest kickoff is
    # the only necessary time gate (Sunday-only weeks can finish on Sunday).
    return clock >= max(starts) and max(starts) - min(starts) < timedelta(days=9)


def league_scores_complete(matchups):
    """10 scored franchises with each starter's points reconciled to Sleeper PF."""
    scored = signature(matchups)
    if scored is None or set(scored) != {str(x) for x in range(1, 11)}:
        return None
    for row in matchups:
        starters = row.get("starters")
        points = row.get("starters_points")
        if (not isinstance(starters, list) or len(starters) != 10 or
                len(set(map(str, starters))) != 10 or
                not isinstance(points, list) or len(points) != 10):
            return None
        try:
            values = [float(value) for value in points]
        except (ValueError, TypeError):
            return None
        if not all(math.isfinite(x) for x in values):
            return None
        if abs(sum(values) - float(row["points"])) > 0.06:
            return None
    return scored


def independent_week_final(year, week, now=None, fetcher=None,
                           league_id=None, score_fetcher=None, sleep_fn=time.sleep):
    """Promote only after ESPN confirms final and Sleeper scoring stabilizes."""
    if week < 1 or week > 18:
        return False
    try:
        if fetcher is None:
            url = ESPN_URL.format(year=int(year), week=int(week))
            request = urllib.request.Request(url, headers={"User-Agent": "FIG-League-Archive",
                                                           "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=15) as response:
                result = json.load(response)
        else:
            result = fetcher(year, week)
        if not all_games_final(result, now):
            return False
        # Production must supply league_id; stand-alone legacy tests may probe
        # ESPN completion without a league. The publishing callers always
        # provide league_id and therefore also verify Sleeper fantasy scores.
        if league_id is None:
            return True

        def scores():
            if score_fetcher is not None:
                return score_fetcher(league_id, week)
            url = f"https://api.sleeper.app/v1/league/{league_id}/matchups/{week}"
            request = urllib.request.Request(url, headers={
                "User-Agent": "FIG-League-Archive/finalize",
                "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.load(response)

        first = league_scores_complete(scores())
        if first is None:
            print(f"Week {year} W{week}: Sleeper scoring incomplete; leave records unchanged")
            return False
        sleep_fn(10)
        second = league_scores_complete(scores())
        if second != first:
            print(f"Week {year} W{week}: Sleeper scoring changed or incomplete; retry later")
            return False
        return True
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"Week {year} W{week} completion unavailable: {exc}")
        return False


def signature(matchups):
    scores = {}
    for row in matchups or []:
        try:
            roster = str(int(row["roster_id"]))
            value = float(row["points"])
        except (KeyError, ValueError, TypeError):
            return None
        if roster in scores or not math.isfinite(value) or not (-10000 < value < 10000):
            return None
        scores[roster] = round(value, 2)
    return scores if len(scores) == 10 else None
