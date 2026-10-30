from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from collections import Counter
import json
urls=[
 "https://api.sleeper.app/stats/nfl/regular/2026/7",
 "https://api.sleeper.app/stats/nfl/regular/2025/7",
 "https://api.sleeper.app/stats/nfl/2026/7?season_type=regular",
 "https://api.sleeper.com/stats/nfl/2026/7?season_type=regular",
 "https://api.sleeper.app/stats/nfl/player/7525?season=2026&season_type=regular&grouping=week",
 "https://api.sleeper.app/v1/players/nfl?position=RB",
]
for url in urls:
 try:
  req=Request(url,headers={"User-Agent":"Mozilla/5.0"})
  with urlopen(req,timeout=12) as response:
   payload=response.read()
  obj=json.loads(payload)
  print("URL",url,"OK",type(obj).__name__,"COUNT",len(obj),"BYTES",len(payload),flush=True)
  sample=list(obj.items())[:1] if isinstance(obj,dict) else obj[:1]
  print("SAMPLE",json.dumps(sample)[:550],flush=True)
  rows=list(obj.values()) if isinstance(obj,dict) else obj
  stats=[r.get("stats",r) for r in rows if isinstance(r,dict)]
  td=Counter(k for s in stats if isinstance(s,dict) for k in s if "td" in k)
  print("TD_KEYS",dict(td.most_common(14)),flush=True)
 except Exception as e:
  print("URL",url,"FAILED",type(e).__name__,str(e)[:240],flush=True)
