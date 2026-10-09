#!/usr/bin/env python3
"""Fast, read-only change probe for the five-minute GitHub Actions schedule.

A changed, completed Sleeper transaction, roster, or league week triggers the
full validated data pipeline. Unchanged checks do not rewrite published data.
Hourly and manually initiated runs bypass this probe in the workflow.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
API = "https://api.sleeper.app/v1/league"


def read_snapshot(name):
    with (DATA / name).open(encoding="utf-8") as file:
        return json.load(file)


def sleeper_json(url):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "FIG-League-Archive/quick-refresh", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.load(response)


def roster_signature(rosters):
    """Only ownership and roster status matter; ignore volatile Sleeper metadata."""
    output = set()
    for roster in rosters:
        franchise = int(roster["roster_id"])
        starters = set(map(str, roster.get("starters") or []))
        reserve = set(map(str, roster.get("reserve") or []))
        taxi = set(map(str, roster.get("taxi") or []))
        for player in roster.get("players") or []:
            player_id = str(player)
            output.add(
                (franchise, player_id, player_id in starters,
                 player_id in reserve, player_id in taxi)
            )
    return output


def published_roster_signature(rows):
    return {
        (int(row["franchise_id"]), str(row["player_id"]),
         bool(row.get("is_starter")), bool(row.get("is_reserve")),
         bool(row.get("is_taxi")))
        for row in rows
    }


def changes_present():
    history = read_snapshot("league_history.json")
    current = max(history, key=lambda item: int(item["season"]))
    league_id = str(current["league_id"])
    season = str(current["season"])

    league = sleeper_json(f"{API}/{league_id}")
    leg = int((league.get("settings") or {}).get("leg") or 0)
    status = str(league.get("status") or "")
    if leg != int(current.get("current_leg") or 0) or status != str(current.get("status")):
        return "Sleeper week or league status changed"

    live_rosters = sleeper_json(f"{API}/{league_id}/rosters")
    published_rosters = read_snapshot("current_roster.json")
    if roster_signature(live_rosters) != published_roster_signature(published_rosters):
        return "Sleeper roster ownership, starters, bench, reserve, or taxi changed"

    # Transactions can be assigned to an earlier week or to the next week.
    # Check all current-season weeks through the next leg so accepted trades
    # are detected even if their transaction week is not the current NFL week.
    known_completed = {
        str(row["transaction_id"])
        for row in read_snapshot("transactions.json")
        if str(row.get("season")) == season and
        str(row.get("status", "")).lower() == "complete"
    }
    for week in range(1, min(18, max(1, leg + 1)) + 1):
        transactions = sleeper_json(f"{API}/{league_id}/transactions/{week}")
        for transaction in transactions or []:
            if str(transaction.get("status", "")).lower() != "complete":
                continue
            transaction_id = str(transaction.get("transaction_id") or "")
            if transaction_id and transaction_id not in known_completed:
                return f"New completed Sleeper transaction in week {week}"

    return None


def main():
    try:
        reason = changes_present()
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        # A failed probe must not silently suppress updates: try the complete
        # refresh pipeline (which has its own safety validation).
        reason = f"Quick check unavailable: {type(error).__name__}: {error}"
    should_refresh = reason is not None
    print(reason if should_refresh else "Sleeper unchanged; skip full rebuild and deployment.")
    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a", encoding="utf-8") as output:
            output.write(f"refresh={'true' if should_refresh else 'false'}\n")
    else:
        print(f"refresh={'true' if should_refresh else 'false'}")


if __name__ == "__main__":
    sys.exit(main())
