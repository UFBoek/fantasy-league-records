#!/usr/bin/env python3
"""Analyze separately collected, non-official historical FIG-scored NFL performances."""
from __future__ import annotations
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"research"
SOURCE=DIR/"fig_historical_ppg_2010_2025.json"
RAW=json.loads(SOURCE.read_text(encoding="utf-8"))
js=(ROOT/"hall-of-fame-legacy-v245.js").read_text(encoding="utf-8")
season_tiers=json.loads(re.search(r"const SEASONS=(\[[\s\S]*?\]);",js).group(1))
pidx={"QB":1,"RB":2,"WR":3,"TE":4}
tvals=season_tiers[0]
TARGET_NAMES=[
"Christian McCaffrey","Cooper Kupp","Josh Allen","Patrick Mahomes",
"Travis Kelce","Derrick Henry","Davante Adams","Antonio Brown",
"Julio Jones","Tyreek Hill","Saquon Barkley","Adrian Peterson",
"Calvin Johnson","Rob Gronkowski","Jamaal Charles","Todd Gurley",
"Le'Veon Bell","Aaron Rodgers","Tom Brady","Lamar Jackson","Ja'Marr Chase",
"Puka Nacua","Jahmyr Gibbs","Trey McBride","CeeDee Lamb","Michael Thomas"
]

def perc(x,p):
 a=sorted(x)
 if not a:return None
 at=(len(a)-1)*p
 lo=int(at)
 hi=min(lo+1,len(a)-1)
 return round(a[lo]*(hi-at)+a[hi]*(at-lo),3) if hi!=lo else round(a[lo],3)

def season_points(pos,ppg):
 earned=0
 for row in season_tiers:
  if ppg>=row[pidx[pos]]:earned=row[0]
 return earned

year_detail={}
all_rows=[]
leaders=[]
for y,entry in sorted(RAW["seasons"].items()):
 rows=[dict(player_id=pid,year=int(y),**p) for pid,p in entry["players"].items()]
 all_rows.extend(rows)
 season_summary={"year":int(y),"weeks":entry["weeks"],
                 "player_count":len(rows),"categories":{},
                 "top_10":{},"missing_bonus_keys":entry["missing_bonus_keys"]}
 for pos in pidx:
  eligible=sorted((v for v in rows if v["pos"]==pos and v["games"]>=8),
                  key=lambda row:row["ppg"],reverse=True)
  scores=[p["ppg"] for p in eligible]
  positive=[p for p in eligible if p["ppg"]>=season_tiers[0][pidx[pos]]]
  season_summary["categories"][pos]={
    "qualifying_games_8":len(eligible),
    "avg_ppg":round(sum(scores)/len(scores),3) if scores else None,
    "median_ppg":perc(scores,.5),"p75":perc(scores,.75),
    "p90":perc(scores,.9),
    "entry_15_rate":round(len(positive)/len(eligible)*100,2) if eligible else None,
    "top_5_avg":round(sum(v["ppg"] for v in eligible[:5])/min(5,len(eligible)),3) if eligible else None,
    "top_10_avg":round(sum(v["ppg"] for v in eligible[:10])/min(10,len(eligible)),3) if eligible else None,
    "top_20_avg":round(sum(v["ppg"] for v in eligible[:20])/min(20,len(eligible)),3) if eligible else None,
    "earned_season_points":sum(season_points(pos,p["ppg"]) for p in eligible)
  }
  season_summary["top_10"][pos]=[
    {"name":v["name"],"ppg":v["ppg"],"games":v["games"],
     "legacy_tier":season_points(pos,v["ppg"])} for v in eligible[:10]]
  for v in eligible[:10]:leaders.append({"year":int(y),"pos":pos,**v})
 year_detail[y]=season_summary
 # Smaller individual files for lookup and comparison; full weekly details remain in source.
 slim=[{"id":v["player_id"],"name":v["name"],"pos":v["pos"],
        "games":v["games"],"total":v["total"],"ppg":v["ppg"]} for v in rows]
 (DIR/f"fig_historical_{y}.json").write_text(
   json.dumps({"year":int(y),"source":"Sleeper raw weekly stats under FIG 2026 scoring",
               "players":slim},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")

samples={}
for name in TARGET_NAMES:
 matches=sorted((p for p in all_rows if p["name"].casefold()==name.casefold()
                 and p["games"]>=8),key=lambda v:v["year"])
 samples[name]=[{"year":v["year"],"pos":v["pos"],"games":v["games"],
                 "ppg":v["ppg"],"tier":season_points(v["pos"],v["ppg"])} for v in matches]

aggregate={}
for start,end in [(2010,2025),(2013,2025),(2014,2025),(2021,2025)]:
 period=[r for r in all_rows if start<=r["year"]<=end and r["games"]>=8]
 bypos={}
 for pos in pidx:
  filtered=[r for r in period if r["pos"]==pos]
  bypos[pos]={
    "player_seasons":len(filtered),
    "median":perc([r["ppg"] for r in filtered],.5),
    "top_10_avg_across_seasons":round(sum(year_detail[str(y)]["categories"][pos]["top_10_avg"]
     for y in range(start,end+1))/(end-start+1),2),
    "earning_entry":len([r for r in filtered if r["ppg"]>=season_tiers[0][pidx[pos]]]),
    "earning_entry_pct":round(100*len([r for r in filtered if r["ppg"]>=season_tiers[0][pidx[pos]]])/len(filtered),1),
    "tier_points":sum(season_points(pos,r["ppg"]) for r in filtered),
    "average_tier_points":round(sum(season_points(pos,r["ppg"]) for r in filtered)/len(filtered),2)
  }
 aggregate[f"{start}-{end}"]=bypos

out={"version":1,"official_fig_points_awarded":False,
     "seasons":year_detail,"sample_players":samples,
     "baselines":aggregate,"season_tiers":season_tiers,
     "notes":["2010-2020 source is missing 50-yard passing and receiving TD bonus keys",
              "NFL games played, not FIG starts. Minimum 8 appearances for comparisons.",
              "2024 and 2025 raw scores matched 2,962/2,962 FIG started appearances."]}
(DIR/"fig_historical_baselines.json").write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")

print("HISTORICAL_BASELINES "+json.dumps(aggregate,separators=(",",":")),flush=True)
for name in ["Christian McCaffrey","Cooper Kupp","Josh Allen","Travis Kelce","Derrick Henry","Davante Adams"]:
 print("HISTORICAL_PLAYER "+json.dumps({"name":name,"seasons":samples[name]},separators=(",",":")),flush=True)
print("HISTORICAL_ANALYZED "+str(len(all_rows))+" NFL player-seasons",flush=True)
