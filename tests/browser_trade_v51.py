"""Optional headless visual smoke test; run explicitly, not as unittest discovery."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fetch_data={'data/'+p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><nav id="topNav" class="top-nav"></nav><div id="app" class="page-wrap"></div></body></html>')
    page.evaluate('ds=>window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}',fetch_data)
    page.add_style_tag(content=(root/'styles.css').read_text())
    page.add_script_tag(content=(root/'app.js').read_text())
    page.wait_for_selector('.jh-overall-grid .jh-overview-team',timeout=30000)
    page.wait_for_selector('.jh-trade-card')
    assert page.locator('.jh-trade-card').count()==12
    assert page.locator('.jh-trace').count()==55
    assert page.locator('.jh-story').count()==2
    values=[float(x.replace(',','')) for x in page.locator('.jh-overview-team strong').all_text_contents()]
    card_totals=[]
    for id in range(2):
        totals=[float(card.locator('.jh-market-total strong').nth(id).inner_text().replace(',','')) for card in page.locator('.jh-trade-card').all()]
        card_totals.append(sum(totals))
        assert abs(values[id]-sum(totals))<0.005, (values[id],sum(totals))
    print('TOP CUMULATIVE VALUES',values,'independent sums',card_totals)
    print('STORIES:',page.locator('.jh-story').all_text_contents())
    assert 'Jahmyr Gibbs' in page.locator('.jh-story').first.inner_text()
    assert 'Colston Loveland' in page.locator('.jh-story').nth(1).inner_text()
    assert 'J.K. Dobbins' in page.locator('.jh-story').nth(1).inner_text()
    assert '2028 R1' in page.locator('.jh-story').first.inner_text()
    # Opening an asset journey shows the documented transaction package.
    loc=page.locator('#jh-trade-1222688274800201728 .jh-receives').nth(1).locator('.jh-trace').filter(has_text='LATER MOVE').first
    assert loc.count()==1
    loc.locator('summary').click()
    assert 'Jahmyr Gibbs' in loc.inner_text()
    # The story buttons must not change the SPA route/hash.
    before=page.evaluate('location.hash')
    page.locator('.jh-story').nth(1).locator('[data-jh-target]').first.click()
    after=page.evaluate('location.hash')
    assert before==after,(before,after)
    assert page.locator('.jh-trade-card').count()==12
    page.locator('#jhYears button[data-year="2025"]').click()
    assert page.locator('.jh-trade-card').count()==5
    page.locator('.jh-story').first.locator('[data-jh-target]').first.click()
    assert page.locator('.jh-trade-card').count()==12
    page.locator('.jh-deepdives').screenshot(path='/mnt/data/v51_deep_dive_desktop.png')
    page.locator('.jh-overall').screenshot(path='/mnt/data/v51_totals_desktop.png')
    page.set_viewport_size({'width':390,'height':844})
    metrics=page.evaluate('''() => {let e=document.querySelector('.jh-archive');return {screen:innerWidth,bodyScroll:document.documentElement.scrollWidth,divWidth:e.getBoundingClientRect().width}}''')
    print('MOBILE',metrics)
    assert metrics['bodyScroll']<=metrics['screen']+3,metrics
    page.locator('.jh-overall').screenshot(path='/mnt/data/v51_totals_mobile.png')
    page.locator('.jh-story').nth(1).screenshot(path='/mnt/data/v51_loveland_mobile.png')
    if errors:raise AssertionError(errors)
    print('PASS: 12 trades, 55 asset journeys, 2 verified stories, cumulative totals, filters, anchored source jumps, mobile no overflow, no page errors')
    browser.close()
