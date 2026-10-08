# ============================================================
# SECTION 22 — HISTORICAL DRAFT-PICK OWNERSHIP AUDIT (v2)
# ------------------------------------------------------------
# Self-contained and safe to run as the final Colab cell.
# Does NOT modify official standings, scoring, Google Sheets,
# existing database exports, or the website.
#
# Evidence, not guesses:
# - Complete linked Sleeper league chain
# - Draft metadata / actual selections / draft traded-picks
# - All completed trade transactions (weeks 0..18)
# - League traded-picks snapshots for cross-checking
# - Timestamp-ordered ownership histories by
#   (pick_year, round, original_roster_id)
# - Round-level conservation checks and evidence-based matching
# - James (F10) / Hayden (F6) trade-specific output
#
# Sleeper's draft_slot and slot_to_roster_id describe draft
# board positions. They are NOT automatically proof of an
# original traded-pick identity. Ambiguous outcomes stay unverified.
# ============================================================

import csv
import json
import time
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

DA_LEAGUE_ID = str(globals().get("CURRENT_LEAGUE_ID", "1311997831757705216"))
DA_OUTPUT_DIRECTORY = Path("draft_pick_audit_v2")
DA_EXCLUDED_DRAFT_IDS = {"936562652309004288"}  # Unrelated 2023 supplemental draft
DA_JAMES_FRANCHISE = 10
DA_HAYDEN_FRANCHISE = 6
DA_WEEKS = range(0, 19)  # Includes off-season transactions (week 0)
DA_BASE = "https://api.sleeper.app/v1"


def da_norm_int(value):
    try:
        if value is None or value == "" or isinstance(value, bool):
            return None
        return int(value)
    except (ValueError, TypeError):
        return None


def da_key(year, round_number, original):
    year = str(year) if year is not None else None
    rnd = da_norm_int(round_number)
    original = da_norm_int(original)
    if not year or year == "None" or rnd is None or original is None:
        return None
    return (year, rnd, original)


def da_iso(timestamp):
    if timestamp is None:
        return ""
    try:
        return datetime.fromtimestamp(int(timestamp) / 1000, timezone.utc).isoformat()
    except (ValueError, TypeError, OSError):
        return ""


def da_fetch(session, endpoint, optional=False):
    """Retry rate limiting/transient failures; never silently skip required data."""
    url = DA_BASE + endpoint
    for attempt in range(5):
        response = session.get(url, timeout=45)
        if optional and response.status_code == 404:
            return []
        if response.status_code in (429, 500, 502, 503, 504) and attempt < 4:
            time.sleep(min(2 ** attempt, 8))
            continue
        response.raise_for_status()
        return response.json()
    raise RuntimeError("Unexpected retry exhaustion: " + url)


def da_write_json(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False, default=str)


def da_write_csv(path, rows, columns):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict))
                             else ("" if v is None else v) for k, v in row.items()})


