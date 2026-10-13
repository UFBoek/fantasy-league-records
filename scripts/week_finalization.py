"""Publish a scored fantasy week after Monday 11:45 PM Eastern and all NFL games final.

ESPN supplies only NFL game completion, never fantasy points. Sleeper supplies
scores. Failed completion checks do not override the existing safe week.
"""
import json
import urllib.request
from datetime import datetime, time, timedelta, timezone
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
    first = min(starts).date()
    monday = first + timedelta(days=(0-first.weekday()) % 7)
    gate = datetime.combine(monday, time(23, 45), tzinfo=EASTERN)
    clock = (now or datetime.now(timezone.utc)).astimezone(EASTERN)
    return clock >= gate


def independent_week_final(year, week, now=None, fetcher=None):
    clock = (now or datetime.now(timezone.utc)).astimezone(EASTERN)
    if week < 1 or week > 18:
        return False
    if clock.weekday() in (4, 5, 6) or (clock.weekday() == 0 and clock.time() < time(23, 45)):
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
        return all_games_final(result, clock)
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
        if roster in scores or not (-10000 < value < 10000):
            return None
        scores[roster] = round(value, 2)
    return scores if len(scores) == 10 else None
