from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
data={'data/'+p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><nav id="topNav" class="top-nav"></nav><div id="app" class="page-wrap"></div></body></html>')
    page.evaluate('ds=>window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}',data)
    page.add_style_tag(content=(root/'styles.css').read_text())
    page.add_script_tag(content=(root/'app.js').read_text())
    page.wait_for_selector('.jh-trade-card',timeout=30000)
    assert page.locator('.jh-conversions').count()==0
    assert page.get_by_text('WHAT THEY TURNED IT INTO', exact=True).count()==0
    assert page.locator('.jh-gap-game').count()==1
    assert page.locator('.jh-overview-team').count()==2
    assert page.locator('.jh-trade-card').count()==12
    print('12 trade cards, market summaries and challenge shown; aftermath explorer absent')
    gap=int(page.locator('.jh-gap-pitch>strong').inner_text().replace(',',''))
    vals=[float(v.replace(',','')) for v in page.locator('.jh-overview-figures strong').all_text_contents()]
    assert gap==abs(vals[0]-vals[1]),(gap,vals)
    print('gap/market receipts',gap,vals)
    slots=page.locator('[data-jh-slot]')
    assert slots.count()==10
    positions=page.locator('.jh-game-row>span:first-child').all_text_contents()
    print('positions',positions)
    assert sum('RB' in x for x in positions)==2
    assert sum('WR' in x for x in positions)==3
    assert sum(x.startswith('FLEX') for x in positions)==2
    assert sum(x.startswith('SFLX (QB ONLY)') for x in positions)==1
    assert page.locator('[data-jh-slot="7"] option').count()>30
    # FLEX must not have any quarterbacks; Superflex should allow them
    assert page.locator('[data-jh-slot="7"] option').filter(has_text='· QB ·').count()==0
    assert page.locator('[data-jh-slot="9"] option').filter(has_text='· QB ·').count()>0
    assert page.locator('[data-jh-slot="9"] option').filter(has_text='· RB ·').count()==0
    assert page.locator('[data-jh-slot="9"] option').filter(has_text='· WR ·').count()==0
    assert page.locator('[data-jh-slot="9"] option').filter(has_text='· TE ·').count()==0
    assert page.locator('#jhGameSearch').get_attribute('placeholder')=='Filter player choices by name...'
    assert '200+ VALUE ONLY' in page.locator('.jh-gap-rules').inner_text()
    eligible=[(pid,x) for pid,x in data['data/rosteraudit_values.json']['players'].items() if x.get('position') in ('QB','RB','WR','TE') and float(x.get('value') or 0)>=200]
    assert len(eligible)==205,len(eligible)
    assert page.locator('#jhGameSearch').locator('xpath=preceding-sibling::label').inner_text().find('205 eligible at 200+')>=0
    assert any(200<=float(x['value'])<1000 for _,x in eligible)
    cheap=next(pid for pid,x in eligible if x['position']=='RB' and 200<=float(x['value'])<1000)
    assert page.locator('[data-jh-slot="1"] option[value="'+cheap+'"]').count()==1
    # Auto build and verify cap/unique players
    page.locator('button[data-jh-game="surprise"]').click()
    filled=page.locator('[data-jh-slot]').evaluate_all('(xs)=>xs.map(x=>x.value)')
    assert all(filled) and len(filled)==len(set(filled)),filled
    spent=int(page.locator('#jhGameSpent').inner_text().replace(',',''))
    assert 0<spent<=28000,spent
    print('generated full lineup cost',spent,'status:',page.locator('#jhGameStatus').inner_text())
    page.locator('#jhGapChallenge').screenshot(path='/mnt/data/v54_game_desktop.png')
    page.locator('button[data-jh-game="reset"]').click()
    assert page.locator('#jhGameSpent').inner_text()=='0'
    assert not any(page.locator('[data-jh-slot]').evaluate_all('(xs)=>xs.map(x=>x.value)'))
    # User can select a player and budget updates
    page.locator('[data-jh-slot="0"]').select_option('6770') if page.locator('[data-jh-slot="0"] option[value="6770"]').count() else page.locator('[data-jh-slot="0"]').select_option(index=1)
    assert int(page.locator('#jhGameSpent').inner_text().replace(',',''))>=200
    # Verify a value-over-cap selection is rejected rather than saved.
    page.locator('button[data-jh-game="reset"]').click()
    players=data['data/rosteraudit_values.json']['players']
    byname={v['name']:pid for pid,v in players.items()}
    page.locator('[data-jh-slot="0"]').select_option(byname['Josh Allen'])
    page.locator('[data-jh-slot="1"]').select_option(byname['Jahmyr Gibbs'])
    before=int(page.locator('#jhGameSpent').inner_text().replace(',',''))
    page.locator('[data-jh-slot="2"]').select_option(byname['Bijan Robinson'])
    assert int(page.locator('#jhGameSpent').inner_text().replace(',',''))==before
    assert page.locator('[data-jh-slot="2"]').input_value()==''
    assert 'Over budget' in page.locator('#jhGameStatus').inner_text()
    # Search filters options without losing already-selected players.
    page.locator('#jhGameSearch').fill('Gibbs')
    assert page.locator('[data-jh-slot="1"]').input_value()==byname['Jahmyr Gibbs']
    page.locator('#jhGameSearch').fill('')
    page.set_viewport_size({'width':390,'height':844})
    page.locator('button[data-jh-game="surprise"]').click()
    m=page.evaluate('''() => ({viewport:innerWidth,scroll:document.documentElement.scrollWidth,game:document.querySelector('.jh-gap-game').getBoundingClientRect().width})''')
    print('mobile geometry:',m)
    assert m['scroll']<=m['viewport']+4,m
    page.locator('#jhGapChallenge').screenshot(path='/mnt/data/v54_game_mobile.png')
    if errors:raise AssertionError(errors)
    print('PASS: aftermath removed, trade cards preserved, 28K budget, QB-only Superflex eligibility, complete unique lineup, reset, mobile sizing, no JS errors')
    browser.close()
