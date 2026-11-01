#!/usr/bin/env python3
"""Non-publishing Sleeper historical stats diagnostic for FIG scoring."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from build_playoff_player_scores import fetch_sleeper,source_rows,fantasy_score
import requests

root=Path(__file__).resolve().parents[1]
settings=json.loads((root/"data/league_settings.json").read_text())
rules=json.loads(next(x for x in settings if x["season"]==2026)["scoring_settings_json"])
for year in [2010,2013,2019,2022,2024]:
 for week in [1]:
  try:
   payload=fetch_sleeper("stats",year,week)
   rows=list(source_rows(payload))
   allkeys=set().union(*(set(v) for _,v in rows)) if rows else set()
   nonzero={k for k,v in rules.items() if v and k in allkeys}
   scored=[(pid,fantasy_score(stat,rules),stat.get("gp")) for pid,stat in rows]
   print("FIG_HISTORICAL_PROBE",json.dumps({
     "year":year,"week":week,"players":len(rows),"stat_fields":len(allkeys),
     "rule_fields_present":sorted(nonzero),
     "rule_fields_missing":sorted(k for k,v in rules.items() if v and k not in allkeys),
     "first_player":rows[0][0] if rows else None,
     "first_stats":{k:rows[0][1][k] for k in list(rows[0][1])[:15]} if rows else {},
     "scored_player_count":sum(z[1] is not None for z in scored)
   },sort_keys=True),flush=True)
  except Exception as e:
   print("FIG_HISTORICAL_PROBE_ERROR",json.dumps({"year":year,"error":str(e)}),flush=True)
try:
 r=requests.get("https://api.sleeper.app/v1/players/nfl",timeout=35,headers={"Accept":"application/json"})
 r.raise_for_status()
 names=r.json()
 print("FIG_NAMES",json.dumps({"count":len(names),"example":{k:{z:names[k].get(z) for z in ["full_name","position","first_name","last_name"]} for k in ["4984","4034","9493"] if k in names}}),flush=True)
except Exception as e:
 print("FIG_NAMES_ERROR",str(e),flush=True)
