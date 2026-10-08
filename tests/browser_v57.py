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
    page.wait_for_selector('#jhGapChallenge [data-jh-slot]',timeout=30000)
    assert page.locator('.jh-trade-card').count()==12
    assert page.locator('.jh-overview-team').count()==2
    assert page.locator('.jh-gap-game').count()==1
    assert page.locator('[data-jh-slot]').count()==10
    assert page.locator('.jh-gap-game').evaluate('(x)=>x.closest(".jh-archive")!==null')
    gap=int(page.locator('.jh-gap-pitch>strong').inner_text().replace(',',''))
    vals=[int(v.replace(',','')) for v in page.locator('.jh-overview-figures strong').all_text_contents()]
    assert gap==abs(vals[1]-vals[0])
    assert page.locator('[data-jh-slot="9"] option').filter(has_text='· WR ·').count()==0
    page.locator('button[data-jh-game="surprise"]').click()
    ids=page.locator('[data-jh-slot]').evaluate_all('(xs)=>xs.map(x=>x.value)')
    spent=int(page.locator('#jhGameSpent').inner_text().replace(',',''))
    assert len(ids)==10 and all(ids) and len(set(ids))==10 and 0<spent<=28000
    page.locator('.jh-gap-game').screenshot(path='/mnt/data/v57_game_trade_desktop.png')
    print('PASS homepage: trade cards, cumulative value gap, working lineup game')
    page.evaluate("location.hash='#/minigames'")
    page.wait_for_selector('.mini-arcade #jhGapChallenge [data-jh-slot]')
    assert page.locator('[data-jh-slot]').count()==10
    page.locator('button[data-jh-game="surprise"]').click()
    assert 0<int(page.locator('#jhGameSpent').inner_text().replace(',',''))<=28000
    page.locator('button[data-jh-game="reset"]').click()
    assert page.locator('#jhGameSpent').inner_text()=='0'
    print('PASS minigames: same playable challenge, reset')
    page.evaluate("location.hash='#/players'")
    page.wait_for_selector('.compact-player-book .sortable tbody td')
    assert '25 BOMBS' not in page.locator('.compact-player-book').inner_text()
    assert page.locator('.compact-player-book thead th').count()==11
    name_weight=page.locator('.compact-player-book tbody td:nth-child(2) a').first.evaluate('(e)=>getComputedStyle(e).fontWeight')
    number_weight=page.locator('.compact-player-book tbody td:nth-child(4)').first.evaluate('(e)=>getComputedStyle(e).fontWeight')
    assert int(name_weight)<=600, name_weight
    assert int(number_weight)<=550, number_weight
    assert int(float(page.locator('.compact-player-book tbody td').first.evaluate('(e)=>getComputedStyle(e).fontSize.replace("px","")')))>=16
    page.screenshot(path='/mnt/data/v57_player_records.png',full_page=False)
    print('PASS player records: 25 BOMBS removed, text sizes kept, weight softened',name_weight,number_weight)
    page.evaluate("location.hash='#/team/1'")
    page.wait_for_selector('#teamTabs button[data-tab="players"]')
    page.locator('#teamTabs button[data-tab="players"]').click()
    page.wait_for_selector('.team-player-book .sortable tbody td')
    assert '25 BOMBS' not in page.locator('.team-player-book').inner_text()
    assert page.locator('.team-player-book thead th').count()==11
    teamweight=page.locator('.team-player-book tbody td:nth-child(2) a').first.evaluate('(e)=>getComputedStyle(e).fontWeight')
    assert int(teamweight)<=600, teamweight
    print('PASS team player books: 25 BOMBS removed, lighter typography')
    page.evaluate("location.hash='#/streaks'")
    page.wait_for_selector('.compact-streak-records .streak-record-card')
    assert page.locator('.compact-streak-records .streak-record-card').count()>=5
    style=page.locator('.compact-streak-records .streak-record-card').first.evaluate('(e)=>({bg:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderTopWidth,radius:getComputedStyle(e).borderRadius})')
    assert style['bg']!='rgb(255, 255, 255)' and style['border']=='6px',style
    page.screenshot(path='/mnt/data/v57_streaks_desktop.png',full_page=False)
    print('PASS streak records: solid bordered/colored cards',style)
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('.compact-streak-records .streak-record-card').first.is_visible()
    page.evaluate("location.hash='#/home'")
    page.wait_for_selector('.jh-gap-game [data-jh-slot]')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),page.evaluate('({scroll:document.documentElement.scrollWidth,w:innerWidth})')
    page.locator('.jh-gap-game').screenshot(path='/mnt/data/v57_game_trade_mobile.png')
    page.evaluate("location.hash='#/minigames'")
    page.wait_for_selector('.mini-arcade .jh-gap-game [data-jh-slot]')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4')
    assert not errors,errors
    print('PASS mobile: no viewport overflow on either game, zero browser errors')
    browser.close()
