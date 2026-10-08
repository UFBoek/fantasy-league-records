#!/usr/bin/env python3
"""Seed site values from a RosterAudit CSV. CSV has no player IDs or preset metadata.

Match a player only on a unique normalized name + position in historical Sleeper data.
The daily workflow continues to refresh via build_rosteraudit_values.py.
"""
import argparse
import csv
from collections import defaultdict
from datetime import date
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
REFERENCE = {'current_roster':('player_name','position'), 'trade_assets':('player_name','position'),
             'draft_picks':('player_name','position'), 'weekly_full_rosters':('player_name','position'),
             'player_game_log':('player_name','position'), 'player_careers':('full_name','position')}
PICK_PATTERN = re.compile(r'^(20\d\d)\s+(Early|Mid|Late)\s+([1-5])(?:st|nd|rd|th)$', re.I)

def norm(text):
    text = unicodedata.normalize('NFKD', str(text)).encode('ascii', 'ignore').decode().lower()
    return re.sub('[^a-z0-9]', '', text)

def index_players(data):
    index = defaultdict(set)
    for filename,(namefield,posfield) in REFERENCE.items():
        for row in json.loads((data/(filename+'.json')).read_text(encoding='utf8')):
            pid,name,pos = str(row.get('player_id') or ''),row.get(namefield),row.get(posfield)
            if pid.isdigit() and name and pos:
                index[(norm(name),str(pos).upper())].add(pid)
    return index

def import_csv(path, snapshot_date, data=DATA):
    snapshot_date = date.fromisoformat(str(snapshot_date)).isoformat()
    path = Path(path)
    index = index_players(data)
    with path.open(newline='', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        required = {'Rank','Player','Position','Pos Rank','Team','Age','Value'}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError('CSV missing expected RosterAudit columns')
        rows = list(reader)
    if len(rows)<100: raise ValueError('Rankings CSV incomplete')
    players,picks={},{}
    unmatched,ambiguous=[],[]
    for row in rows:
        name,pos=row['Player'].strip(),row['Position'].strip().upper()
        value=int(row['Value'].replace(',','').strip()); rank=int(row['Rank'])
        if not (0<=value<=100000 and rank>0): raise ValueError('Invalid RosterAudit value')
        if pos=='PICK':
            match=PICK_PATTERN.fullmatch(name)
            if not match:
                unmatched.append({'name':name,'position':pos,'reason':'unknown pick format'})
                continue
            year,tier,rnd=match.groups(); key=f'{int(year)}:{int(rnd)}:{tier.lower()}'
            if key in picks: raise ValueError(f'Duplicate pick tier {key}')
            picks[key]=value
            continue
        ids=index.get((norm(name),pos),set())
        if len(ids)>1:
            ambiguous.append({'name':name,'position':pos,'candidate_ids':sorted(ids)})
            continue
        if not ids:
            unmatched.append({'name':name,'position':pos,'reason':'no unique Sleeper match'})
            continue
        pid=next(iter(ids))
        if pid in players: raise ValueError(f'Duplicate matched Sleeper player ID {pid}')
        entry={'value':value,'name':name,'position':pos,'rank':rank}
        if row.get('Pos Rank'): entry['position_rank']=int(row['Pos Rank'])
        players[pid]=entry
    roster=json.loads((data/'current_roster.json').read_text(encoding='utf8'))
    rosterids={str(x['player_id']) for x in roster}
    matched=len(rosterids.intersection(players))
    if len(players)<100 or matched<len(rosterids)*.7 or not picks:
        raise ValueError('Coverage too low; old snapshot was not overwritten')
    import sys
    sys.path.insert(0, str(ROOT))
    from scripts.build_rosteraudit_values import league_format
    settings=json.loads((data/'league_settings.json').read_text(encoding='utf8'))
    cfg=league_format(max(settings,key=lambda x:int(x['season'])))
    cfg['export_preset_verified']=False
    cfg['export_preset_note']='The CSV does not disclose its scoring format or league size.'
    payload={
        'status':'ready','updated_at':snapshot_date,'provider':'RosterAudit',
        'attribution':{'text':'Values by RosterAudit.com','url':'https://rosteraudit.com'},
        'format':cfg,'size_adjusted':False,
        'value_source':'User-provided RosterAudit rankings CSV (preset unconfirmed)',
        'snapshot_source':{'kind':'csv','filename':path.name,'export_date':snapshot_date,'preset_verified':False},
        'players':players,'future_picks':picks,
        'coverage':{'csv_rows':len(rows),'csv_player_rows':sum(x['Position']!='PICK' for x in rows),
                    'matched_player_values':len(players),'csv_pick_rows':sum(x['Position']=='PICK' for x in rows),
                    'matched_pick_tiers':len(picks),'current_roster_unique_players':len(rosterids),
                    'current_roster_matched_players':matched,'unmatched_csv':unmatched,'ambiguous_csv':ambiguous},
        'notes':['Current RosterAudit dynasty values from a rankings export, not historical trade-date valuations.',
                 'The CSV does not disclose its scoring preset or league size: values shown as supplied, without adjustment.',
                 'Player-to-Sleeper matching uses unique normalized name and position; no guessed player IDs.',
                 'Future undrafted picks use mid-round estimates if published; these are not exact pick-slot prices.']}
    dest=data/'rosteraudit_values.json'; tmp=dest.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
    tmp.replace(dest)
    print(f'Seeded {len(players)} player values, {len(picks)} pick tiers; roster coverage {matched}/{len(rosterids)}; unmatched CSV rows {len(unmatched)}, ambiguous {len(ambiguous)}')
    return payload

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--csv',required=True,type=Path)
    parser.add_argument('--date',required=True)
    opts=parser.parse_args()
    import_csv(opts.csv,opts.date)