def da_collect(session, output):
    raw = output / "raw"
    leagues = []
    league_id = DA_LEAGUE_ID
    seen = set()
    while league_id and league_id not in seen:
        seen.add(league_id)
        league = da_fetch(session, "/league/" + league_id)
        da_write_json(raw / ("league_" + league_id + ".json"), league)
        roster_rows = da_fetch(session, "/league/" + league_id + "/rosters") or []
        da_write_json(raw / ("rosters_" + league_id + ".json"), roster_rows)
        roster_ids = sorted({da_norm_int(r.get("roster_id")) for r in roster_rows
                             if da_norm_int(r.get("roster_id")) is not None})
        leagues.append({"league_id": league_id, "season": str(league["season"]),
                        "total_rosters": da_norm_int(league.get("total_rosters")),
                        "roster_ids": roster_ids,
                        "status": league.get("status")})
        league_id = str(league.get("previous_league_id") or "")
    if league_id:
        raise ValueError("Cycle in linked Sleeper leagues; refusing incomplete audit")
    leagues.sort(key=lambda row: row["season"])
    da_write_json(output / "league_chain.json", leagues)

    drafts = []
    selections = []
    draft_snapshots = []
    league_snapshots = []
    transactions = []
    seen_transactions = set()

    for league in leagues:
        lid, season = league["league_id"], league["season"]
        ldir = raw / (season + "_" + lid)
        league_drafts = da_fetch(session, "/league/" + lid + "/drafts") or []
        da_write_json(ldir / "drafts.json", league_drafts)
        lp = da_fetch(session, "/league/" + lid + "/traded_picks", optional=True) or []
        da_write_json(ldir / "league_traded_picks.json", lp)
        for p in lp:
            if isinstance(p, dict):
                league_snapshots.append({"league_season": season, "league_id": lid, **p})

        for draft_row in league_drafts:
            did = str(draft_row.get("draft_id"))
            if not did or did == "None":
                raise ValueError("Draft has no draft_id for season " + season)
            draft = da_fetch(session, "/draft/" + did)
            picks = da_fetch(session, "/draft/" + did + "/picks") or []
            traded = da_fetch(session, "/draft/" + did + "/traded_picks", optional=True) or []
            da_write_json(ldir / ("draft_" + did + ".json"), draft)
            da_write_json(ldir / ("draft_" + did + "_picks.json"), picks)
            da_write_json(ldir / ("draft_" + did + "_traded_picks.json"), traded)
            year = str(draft.get("season") or season)
            settings = draft.get("settings") or {}
            slot_map = draft.get("slot_to_roster_id") or {}
            is_primary = did not in DA_EXCLUDED_DRAFT_IDS
            if year == "2023":
                kind = "startup" if is_primary and da_norm_int(settings.get("rounds")) == 25 else "other"
            else:
                kind = "rookie" if is_primary and da_norm_int(settings.get("rounds")) == 4 else "other"
            drafts.append({"league_id": lid, "league_season": season,
                           "draft_id": did, "draft_season": year,
                           "draft_type": draft.get("type"), "draft_kind": kind,
                           "status": draft.get("status"), "rounds": da_norm_int(settings.get("rounds")),
                           "teams": da_norm_int(settings.get("teams")),
                           "start_time": da_norm_int(draft.get("start_time")),
                           "slot_to_roster_id": slot_map,
                           "draft_order": draft.get("draft_order") or {}})
            for pick in picks:
                meta = pick.get("metadata") or {}
                slot = da_norm_int(pick.get("draft_slot"))
                slot_roster = da_norm_int(slot_map.get(str(slot))) if slot is not None else None
                name = (" ".join(str(meta.get(k) or "").strip() for k in ("first_name", "last_name"))).strip()
                selections.append({"draft_id": did, "draft_year": year,
                                   "draft_kind": kind, "draft_status": draft.get("status"),
                                   "round": da_norm_int(pick.get("round")),
                                   "pick_no": da_norm_int(pick.get("pick_no")),
                                   "draft_slot": slot,
                                   "slot_map_roster_id_NOT_ORIGINAL_PROOF": slot_roster,
                                   "selecting_roster_id": da_norm_int(pick.get("roster_id")),
                                   "picked_by_user_id": pick.get("picked_by"),
                                   "player_id": str(pick.get("player_id") or ""),
                                   "player_name": name, "position": meta.get("position"),
                                   "nfl_team": meta.get("team")})
            for p in traded:
                if isinstance(p, dict):
                    draft_snapshots.append({"draft_id": did, "draft_year": year, **p})

        for week in DA_WEEKS:
            tx_list = da_fetch(session, "/league/" + lid + "/transactions/" + str(week), optional=(week == 0)) or []
            da_write_json(ldir / ("transactions_week_" + str(week) + ".json"), tx_list)
            for tx in tx_list:
                transaction_id = str(tx.get("transaction_id") or "")
                if not transaction_id:
                    raise ValueError("Transaction missing ID in season " + season)
                if transaction_id in seen_transactions:
                    continue
                seen_transactions.add(transaction_id)
                if tx.get("type") != "trade" or tx.get("status") != "complete":
                    continue
                transactions.append({"league_season": season, "league_id": lid,
                                     "week": week, "transaction_id": transaction_id,
                                     "created": da_norm_int(tx.get("created")),
                                     "status_updated": da_norm_int(tx.get("status_updated")),
                                     "roster_ids": [da_norm_int(x) for x in (tx.get("roster_ids") or [])],
                                     "draft_picks": tx.get("draft_picks") or []})
    return leagues, drafts, selections, transactions, draft_snapshots, league_snapshots


