"""v60: accumulated trade production, league rule note, and existing 28k challenge."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
data={'data/'+p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    page.set_default_timeout(10000)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><nav id="topNav" class="top-nav"></nav><div id="app" class="page-wrap"></div></body></html>')
    page.evaluate('ds=>window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}',data)
    page.add_style_tag(content=(root/'styles.css').read_text())
    page.add_script_tag(content=(root/'app.js').read_text())
    page.wait_for_selector('.jh-trade-card')
    assert page.locator('.jh-trade-card').count()==12
    overview=page.locator('.jh-overview-production')
    assert overview.count()==2
    points=[float(x.replace(',','')) for x in overview.locator('strong').all_text_contents()]
    starts=[int(x.split(' starts')[0]) for x in overview.locator('small').all_text_contents()]
    assert points==[970.71,2565.65],points
    assert starts==[64,138],starts
    columns=page.locator('.jh-trade-card .jh-column-total b').all_text_contents()
    jsum=sum(float(x.replace(',','')) for x in columns[::2]);hsum=sum(float(x.replace(',','')) for x in columns[1::2])
    assert abs(jsum-points[0])<0.015, (jsum,points[0])
    assert abs(hsum-points[1])<0.015, (hsum,points[1])
    print('PASS cumulative James/Hayden starter points reconcile to all 12 per-trade card totals:',points,'starts:',starts)
    rule=page.locator('.jh-rule-note')
    assert rule.count()==1
    assert page.locator('.jh-trade-card').first.locator('.jh-rule-note').count()==1
    assert 'commissioner' in rule.inner_text().lower()
    assert 'league vote' in rule.inner_text().lower()
    assert '28K Lineup Challenge' in rule.inner_text()
    assert rule.locator('a').get_attribute('href')=='#/minigames/28k'
    print('PASS James Rule appears once, inside newest trade #12, linking to the minigame')
    assert page.locator('.jh-gap-game [data-jh-slot]').count()==10
    page.locator('.jh-gap-game button[data-jh-game="surprise"]').click()
    assert 0<int(page.locator('#jhGameSpent').inner_text().replace(',',''))<=28000
    print('PASS 28K game still works within the trade archive')
    page.locator('.jh-overall').screenshot(path='/mnt/data/v60_overview_desktop.png')
    page.locator('.jh-trade-card').first.screenshot(path='/mnt/data/v60_rule_trade12_desktop.png')
    page.locator('#jhYears button[data-year="2024"]').click()
    assert page.locator('.jh-trade-card').count()==3
    page.locator('#jhYears button[data-year="all"]').click()
    assert page.locator('.jh-trade-card').count()==12
    print('PASS year filters still work')
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),page.evaluate('({scroll:document.documentElement.scrollWidth,w:innerWidth})')
    page.locator('.jh-overall').screenshot(path='/mnt/data/v60_overview_mobile.png')
    page.locator('.jh-trade-card').first.locator('.jh-rule-note').screenshot(path='/mnt/data/v60_rule_mobile.png')
    print('PASS mobile: no page overflow, production cards and James Rule visible')
    page.evaluate("location.hash='#/minigames'")
    page.wait_for_selector('.mini-arcade .jh-gap-game [data-jh-slot]')
    page.locator('button[data-jh-game="surprise"]').click()
    assert 0<int(page.locator('#jhGameSpent').inner_text().replace(',',''))<=28000
    print('PASS Minigames page game still works')
    assert not errors,errors
    print('PASS no browser Javascript errors')
    browser.close()
