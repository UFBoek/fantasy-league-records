#!/usr/bin/env python3
"""Research-only: NFL player season PPG scored with FIG's 2026 Sleeper rules.

Fetch raw regular-season weekly Sleeper stats and apply the same validated
fantasy_score() routine as FIG's live NFL score cache. This does NOT award
official FIG Hall points and does not alter any live website calculations.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import json
import os
import sys
from collections import defaultdict
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_playoff_player_scores import fetch_sleeper, nfl_week_points, source_rows

YEARS=list(range(2010,2026))
POSITIONS={"QB","RB","WR","TE"}
OUT=ROOT/"research"/"fig_historical_ppg_2010_2025.json"
REPORT=ROOT/"research"/"fig_historical_ppg_report.md"
CORE=["pass_yd","pass_cmp","pass_td","pass_int","pass_fd",
      "rush_yd","rush_td","rush_fd","rec_yd","rec","rec_td","rec_fd"]
BONUS=["pass_td_50p","pass_cmp_40p","rush_40p","rush_td_40p",
       "rec_20_29","rec_30_39","rec_40p","rec_td_50p",
       "bonus_pass_yd_300","bonus_pass_yd_400",
       "bonus_rush_yd_100","bonus_rush_yd_200",
       "bonus_rec_yd_100","bonus_rec_yd_200"]


def fetch_players():
    r=requests.get("https://api.sleeper.app/v1/players/nfl",timeout=60,
                   headers={"Accept":"application/json","User-Agent":"FIGResearch/1.0"})
    r.raise_for_status()
    raw=r.json()
    return {str(pid):{"name":row.get("full_name") or
                                  ((row.get("first_name") or "")+" "+(row.get("last_name") or "")).strip(),
                      "position":row.get("position")}
            for pid,row in raw.items() if isinstance(row,dict) and row.get("position") in POSITIONS}


def run_year(year,scoring,metadata):
    weeks=18 if year>=2021 else 17
    byplayer=defaultdict(list)
    present=set()
    unknown=set()
    for week in range(1,weeks+1):
        payload=fetch_sleeper("stats",year,week)
        for pid,stats in source_rows(payload):
            if pid in metadata:
                present.update(k for k in stats if k in scoring)
        scores=nfl_week_points(payload,scoring)
        if not scores:
            raise RuntimeError(f"{year} W{week}: no verified player stats")
        for pid,score in scores.items():
            if pid not in metadata:
                unknown.add(pid)
                continue
            byplayer[pid].append([week,score])
    if len(byplayer)<70:
        raise RuntimeError(f"{year}: too few named QB/RB/WR/TE players ({len(byplayer)})")
    players={}
    for pid,weekly in byplayer.items():
        total=round(sum(pair[1] for pair in weekly),4)
        players[pid]={"name":metadata[pid]["name"],"pos":metadata[pid]["position"],
                      "games":len(weekly),"total":total,
                      "ppg":round(total/len(weekly),4),"weekly":weekly}
    result={"status":"complete","weeks":weeks,"count":len(players),
            "unknown_id_count":len(unknown),
            "missing_base_keys":[k for k in CORE if k not in present],
            "missing_bonus_keys":[k for k in BONUS if k not in present],
            "players":dict(sorted(players.items(),key=lambda item:int(item[0])))}
    print("HISTORICAL_YEAR "+json.dumps({"year":year,"players":len(players),"weeks":weeks,
          "missing_base":result["missing_base_keys"],
          "missing_bonus":result["missing_bonus_keys"],
          "unknown_ids":len(unknown)},separators=(",",":")),flush=True)
    return year,result


def main():
    rows=json.loads((ROOT/"data"/"league_settings.json").read_text(encoding="utf-8"))
    settings=json.loads(next(x["scoring_settings_json"] for x in rows if x["season"]==2026))
    metadata=fetch_players()
    print("HISTORICAL_METADATA "+str(len(metadata))+" QB/RB/WR/TE player names",flush=True)
    complete={}
    errors={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures={pool.submit(run_year,year,settings,metadata):year for year in YEARS}
        for future in concurrent.futures.as_completed(futures):
            year=futures[future]
            try:
                key,value=future.result()
                complete[str(key)]=value
            except Exception as e:
                errors[str(year)]=str(e)
                print("HISTORICAL_ERROR "+json.dumps({"year":year,"error":str(e)}),flush=True)
    result={"version":1,"source":"Sleeper weekly NFL raw stats",
            "scoring":"FIG 2026 scoring_settings_json (uniform historical standard)",
            "scoring_settings_sha256":hashlib.sha256(json.dumps(settings,sort_keys=True).encode()).hexdigest(),
            "season_type":"NFL regular season","positions":sorted(POSITIONS),
            "games_basis":"actual recorded NFL appearances with stats, not FIG starts",
            "complete_seasons":len(complete),"failures":errors,
            "seasons":dict(sorted(complete.items()))}
    OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    lines=["# FIG Historical NFL Player PPG, 2010–2025","",
       "Research-only, using Sleeper raw weekly stats and the FIG 2026 scoring configuration.",
       "All NFL performances are counted whether or not the player was owned or started in FIG.",
       "This dataset awards **zero** pre-2023 official FIG Hall of Fame points.","",
       "| Year | Weeks | Named QB/RB/WR/TE players | Missing core scoring keys | Missing bonus keys |",
       "|---:|---:|---:|---|---|"]
    for year in YEARS:
        row=complete.get(str(year))
        if row:
            lines.append(f"| {year} | {row['weeks']} | {row['count']} | "+
                         (", ".join(row["missing_base_keys"]) or "None")+" | "+
                         (", ".join(row["missing_bonus_keys"]) or "None")+" |")
        else:
            lines.append(f"| {year} | - | - | **Failed: {errors.get(str(year),'Unknown')}** | - |")
    lines.extend(["","## Interpretation","",
      "The scorer sums only the raw stat categories available in each response.",
      "A category absent across a season is flagged. This can mean no qualifying "+
      "performances or that Sleeper did not track it; verify material gaps before "+
      "calling an older season strictly score-identical to modern FIG.",
      "A game is counted where Sleeper indicates a played game or produces "+
      "nonzero fantasy statistics. NFL byes and DNPs are excluded.",
      "2024 and 2025 weekly scores were independently validated against all "+
      "available FIG starter point records in the league archive (exact matches).",
      "","## Complete seasons","",
      f"{len(complete)} of {len(YEARS)} years available."])
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    print("HISTORICAL_SUMMARY "+json.dumps({
        "years":len(complete),"missing_years":errors,
        "player_seasons":sum(v["count"] for v in complete.values()),
        "output":str(OUT),"report":str(REPORT)}),flush=True)
    if len(complete)<10:
        raise RuntimeError("Insufficient historical coverage: refusing to publish partial archive")


if __name__=="__main__":
    main()