def da_build_reports(leagues, drafts, selections, transactions, draft_snapshots, league_snapshots):
    """Pure reconciliation: accepts source-derived structures; suitable for fixture tests."""
    roster_counts = {l["season"]: l["total_rosters"] for l in leagues}
    roster_ids_by_year = {l["season"]: l.get("roster_ids") or list(range(1, l["total_rosters"] + 1))
                          for l in leagues}
    if not leagues or any(not c for c in roster_counts.values()):
        raise ValueError("Missing league roster count — can't establish round completeness")
    eligible_drafts = [d for d in drafts if d["draft_kind"] in ("rookie", "startup")]
    if len(set((d["draft_season"], d["draft_kind"]) for d in eligible_drafts)) != len(eligible_drafts):
        raise ValueError("Multiple primary drafts for the same season/type; choose manually")
    sel_by_draft_round = defaultdict(list)
    for s in selections:
        if s["draft_kind"] not in ("rookie", "startup"):
            continue
        sel_by_draft_round[(s["draft_id"], s["round"])].append(s)

    events = []
    james_hayden_keys = set()
    for tx in transactions:
        ids = set(tx["roster_ids"])
        pair_trade = DA_JAMES_FRANCHISE in ids and DA_HAYDEN_FRANCHISE in ids
        for p in tx["draft_picks"]:
            if not isinstance(p, dict):
                continue
            k = da_key(p.get("season"), p.get("round"), p.get("roster_id"))
            if k is None:
                continue
            sender = da_norm_int(p.get("previous_owner_id"))
            receiver = da_norm_int(p.get("owner_id"))
            events.append({"pick_year": k[0], "round": k[1], "original_franchise": k[2],
                           "previous_owner": sender, "new_owner": receiver,
                           "transaction_id": tx["transaction_id"], "trade_season": tx["league_season"],
                           "week": tx["week"], "status_updated_ms": tx["status_updated"],
                           "trade_time_utc": da_iso(tx["status_updated"]),
                           "james_hayden_direct_trade": pair_trade})
            if pair_trade:
                james_hayden_keys.add(k)
    events.sort(key=lambda e: (e["status_updated_ms"] if e["status_updated_ms"] is not None else -1,
                               e["transaction_id"], e["original_franchise"], e["round"]))
    event_by_key = defaultdict(list)
    for e in events:
        event_by_key[(e["pick_year"], e["round"], e["original_franchise"])].append(e)

    snap_by_draft = defaultdict(dict)
    for p in draft_snapshots:
        k = da_key(p.get("season"), p.get("round"), p.get("roster_id"))
        if k:
            snap_by_draft[p["draft_id"]][k] = da_norm_int(p.get("owner_id"))

    audit_rows, round_rows, chains = [], [], []
    for d in eligible_drafts:
        did, year = d["draft_id"], d["draft_season"]
        nteams = d["teams"] or roster_counts.get(year)
        if nteams is None:
            raise ValueError("Draft has no team count: " + did)
        orig_ids = roster_ids_by_year.get(year, list(range(1, nteams + 1)))
        if len(orig_ids) != nteams:
            raise ValueError(f"{year}: Expected {nteams} rosters, found {len(orig_ids)}")
        for rnd in range(1, int(d["rounds"]) + 1):
            actual = sel_by_draft_round.get((did, rnd), [])
            if d["status"] != "complete":
                continue  # Future picks retain full evidence, but no claim about a selection
            expected_holders = Counter()
            chain_per_original = {}
            for original in orig_ids:
                k = (year, rnd, original)
                holder = original
                errors = []
                trail = [original]
                for e in event_by_key.get(k, []):
                    if e["previous_owner"] != holder:
                        errors.append("PREVIOUS_OWNER_MISMATCH")
                    if e["new_owner"] is None:
                        errors.append("NO_RECEIVING_OWNER")
                    else:
                        holder = e["new_owner"]
                        trail.append(holder)
                snapshot_owner = snap_by_draft[did].get(k)
                if snapshot_owner is not None and snapshot_owner != holder:
                    errors.append("DRAFT_SNAPSHOT_DISAGREES")
                expected_holders[holder] += 1
                chain_per_original[original] = (holder, errors, trail, snapshot_owner)
            actual_holders = Counter(s["selecting_roster_id"] for s in actual)
            complete_round = len(actual) == nteams and all(s["selecting_roster_id"] is not None for s in actual)
            equal_ownership = complete_round and actual_holders == expected_holders
            round_rows.append({"draft_year": year, "draft_kind": d["draft_kind"], "draft_id": did,
                               "round": rnd, "total_franchises": nteams,
                               "number_of_selections": len(actual),
                               "expected_picks_per_holder": dict(sorted(expected_holders.items())),
                               "actual_picks_per_holder": dict(sorted(actual_holders.items(), key=lambda it: str(it[0]))),
                               "all_owner_counts_match": equal_ownership,
                               "status": "RECONCILED" if equal_ownership else "UNRECONCILED"})
            for original in orig_ids:
                k = (year, rnd, original)
                holder, errors, trail, snapshot_owner = chain_per_original[original]
                candidates = [s for s in actual if s["selecting_roster_id"] == holder]
                exact_match = (equal_ownership and not errors and len(candidates) == 1
                               and expected_holders[holder] == 1)
                if exact_match:
                    status = "UNIQUE_OWNER_ROUND_MATCH"
                elif not equal_ownership:
                    status = "UNRESOLVED_ROUND_RECONCILIATION"
                elif errors:
                    status = "UNRESOLVED_OWNERSHIP_CHAIN"
                else:
                    status = "AMBIGUOUS_MULTIPLE_PICKS_SAME_OWNER_ROUND"
                matched = candidates[0] if exact_match else None
                row = {"draft_year": year, "round": rnd, "original_franchise": original,
                       "draft_id": did, "draft_kind": d["draft_kind"], "expected_draft_owner": holder,
                       "snapshot_draft_owner": snapshot_owner,
                       "trade_count": len(event_by_key.get(k, [])), "owner_path": trail,
                       "chain_warnings": errors, "round_reconciled": equal_ownership,
                       "resolution_status": status, "selection_verified_by_unique_match": bool(exact_match),
                       "pick_no": matched["pick_no"] if matched else None,
                       "player_id": matched["player_id"] if matched else None,
                       "player_name": matched["player_name"] if matched else None,
                       "possible_pick_numbers": [s["pick_no"] for s in candidates],
                       "possible_players": [s["player_name"] for s in candidates],
                       "in_james_hayden_trade": k in james_hayden_keys,
                       "held_by_james_at_draft": holder == DA_JAMES_FRANCHISE,
                       "held_by_hayden_at_draft": holder == DA_HAYDEN_FRANCHISE}
                audit_rows.append(row)
                chains.append({"draft_year": year, "round": rnd, "original_franchise": original,
                               "owner_path": trail, "final_reconstructed_owner": holder,
                               "snapshot_owner": snapshot_owner, "issues": errors,
                               "events": event_by_key.get(k, [])})

    audit_rows.sort(key=lambda r: (int(r["draft_year"]), r["round"], r["original_franchise"]))
    targeted = [r for r in audit_rows if r["in_james_hayden_trade"]]
    unverified = [r for r in audit_rows if not r["selection_verified_by_unique_match"]]
    # Keep transaction events for all future draft pick years, even if no completed draft yet.
    drafted_keys = {(r["draft_year"], r["round"], r["original_franchise"]) for r in audit_rows}
    future_events = [e for e in events if (e["pick_year"], e["round"], e["original_franchise"]) not in drafted_keys]
    return {"trade_pick_events": events, "draft_round_reconciliation": round_rows,
            "pick_ownership_chains": chains, "pick_resolution_audit": audit_rows,
            "james_hayden_picks": targeted, "unverified_picks": unverified,
            "future_or_unmatched_pick_events": future_events}


