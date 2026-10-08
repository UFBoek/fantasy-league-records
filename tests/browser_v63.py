"""v63 dynamic market gap game: test original and simulated repriced snapshots."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, copy, re
root=Path(__file__).resolve().parents[1]
raw={'data/'+p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
APP=(root/'app.js').read_text(); CSS=(root/'styles.css').read_text()
assert 'const GAME_BUDGET=28000;' not in APP
assert 'THE 28K LINEUP CHALLENGE' not in APP
assert '#/minigames/trade-gap' in APP

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    def open_page(dataset,route='home',width=1440):
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[];page.on('pageerror', lambda e:errors.append(str(e)))
        page.set_content('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><nav id="topNav"></nav><div id="app"></div></body></html>')
        page.evaluate('ds=>window.fetch=async (u,opts)=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}',dataset)
        page.add_style_tag(content=CSS)
        page.evaluate('(name)=>location.hash="#/"+name',route)
        page.add_script_tag(content=APP)
        page.wait_for_selector('#jhGapChallenge [data-jh-slot]',timeout=30000)
        return page,errors
    def n(text):return float(text.replace(',',''))
    page,errors=open_page(raw)
    totals=[n(x) for x in page.locator('.jh-overview-figures > strong').all_text_contents()]
    gap=n(page.locator('.jh-gap-pitch>strong').inner_text())
    left=n(page.locator('#jhGameLeft').inner_text())
    assert totals==[16463,44231],totals
    assert gap==left==abs(totals[1]-totals[0])==27768,(gap,left,totals)
    assert 'TRADE GAP LINEUP CHALLENGE' in page.locator('#jhGapChallenge').inner_text()
    assert '28K LINEUP' not in page.locator('#jhGapChallenge').inner_text()
    page.locator('[data-jh-game="surprise"]').click()
    ids=page.locator('[data-jh-slot]').evaluate_all('(xs)=>xs.map(x=>x.value)')
    spent=n(page.locator('#jhGameSpent').inner_text())
    assert len(ids)==10 and len(set(ids))==10 and all(ids) and 0<spent<=gap
    assert n(page.locator('#jhGameLeft').inner_text())==gap-spent
    page.screenshot(path='/mnt/data/v63_trade_gap_home_desktop.png',full_page=False)
    page.evaluate("location.hash='#/minigames/trade-gap'")
    page.wait_for_selector('#jhGapChallenge [data-jh-slot]')
    assert n(page.locator('#jhGameLeft').inner_text())==gap
    assert page.locator('.mini-arcade-card.active .mini-arcade-icon').inner_text()=='GAP'
    assert page.locator('.mini-arcade-card.active').get_attribute('href')=='#/minigames/trade-gap'
    page.locator('[data-jh-game="surprise"]').click()
    assert 0<n(page.locator('#jhGameSpent').inner_text())<=gap
    assert not errors,errors
    print('PASS original price: exact gap 27,768 = starting game budget on homepage and minigames')
    page.close()
    
    # Replace one *sourced* market tier; both sides, their difference, and the game must recalculate.
    changed=copy.deepcopy(raw)
    ra=changed['data/rosteraudit_values.json']
    ra['future_picks']['2027:1:early']+=20000
    ra['updated_at']='2026-10-09T10:00:00Z'
    page,errors=open_page(changed)
    newtotals=[n(x) for x in page.locator('.jh-overview-figures > strong').all_text_contents()]
    newgap=n(page.locator('.jh-gap-pitch>strong').inner_text())
    assert newtotals!=totals,(newtotals,totals)
    assert newgap==abs(newtotals[1]-newtotals[0]),(newgap,newtotals)
    assert newgap!=27768,(newgap,totals,newtotals)
    assert n(page.locator('#jhGameLeft').inner_text())==newgap
    assert page.locator('.jh-gap-game').count()==1
    assert page.locator('.jh-trade-card').count()==12
    page.locator('button[data-jh-game="surprise"]').click()
    assert 0<n(page.locator('#jhGameSpent').inner_text())<=newgap
    page.screenshot(path='/mnt/data/v63_trade_gap_repriced_desktop.png',full_page=False)
    page.evaluate("location.hash='#/minigames/trade-gap'")
    page.wait_for_selector('#jhGapChallenge [data-jh-slot]')
    assert n(page.locator('.jh-gap-pitch>strong').inner_text())==newgap
    assert n(page.locator('#jhGameLeft').inner_text())==newgap
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+4'),page.evaluate('({sw:document.documentElement.scrollWidth,w:innerWidth})')
    page.locator('button[data-jh-game="surprise"]').click()
    assert 0<n(page.locator('#jhGameSpent').inner_text())<=newgap
    page.screenshot(path='/mnt/data/v63_trade_gap_minigames_mobile.png',full_page=False)
    assert not errors,errors
    print('PASS simulated repricing: totals, exact gap, both budgets, minigames link, surprise lineup, mobile')
    page.close()

    # Another market shift can make the gap too small; Surprise Me cannot generate an invalid full team.
    # Verify using the function's direct budget argument to isolate the edge-case behavior.
    test=browser.new_page()
    test.set_content('<!DOCTYPE html><html><body><div id="app"></div></body></html>')
    test.evaluate('ds=>window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}',raw)
    test.add_script_tag(content=APP)
    test.wait_for_selector('#jhGapChallenge [data-jh-slot]')
    test.evaluate("document.querySelector('#app').innerHTML=renderTradeGapGame(500)")
    test.wait_for_selector('#jhGapChallenge [data-jh-slot]')
    test.locator('button[data-jh-game="surprise"]').click()
    assert n(test.locator('#jhGameSpent').inner_text())<=500
    assert 'No complete ten-player lineup fits' in test.locator('#jhGameStatus').inner_text()
    print('PASS tiny-gap scenario: Surprise Me refuses unaffordable full ten-player roster')
    test.close()
    browser.close()
