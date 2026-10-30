from urllib.request import Request, urlopen
import json
from collections import Counter
url="https://api.sleeper.app/stats/nfl/regular/2026/7"
print("Probing Sleeper weekly NFL stat fields:",url)
req=Request(url,headers={"User-Agent":"LeagueArchive/1.0"})
try:
    with urlopen(req,timeout=15) as response:
        obj=json.load(response)
    print("TYPE",type(obj).__name__,"COUNT",len(obj))
    sample=list(obj.items())[:3] if isinstance(obj,dict) else obj[:3]
    for item in sample:
        print("SAMPLE",json.dumps(item,default=str)[:700])
    rows=list(obj.values()) if isinstance(obj,dict) else obj
    stats=[row.get("stats",{}) for row in rows if isinstance(row,dict)]
    print("TD_KEYS",dict(Counter(k for s in stats if isinstance(s,dict) for k in s if "td" in k).most_common(28)))
    if not stats or not any(("rec_td" in s or "rush_td" in s) for s in stats if isinstance(s,dict)):
        raise ValueError("Raw touchdowns unavailable in test payload")
except Exception as exc:
    print("PROBE FAILED",type(exc).__name__,str(exc))
    raise