def run_draft_audit(session=None, output_directory=DA_OUTPUT_DIRECTORY, download_in_colab=True):
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)
    client = session or requests.Session()
    leagues, drafts, selections, transactions, draft_snapshots, league_snapshots = da_collect(client, output)
    reports = da_build_reports(leagues, drafts, selections, transactions, draft_snapshots, league_snapshots)
    payloads = {"drafts": drafts, "draft_selections": selections,
                "completed_trade_transactions": transactions,
                "draft_traded_pick_snapshots": draft_snapshots,
                "league_traded_pick_snapshots": league_snapshots,
                **reports}
    for name, rows in payloads.items():
        da_write_json(output / (name + ".json"), rows)
        # CSV with a stable header, including when there are no rows.
        cols = list(dict.fromkeys(k for row in rows for k in row)) or ["no_rows"]
        da_write_csv(output / (name + ".csv"), rows, cols)
    manifest = {"project": "Fantasy League Records Site", "version": 2,
                "current_league_id": DA_LEAGUE_ID,
                "generated_utc": datetime.now(timezone.utc).isoformat(),
                "season_count": len(leagues), "draft_count": len(drafts),
                "draft_selection_count": len(selections),
                "completed_trade_count": len(transactions),
                "trade_pick_event_count": len(reports["trade_pick_events"]),
                "james_hayden_picks": len(reports["james_hayden_picks"]),
                "james_hayden_unique_matches": sum(r["selection_verified_by_unique_match"]
                    for r in reports["james_hayden_picks"]),
                "unreconciled_rounds": sum(not r["all_owner_counts_match"]
                    for r in reports["draft_round_reconciliation"])}
    da_write_json(output / "manifest.json", manifest)
    readme = """DRAFT-PICK OWNERSHIP AUDIT v2 — READ ME\n
Upload the generated ZIP to ChatGPT in the League Website project.
The original notebook, Google Sheets, and existing website data are unchanged.

START WITH:
- james_hayden_picks.csv: all completed James/Hayden-traded picks with outcomes or candidates
- unverified_picks.csv: unresolved matching cases
- draft_round_reconciliation.csv: original-owner totals vs actual owners per round
- pick_ownership_chains.csv: complete trade sequences with transaction evidence
- trade_pick_events.csv: who sent each original pick to whom, and when
- draft_selections.csv: players and actual pick numbers (raw Sleeper-derived)
- draft_traded_pick_snapshots.csv: extra draft-specific evidence
- raw/: untouched API response files, including each transaction week

IMPORTANT LIMITATIONS:
- A unique owner+round match is an evidence-based reconstruction, not an explicit
  Sleeper link from ORIGINAL pick -> selected player. Confirm it against raw records.
- If one manager owns several picks in the same round, their player assignments
  remain AMBIGUOUS even if their final owner matches.
- draft_slot and slot_to_roster_id are diagnostic only; they do not prove origin.
- An unmatched or conflicting round is NEVER silently resolved.
- 2023 supplemental draft is stored raw but excluded from primary draft audit.
- Future draft picks are exported as trade events, but never assigned player outcomes.
- This collector does not download player scoring (unnecessary for pick identity).
"""
    (output / "README.txt").write_text(readme, encoding="utf-8")
    archive_path = output.with_suffix(".zip")
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(output.rglob("*")):
            if f.is_file():
                zf.write(f, arcname=str(Path(output.name) / f.relative_to(output)))
    print("\nDRAFT PICK AUDIT FINISHED — send this ZIP back to ChatGPT")
    for k, v in manifest.items():
        print(f"{k}: {v}")
    print("ZIP:", archive_path.resolve())
    if download_in_colab:
        try:
            from google.colab import files
            files.download(str(archive_path))
        except ImportError:
            pass
    return archive_path


if __name__ == "__main__":
    run_draft_audit()
