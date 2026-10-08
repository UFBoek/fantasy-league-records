from pathlib import Path
from collections import defaultdict
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
data={p.stem:json.loads(p.read_text(encoding='utf8')) for p in (root/'data').glob('*.json')}
fetch_data={'data/'+k+'.json':v for k,v in data.items()}
values=data['rosteraudit_values']; assets=data['trade_assets']; audit=data['draft_pick_outcomes_audit']; sides=data['trade_sides']; trades=data['trades']
by_trade=defaultdict(set)
for s in sides:by_trade[str(s['transaction_id'])].add(int(s['franchise_id']))
jh=sorted([t for t in trades if {6,10}<=by_trade[str(t['transaction_id'])]],key=lambda t:(int(t['season']),int(t['week']),str(t['transaction_id'])),reverse=True)
auditmap={(int(x['draft_year']),int(x['round']),int(x['original_franchise'])):x for x in audit}

def pick_price(y,r,origin):
    y,r,origin=int(y),int(r),int(origin)
    tier='early' if origin==10 else 'late' if origin in (1,6) else 'mid'
    sy=2027 if origin==10 or y<2027 else y
    return values['future_picks'].get(f'{sy}:{r}:{tier}')

def received(t,id):
    return [a for a in assets if str(a['transaction_id'])==str(t['transaction_id']) and int(a['franchise_id'])==id and a['asset_direction']=='Received']

def later_sold(t,id,a):
    k=(int(a['pick_season']),int(a['pick_round']),int(a['original_pick_franchise_id']))
    return any(x['asset_direction']=='Sent' and x['asset_type']=='Draft Pick' and int(x['franchise_id'])==id and (int(x['pick_season']),int(x['pick_round']),int(x['original_pick_franchise_id']))==k and (
            int(x['season'])>int(t['season']) or int(x['season'])==int(t['season']) and (int(x['week'])>int(t['week']) or int(x['week'])==int(t['week']) and str(x['transaction_id'])!=str(t['transaction_id']))) for x in assets)

def asset_market(t,id,a):
    if a['asset_type']=='Player':
        p=values['players'].get(str(a['player_id']))
        return p['value'] if p else None
    if a['asset_type']!='Draft Pick':return None
    y,r,orig=int(a['pick_season']),int(a['pick_round']),int(a['original_pick_franchise_id'])
    outcome=auditmap.get((y,r,orig))
    selected_elsewhere=bool(outcome and outcome.get('selection_verified_by_draft_slot') and outcome.get('selecting_franchise') is not None and int(outcome['selecting_franchise'])!=id)
    if orig==10 or later_sold(t,id,a) or selected_elsewhere or not outcome or not outcome.get('selection_verified_by_draft_slot'):
        return pick_price(y,r,orig)
    p=values['players'].get(str(outcome['player_id']))
    return p['value'] if p else None

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!doctype html><html><head></head><body><nav id="topNav" class="top-nav"></nav><div id="app"></div></body></html>')
    page.evaluate('ds=>{window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404};}',fetch_data)
    page.add_style_tag(content=(root/'styles.css').read_text(encoding='utf8'))
    page.add_script_tag(content=(root/'app.js').read_text(encoding='utf8'))
    page.wait_for_selector('.jh-trade-card')
    assert page.locator('.jh-trade-card').count()==12
    assert page.locator('.jh-market-total').count()==24
    calculated=[]
    for index,t in enumerate(jh):
        card=page.locator('.jh-trade-card').nth(index)
        for col_index,id in enumerate((10,6)):
            col=card.locator('.jh-receives').nth(col_index)
            priced=[v for a in received(t,id) if (v:=asset_market(t,id,a)) is not None]
            expected=sum(priced)
            shown=col.locator('.jh-market-total strong').inner_text().strip()
            shownnum=float(shown.replace(',','')) if priced else None
            assert shownnum==expected if priced else shown=='—', f'trade {t["transaction_id"]} owner {id}: {shown} vs {expected}'
            text=col.locator('.jh-market-total small').inner_text()
            assert f'{len(priced)} of {len(received(t,id))} assets valued' in text, (id,t['transaction_id'],text)
            calculated.append((str(t['transaction_id']),id,expected))
    print('Twelve James–Hayden trades: 24 independently reconciled market totals')
    for year,round,origin,expected in [(2027,1,6,2207),(2028,1,6,1505),(2029,4,1,77),
                                       (2024,2,6,884),(2028,1,10,4924),(2025,3,5,356)]:
        v=page.evaluate('([y,r,o])=>raPickValuation(y,r,o)',[year,round,origin])
        assert v['value']==expected, (year,round,origin,v,expected)
        print(f'{year} R{round} original franchise {origin}: {v["value"]} [{v["label"]}]')
    # User's direct example: James received Leyton's 2025 R3 in the 2023 trade,
    # later transferred it, and must NOT receive Tyler Shough's current value.
    target='999843359558574080'
    card=page.locator('.jh-trade-card').nth(next(i for i,x in enumerate(jh) if str(x['transaction_id'])==target))
    james=card.locator('.jh-receives').first
    slot=[x for x in james.locator('.jh-item').all() if "2025 · Round 3 · Leyton's original pick" in x.inner_text()]
    assert len(slot)==1
    text=slot[0].inner_text()
    assert 'Tyler Shough' in text, text
    assert 'Traded away after acquisition' in text, text
    assert '356' in text, text
    assert '3,564' not in text, text
    print('Tyler Shough example:',text.replace('\n',' | ')[:400])
    # Ranking and current-team pick prices should be calculated from the same helper.
    page.evaluate('()=>location.hash="#/dynasty"')
    page.wait_for_selector('.ra-rank-team')
    assert page.locator('.ra-rank-team').count()==10
    page.evaluate('()=>location.hash="#/team/6"')
    page.wait_for_selector('.ra-team-overview')
    assert 'late tier' in page.locator('.ra-team-overview').inner_text()
    page.locator('#teamTabs button[data-tab="roster"]').click()
    page.wait_for_selector('.future-pick')
    assert page.locator('.future-pick').count()>0
    if errors:raise AssertionError(errors)
    page.evaluate('()=>location.hash="#/home"')
    page.wait_for_selector('.jh-trade-card')
    # Screenshot is optional; assertions above are the primary output.
    browser.close()
    print('BROWSER PASS: 12 cards, 24 reconciled totals, pick tiers, Shough case, team page, league board, 0 JS errors')
