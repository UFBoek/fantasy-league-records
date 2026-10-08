"""Trace James/Hayden assets through later Sleeper trades and rookie drafts.

All evidence comes from the existing deterministic site-data exports. This is
run after build_site_data.py and build_draft_pick_audit.py on every daily refresh.
A shared trade package is labelled a package, NOT a one-for-one conversion.
"""
from collections import defaultdict
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
NAMES = {1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'}

def j(name):
    return json.loads((DATA / f'{name}.json').read_text(encoding='utf-8'))

def pick_key(a):
    try:
        return f"pick:{int(a['pick_season'])}:{int(a['pick_round'])}:{int(a['original_pick_franchise_id'])}"
    except (TypeError, ValueError, KeyError):
        return None

def asset_key(a):
    if a.get('asset_type') == 'Player' and a.get('player_id'):
        return f"player:{a['player_id']}"
    if a.get('asset_type') == 'Draft Pick':
        return pick_key(a)
    return None

def asset_description(a):
    if a.get('asset_type') == 'Player':
        return a.get('player_name') or a.get('asset_label') or 'Unnamed player'
    if a.get('asset_type') == 'Draft Pick':
        return f"{a['pick_season']} R{a['pick_round']} · {NAMES.get(int(a['original_pick_franchise_id']), 'Unknown')}'s pick"
    return a.get('asset_label') or 'Other asset'

def build():
    trades = j('trades')
    assets = j('trade_assets')
    transactions = {str(x['transaction_id']): x for x in j('transactions') if x.get('transaction_type') == 'trade'}
    outcomes = {f"pick:{x['draft_year']}:{x['round']}:{x['original_franchise']}":x for x in j('draft_pick_outcomes_audit') if x.get('draft_kind')=='rookie'}
    side_ids = defaultdict(set)
    for s in j('trade_sides'):
        side_ids[str(s['transaction_id'])].add(int(s['franchise_id']))
    direct = [t for t in trades if {6,10} <= side_ids[str(t['transaction_id'])]]
    tidmap = {str(t['transaction_id']):t for t in trades}
    def time(tid):
        tx = transactions.get(str(tid)) or {}
        t = tidmap.get(str(tid)) or {}
        stamp = tx.get('status_updated_timestamp') or tx.get('created_timestamp')
        if stamp not in ('',None):
            return (int(stamp),int(str(tid)))
        # Only for historic exports without timestamps.
        return (int(t.get('season',0))*10**11+int(t.get('week',0))*10**8,int(str(tid)))
    grouped = defaultdict(list)
    sent_index = defaultdict(list)
    for a in assets:
        tid = str(a['transaction_id']); grouped[(tid,int(a['franchise_id']),a['asset_direction'])].append(a)
        k = asset_key(a)
        if k and a['asset_direction']=='Sent':
            sent_index[(int(a['franchise_id']),k)].append(a)
    for lst in sent_index.values():
        lst.sort(key=lambda a:time(a['transaction_id']))

    def after(a, start):
        return time(a['transaction_id']) > time(start)

    rows = {}
    for t in direct:
        tid = str(t['transaction_id'])
        for owner in (6,10):
            for a in grouped[(tid,owner,'Received')]:
                k = asset_key(a)
                if not k:
                    continue
                entry = {'asset':asset_description(a),'asset_key':k,'type':a['asset_type'],'received_by':owner,'trade_id':tid,
                         'transfers':[],'first_exchange':None,'draft_outcome':None,'warnings':[]}
                current_owner = owner
                cutoff_id = tid
                seen = set()
                # Every hop must be an actual transaction sending this exact player/pick
                # from the CURRENT holder. Don't jump over ownership-chain gaps.
                for _ in range(12):
                    candidates = [x for x in sent_index.get((current_owner,k),[]) if after(x,cutoff_id)]
                    if not candidates:
                        break
                    outgoing = candidates[0]
                    txid = str(outgoing['transaction_id'])
                    if txid in seen:
                        entry['warnings'].append('Repeated transfer ID in ownership chain')
                        break
                    seen.add(txid)
                    tr = tidmap.get(txid, outgoing)
                    next_owner = int(outgoing.get('counterparty_franchise_id') or 0)
                    co_sent = [asset_description(x) for x in grouped[(txid,current_owner,'Sent')] if asset_key(x)!=k]
                    acquired_rows = grouped[(txid,current_owner,'Received')]
                    acquired = [asset_description(x) for x in acquired_rows]
                    acquired_details = []
                    for received_asset in acquired_rows:
                        asset_id=asset_key(received_asset)
                        result=outcomes.get(asset_id) if asset_id and asset_id.startswith('pick:') else None
                        verified=bool(result and result.get('selection_verified_by_draft_slot') and result.get('player_name'))
                        acquired_details.append({'asset':asset_description(received_asset),
                                                 'asset_key':asset_id,
                                                 'drafted_as':result['player_name'] if verified else None,
                                                 'selection':f"{result['round']}.{int(result['draft_slot']):02d}" if verified else None})
                    step = {'season':str(tr['season']),'week':int(tr['week']),'trade_id':txid,
                            'from':current_owner,'to':next_owner if next_owner in NAMES else None,
                            'from_name':NAMES.get(current_owner),'to_name':NAMES.get(next_owner,'Unknown'),
                            'other_assets_sent':co_sent,'package_received':acquired,'package_received_details':acquired_details,
                            'package_size':len(grouped[(txid,current_owner,'Sent')])}
                    entry['transfers'].append(step)
                    if entry['first_exchange'] is None:
                        entry['first_exchange'] = step
                    if not next_owner or next_owner == current_owner:
                        entry['warnings'].append('Transfer counterparty unavailable')
                        break
                    current_owner = next_owner
                    cutoff_id = txid
                entry['last_traced_holder'] = current_owner
                if k.startswith('pick:'):
                    result = outcomes.get(k)
                    if result:
                        verified = bool(result.get('selection_verified_by_draft_slot'))
                        entry['draft_outcome'] = {
                            'draft_year':int(result['draft_year']),'round':int(result['round']),
                            'draft_slot':result.get('draft_slot'), 'player_name':result.get('player_name') if verified else None,
                            'player_id':result.get('player_id') if verified else None,
                            'selected_by':result.get('selecting_franchise') if verified else None,
                            'verified':verified,'warnings':result.get('chain_warnings') or []
                        }
                rows[f'{tid}:{owner}:{k}'] = entry

    # Both sides: trace what an original James/Hayden receipt was later
    # EXCHANGED FOR by its recipient. Do not assign an entire multi-asset return
    # to any one asset. Keep links to all the originating receipts instead.
    def next_sale(owner, key, cutoff):
        moves = [a for a in sent_index.get((owner,key),[]) if after(a,cutoff)]
        return moves[0] if moves else None

    def follow_return(owner, asset, received_tid, depth, visited):
        """At most four generations; only traverse trades made by this owner.

        Do not continue following an asset after it leaves the owner. Instead,
        trace what the owner received in that SAME exchange. Other franchises'
        subsequent actions aren't returns credited to this owner.
        """
        key=asset_key(asset)
        node={'asset':asset_description(asset),'asset_key':key,'asset_type':asset.get('asset_type'),
              'status':'no_later_trade_recorded','next_exchange':None,'drafted_as':None}
        if not key: return node
        event=next_sale(owner,key,received_tid)
        if not event:
            pick=outcomes.get(key)
            if key.startswith('pick:') and pick and pick.get('selection_verified_by_draft_slot'):
                if int(pick.get('selecting_franchise') or 0)==owner:
                    node['status']='drafted_by_recipient'
                    node['drafted_as']={'player':pick.get('player_name'),
                                        'pick':f"{pick['round']}.{int(pick['draft_slot']):02d}",
                                        'draft_year':pick.get('draft_year')}
                else:
                    node['status']='drafted_elsewhere_untraced'
            return node
        tid=str(event['transaction_id'])
        if depth<=0:
            node['status']='more_trades_exist'
            return node
        stamp=(owner,key,tid)
        if stamp in visited:
            node['status']='ownership_cycle'
            return node
        full=tidmap.get(tid, event)
        proceeds=grouped[(tid,owner,'Received')]
        node['status']='exchanged_again'
        node['next_exchange']={
            'trade_id':tid,'season':str(full['season']),'week':int(full['week']),
            'sent_with':[asset_description(a) for a in grouped[(tid,owner,'Sent')] if asset_key(a)!=key],
            'received':[follow_return(owner,a,tid,depth-1,visited|{stamp}) for a in proceeds]
        }
        return node

    conversion_by_owner={}
    for owner in (6,10):
        receipts=[a for row in rows.values() if row['received_by']==owner for a in [row]]
        groups={}
        drafted=[]
        pending=[]
        for row in receipts:
            first=row.get('first_exchange')
            label={'asset':row['asset'],'asset_key':row['asset_key'],
                   'source_trade_id':row['trade_id']}
            if first:
                key=str(first['trade_id'])
                if key not in groups:
                    tr=tidmap.get(key,{})
                    sent=grouped[(key,owner,'Sent')]
                    returns=grouped[(key,owner,'Received')]
                    groups[key]={
                        'trade_id':key,'season':str(tr.get('season') or first['season']),
                        'week':int(tr.get('week') or first['week']),
                        'counterparty':first['to_name'],
                        'contributing_origins':[],
                        'sent_package':[asset_description(a) for a in sent],
                        'received_package':[follow_return(owner,a,key,4,set()) for a in returns],
                    }
                if label not in groups[key]['contributing_origins']:
                    groups[key]['contributing_origins'].append(label)
            else:
                draft=row.get('draft_outcome')
                if row['type']=='Draft Pick' and draft and draft.get('verified') and int(draft.get('selected_by') or 0)==owner:
                    drafted.append({**label,'player':draft['player_name'],
                                    'draft_year':draft['draft_year'],
                                    'selection':f"{draft['round']}.{int(draft['draft_slot']):02d}"})
                else:
                    pending.append(label)
        conversion_by_owner[str(owner)]={
            'owner_name':NAMES[owner],
            'original_assets_received':len(receipts),
            'assets_exchanged':sum(len(g['contributing_origins']) for g in groups.values()),
            'exchange_packages':sorted(groups.values(),key=lambda g:time(g['trade_id']),reverse=True),
            'picks_drafted':drafted,
            'assets_not_recorded_as_exchanged':pending,
        }

    # Featured deal evidence calculated from source records, rather than
    # hand-labelled trade beneficiaries or imagined dollar-for-dollar trades.
    def recv(tid,owner):return grouped[(str(tid),owner,'Received')]
    def sold(tid,owner):return grouped[(str(tid),owner,'Sent')]

    gibbs_moves = [(str(a['transaction_id']),a) for a in assets
                   if a['asset_direction']=='Received' and a['asset_type']=='Player'
                   and a.get('player_name')=='Jahmyr Gibbs' and int(a['franchise_id'])==6]
    gibbs = None
    if gibbs_moves:
        gt,_ = max(gibbs_moves,key=lambda pair:time(pair[0]))
        traded=sold(gt,6)
        origin_links=[]
        for sent in traded:
            key=asset_key(sent)
            if not key:continue
            matched=[row for row in rows.values() if row['received_by']==6 and row['asset_key']==key
                     and row['first_exchange'] and row['first_exchange']['trade_id']==gt]
            for row in matched:
                origin_links.append({'source_trade_id':row['trade_id'],'asset':row['asset'],'asset_key':key})
        tr=tidmap[gt]
        gibbs={'target':'Jahmyr Gibbs','trade_id':gt,'season':str(tr['season']),'week':int(tr['week']),
               'received_by':6,'assets_sent':[asset_description(a) for a in traded],
               'assets_received':[asset_description(a) for a in recv(gt,6)],
               'direct_archive_links':origin_links}

    loveland = None
    selected=[x for x in outcomes.values() if x.get('player_name')=='Colston Loveland' and
              x.get('selection_verified_by_draft_slot') and int(x.get('selecting_franchise') or 0)==6]
    if selected:
        selection=selected[0]
        key=f"pick:{selection['draft_year']}:{selection['round']}:{selection['original_franchise']}"
        arrivals=[a for a in assets if asset_key(a)==key and a['asset_direction']=='Received' and int(a['franchise_id'])==6]
        if arrivals:
            arrival=max(arrivals,key=lambda a:time(a['transaction_id']))
            at=str(arrival['transaction_id'])
            package=sold(at,6)
            links=[]
            for x in package:
                k=asset_key(x)
                if not k:continue
                matches=[row for row in rows.values() if row['received_by']==6 and row['asset_key']==k
                         and row['first_exchange'] and row['first_exchange']['trade_id']==at]
                links.extend({'source_trade_id':m['trade_id'],'asset':m['asset'],'asset_key':k} for m in matches)
            tr=tidmap[at]
            loveland={'target':'Colston Loveland','trade_id':at,'season':str(tr['season']),'week':int(tr['week']),
                      'draft_season':int(selection['draft_year']),'pick':f"{selection['round']}.{int(selection['draft_slot']):02d}",
                      'received_by':6,'pick_acquired':asset_description(arrival),
                      'assets_sent':[asset_description(a) for a in package],
                      'assets_received':[asset_description(a) for a in recv(at,6)],
                      'direct_archive_links':links}
    return {'schema_version':2,'conversions':conversion_by_owner,'trade_count':len(direct),'asset_paths':rows,
            'featured':{'gibbs':gibbs,'loveland':loveland},
            'method':'Transaction timestamp order; exact Sleeper player IDs and pick year/round/original franchise. Bundle exchanges are package associations, not one-to-one asset conversions.'}

if __name__=='__main__':
    output=build()
    (DATA/'trade_lineage.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('TRADE LINEAGE:',output['trade_count'],'James-Hayden trades,',len(output['asset_paths']),'traceable assets')
    for k,v in output['featured'].items():
        print(k, v and {'trade_id':v['trade_id'],'sources':v['direct_archive_links']})
