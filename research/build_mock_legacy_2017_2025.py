#!/usr/bin/env python3
"""Research-only 2017-2025 smoothed Legacy Points mockup. All NFL games, not FIG starts."""
from __future__ import annotations
import csv
import json
import re
from collections import defaultdict
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"research"
SOURCE=json.loads((DIR/"fig_historical_ppg_2010_2025.json").read_text())
JS=(ROOT/"hall-of-fame-legacy-v245.js").read_text()
SEASONS=json.loads(re.search(r"const SEASONS=(\[[\s\S]*?\]);",JS).group(1))
FLOORS=json.loads(re.search(r"const FLOORS=(\[[\s\S]*?\]);",JS).group(1))
GAMES=json.loads(re.search(r"const GAMES=(\[[\s\S]*?\]);",JS).group(1))
THRESHOLD=int(re.search(r"const THRESHOLD=([0-9]+)",JS).group(1))
POS={"QB":1,"RB":2,"WR":3,"TE":4}
YEARS=range(2017,2026)
# Keep research watch flags aligned with the live commissioner list.
WATCH=set(re.findall(r"'([0-9]+)'", JS.split("const WATCH=new Set([",1)[1].split("]);",1)[0]))

def season_score(pos,ppg):
    idx=POS[pos]
    previous_ppg=FLOORS[idx-1]
    if ppg<=previous_ppg:
        return 0
    previous_points=0
    for tier in SEASONS:
        target_ppg=tier[idx]
        target_points=tier[0]
        if ppg<target_ppg:
            value=previous_points+(ppg-previous_ppg)/(target_ppg-previous_ppg)*(
                target_points-previous_points)
            return round(value+1e-9,1)
        previous_ppg=target_ppg
        previous_points=target_points
    return previous_points

def game_score(pos,score):
    pts=0
    for tier in GAMES:
        if score>=tier[0]:pts=tier[POS[pos]]
    return pts

