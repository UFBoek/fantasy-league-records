#!/usr/bin/env python3
"""Append one truthful daily dynasty-market snapshot after the validated RosterAudit refresh.

Mirrors app.js raTeamData / raDynastyPickValuation. Values are not reconstructed for
past dates, and retained stale RosterAudit snapshots never create false new days.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import math

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
TARGET = DATA / "dynasty_market_history.json"
JAMES, HAYDEN, BOEK = 10, 6, 1
JAMES_FIXED = (6300, 1600, 464, 146)


def read(name):
    return json.loads((DATA / (name + ".json")).read_text(encoding="utf-8"))


def number(value):
    if isinstance(value, bool) or value is None:
        return None
    try:
        result = float(value)
        return result if math.isfinite(result) and result >= 0 else None
    except (ValueError, TypeError):
        return None


def pick_price(pick, market):
    year = int(pick["pick_season"])
    rnd = int(pick["round"])
    origin = int(pick["original_franchise_id"])
    if origin == JAMES and 1 <= rnd <= len(JAMES_FIXED):
        return JAMES_FIXED[rnd - 1]
    tier = "late" if origin in (HAYDEN, BOEK) else "mid"
    source_year = max(year, 2027)
    return number(market.get("future_picks", {}).get(f"{source_year}:{rnd}:{tier}"))


def build_snapshot(market, rosters, picks, drafts):
    if market.get("status") != "ready" or len(market.get("players", {})) < 50:
        raise ValueError("A complete RosterAudit snapshot is required")
    updated_at = datetime.fromisoformat(market["updated_at"].replace("Z", "+00:00"))
    if updated_at.tzinfo is None:
        raise ValueError("RosterAudit timestamp needs a timezone")
    updated_at = updated_at.astimezone(timezone.utc)
    if updated_at > datetime.now(timezone.utc) + timedelta(minutes=10):
        raise ValueError("Future-dated market feed")
    if datetime.now(timezone.utc) - updated_at > timedelta(hours=30):
        print("Market history skipped: RosterAudit snapshot is stale")
        return None
    draft_year = max([2026] + [
        int(row["draft_season"]) for row in drafts
        if row.get("draft_status") == "complete" and row.get("draft_type") == "rookie"
    ])
    roster_by_team = {}
    pick_by_team = {}
    for row in rosters:
        fid = int(row["franchise_id"])
        roster_by_team.setdefault(fid, {})[str(row["player_id"])] = row
    for pick in picks:
        if int(pick["pick_season"]) <= draft_year:
            continue
        pick_by_team.setdefault(int(pick["current_franchise_id"]), []).append(pick)
    teams = []
    ids = sorted(set(roster_by_team) | set(pick_by_team))
    if len(ids) != 10:
        raise ValueError(f"Expected all 10 franchises, found {len(ids)}")
    for fid in ids:
        player_assets = []
        for pid, player in sorted(roster_by_team.get(fid, {}).items()):
            raw = market["players"].get(pid)
            value = number(raw.get("value")) if isinstance(raw, dict) else None
            # Same semantics as raPlayer: missing player IDs have value zero
            # when the overall market feed is ready.
            value = 0 if value is None else value
            player_assets.append([pid, value, str(player.get("position") or "")])
        draft_assets = []
        for pick in sorted(pick_by_team.get(fid, []),
                           key=lambda x: (int(x["pick_season"]), int(x["round"]),
                                          int(x["original_franchise_id"]))):
            val = pick_price(pick, market)
            draft_assets.append([int(pick["pick_season"]), int(pick["round"]),
                                 int(pick["original_franchise_id"]), val])
        player_total = sum(row[1] for row in player_assets)
        pick_total = sum(row[3] or 0 for row in draft_assets)
        teams.append({
            "franchise_id": fid,
            "players_value": round(player_total, 2),
            "picks_value": round(pick_total, 2),
            "total": round(player_total + pick_total, 2),
            "all_valued": all(row[3] is not None for row in draft_assets),
            "players": player_assets,
            "picks": draft_assets,
        })
    return {
        "date": updated_at.date().isoformat(),
        "source_updated_at": market["updated_at"],
        "format_key": market.get("format", {}).get("key", ""),
        "league_total": round(sum(t["total"] for t in teams), 2),
        "teams": teams,
    }


def main():
    snapshot = build_snapshot(read("rosteraudit_values"),
                              read("current_roster"),
                              read("current_future_picks"),
                              read("draft_picks"))
    if snapshot is None:
        return
    history = {"version": 1, "snapshots": []}
    if TARGET.exists():
        existing = json.loads(TARGET.read_text(encoding="utf-8"))
        if existing.get("version") != 1 or not isinstance(existing.get("snapshots"), list):
            raise ValueError("Unknown existing dynasty market history schema")
        history = existing
    previous = history["snapshots"]
    # Never change any previous day; update today's measurement in place.
    history["snapshots"] = [s for s in previous if s.get("date") != snapshot["date"]]
    history["snapshots"].append(snapshot)
    history["snapshots"].sort(key=lambda item: item["date"])
    serialized = json.dumps(history, separators=(",", ":"), ensure_ascii=False) + "\n"
    if TARGET.exists() and TARGET.read_text(encoding="utf-8") == serialized:
        print(f"Market snapshot unchanged: {snapshot['date']}")
        return
    temp = TARGET.with_suffix(".json.tmp")
    temp.write_text(serialized, encoding="utf-8")
    temp.replace(TARGET)
    print(f"Saved dynasty values for {snapshot['date']}: {len(snapshot['teams'])} franchises")


if __name__ == "__main__":
    main()