def main():
    metadata={}
    for year in YEARS:
        doc=json.loads((DIR/f"fig_historical_{year}.json").read_text())
        for p in doc["players"]:
            metadata[str(p["id"])]=(p["name"],p["pos"])
    response=requests.get("https://api.sleeper.app/v1/players/nfl",timeout=75,
        headers={"Accept":"application/json","User-Agent":"FIGHistoricalMock/1.0"})
    response.raise_for_status()
    directory=response.json()
    if not isinstance(directory,dict) or len(directory)<500:
        raise RuntimeError("Incomplete Sleeper player directory")
    print("MOCK_DIRECTORY",len(directory),flush=True)
    played_file=json.loads((ROOT/"data"/"playoff_nfl_weekly_scores.json").read_text())
    if played_file.get("season")!=2026 or int(played_file.get("through_week") or 0)<1:
        raise RuntimeError("Missing verified 2026 appearances")
    played_2026=set(str(pid) for week in played_file["weeks"].values() for pid in week)
    print("MOCK_2026_APPEARED",len(played_2026),flush=True)
    pmap={}
    for year in YEARS:
        block=SOURCE["seasons"].get(str(year))
        if not block or len(block.get("players",{}))<200:
            raise RuntimeError("Missing scored NFL season "+str(year))
        count=0
        for pid,p in block["players"].items():
            pid=str(pid)
            if pid not in metadata:continue
            name,pos=metadata[pid]
            if pos not in POS:continue
            week_scores=p.get("weekly",[])
            if not week_scores:continue
            pts=sum(float(row[1]) for row in week_scores)
            games=len(week_scores)
            season=season_score(pos,pts/games) if games>=8 else 0
            bonuses=sum(game_score(pos,float(row[1])) for row in week_scores)
            row=pmap.setdefault(pid,dict(id=pid,player=name,position=pos,
                seasons=[],season_points=0,modeled_game_points=0,games=0))
            row["season_points"]=round(row["season_points"]+season,1)
            row["modeled_game_points"]+=bonuses
            row["games"]+=games
            row["seasons"].append({"year":year,"games":games,
                "ppg":round(pts/games,3),"season_points":season,"game_points":bonuses})
            count+=1
        print("MOCK_YEAR",year,count,flush=True)
    result=[]
    for pid,p in pmap.items():
        d=directory.get(pid) if isinstance(directory.get(pid),dict) else {}
        points=round(p["season_points"]+p["modeled_game_points"],1)
        p.update(played_2026=pid in played_2026, sleeper_active_flag=bool(d.get("active")),current_team=d.get("team"),
            status=d.get("status"),watchlist=pid in WATCH,
            total=points,remaining=max(0,THRESHOLD-points),
            qualifying_seasons=sum(q["games"]>=8 for q in p["seasons"]),
            eligible=points>=THRESHOLD)
        result.append(p)
    result.sort(key=lambda p:(-p["total"],-p["season_points"],p["player"]))
    for n,p in enumerate(result,1):p["rank"]=n
    active=[p for p in result if p["played_2026"]]
    for n,p in enumerate(active,1):p["active_rank"]=n
    cols=["rank","active_rank","player","position","played_2026","sleeper_active_flag","status",
          "current_team","watchlist","qualifying_seasons","games",
          "season_points","modeled_game_points","total","remaining","eligible","id"]
    for suffix,group in [("all",result),("active",active)]:
        path=DIR/f"fig_mock_legacy_2017_2025_{suffix}.csv"
        with path.open("w",newline="",encoding="utf-8") as f:
            writer=csv.DictWriter(f,fieldnames=cols,extrasaction="ignore")
            writer.writeheader()
            writer.writerows(group)
    out={"version":3,"official":False,"years":[2017,2025],
        "active_cohort":"Had a verified NFL scoring appearance during 2026 through published week cutoff",
        "active_through_week":played_file["through_week"],"eligibility_threshold":THRESHOLD,
        "method":"Smoothed FIG Legacy seasonal PPG curve with position-specific floors and linear interpolation between milestones for at least eight recorded NFL appearances. Hypothetical FIG-start game bonuses follow positional bands, including zero bonus for QB 20-29.99 point games; actual manager starts are not verified in the mock.",
        "limitations":["Pre-2021 fantasy scores can omit certain 50+ yard TD bonuses",
          "2017-2020 include NFL weeks 1-17; 2021-2025 weeks 1-18",
          "Non-started NFL games earn hypothetical game points but would not earn official FIG game points",
          "This research does not update real FIG eligibility"],
        "player_count":len(result),"active_count":len(active),
        "players":result}
    (DIR/"fig_mock_legacy_2017_2025.json").write_text(
        json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n")
    lines=["# Mock FIG Hall of Fame if the league started in 2017","",
           "Research-only ranking for NFL seasons 2017-2025.",
           "All player appearances use the FIG 2026 custom scoring rules.",
           "Season points require 8 NFL appearances, not historical FIG starts.",
           "Mock games treat every scored NFL appearance as a FIG start. QB 20-29.99 games earn zero bonus.",
           "No official Hall of Fame totals or eligibility have been changed.","",
           "Players: "+str(len(result))+". With verified 2026 NFL appearance: "+str(len(active))+".",
           "Eligible at "+str(THRESHOLD)+": "+str(sum(x["eligible"] for x in result))+".",
           "2026-appeared eligible: "+str(sum(x["eligible"] for x in active))+".","",
           "## Top 100 overall","",
           "| Rank | Player | Pos | Played 2026 | Season | Mock games | Total |",
           "|---:|---|:---:|:---:|---:|---:|---:|"]
    for p in result[:100]:
        lines.append(f"| {p['rank']} | {p['player']} | {p['position']} | "+
                     ("Yes" if p["played_2026"] else "No")+
                     f" | {p['season_points']} | {p['modeled_game_points']} | **{p['total']}** |")
    lines.extend(["","## Top 100 players with a verified 2026 NFL appearance","",
        "| Rank | Player | Pos | Seasons | Season | Mock games | Total |",
        "|---:|---|:---:|---:|---:|---:|---:|"])
    for p in active[:100]:
        lines.append(f"| {p['active_rank']} | {p['player']} | {p['position']} | "+
                     f"{p['qualifying_seasons']} | {p['season_points']} | "+
                     f"{p['modeled_game_points']} | **{p['total']}** |")
    lines.extend(["","## Download","",
        "The CSV files contain every ranked player. The JSON file also has season-level points and PPG.",
        "Figures are approximate wherever Sleeper did not publish particular long-play bonus statistics before 2021.",""])
    (DIR/"fig_mock_legacy_2017_2025.md").write_text("\n".join(lines)+"\n")
    print("MOCK_RESULT",json.dumps({"players":len(result),"active":len(active),
        "eligible":sum(x["eligible"] for x in result),
        "active_eligible":sum(x["eligible"] for x in active),
        "top25":[[p["player"],p["season_points"],p["modeled_game_points"],p["total"]] for p in result[:25]],
        "top_active":[[p["player"],p["total"]] for p in active[:20]]}),flush=True)

if __name__=="__main__":main()
