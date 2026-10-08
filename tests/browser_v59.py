"""Visual/navigation smoke for v59 team record tabs, detail links, and 28k game."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root=Path(__file__).resolve().parents[1]
data={'data/'+p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.set_default_timeout(8000)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content('<!doctype html><html><head></head><body><nav class="top-nav" id="topNav"></nav><div id="app"></div></body></html>')
    page.evaluate('ds=>window.fetch=async url=>ds[url]?{ok:true,json:async()=>ds[url]}:{ok:false,status:404}', data)
    page.add_style_tag(content=(root/'styles.css').read_text())
    page.add_script_tag(content=(root/'app.js').read_text())
    page.evaluate("location.hash='#/records'")
    page.wait_for_selector('#recordBody .record-index-card')
    def cats():return page.locator('#recordBody .record-index-label').all_text_contents()
    assert 'Total All-Play Wins' in cats()
    page.locator('#recordView button').filter(has_text='REGULAR SEASON').click()
    assert 'Total All-Play Wins' in cats()
    page.locator('#recordView button').filter(has_text='PLAYOFFS').click()
    assert 'Total All-Play Wins' not in cats()
    page.locator('#recordView button').filter(has_text='SINGLE SEASON').click()
    assert 'All-Play Wins' not in cats()
    assert 'All-Play Win Percentage' in cats()
    print('PASS four record views match requested all-play categories')
    page.locator('#recordView button').filter(has_text='ALL-TIME').click()
    page.locator('#recordBody .record-index-card').filter(has_text='Total All-Play Wins').click()
    page.wait_for_selector('table')
    assert 'HAYDEN' in page.locator('table').inner_text().upper()
    assert '338' in page.locator('table').inner_text()
    print('PASS total all-play career leaderboard clickable')
    page.locator('table tbody tr[data-href*="breakdown/teamrecord"]').first.click()
    page.wait_for_selector('table')
    assert 'WEEK-BY-WEEK ALL-PLAY' in page.locator('#app').inner_text().upper()
    assert '338' in page.locator('#app').inner_text()
    print('PASS week-by-week all-play breakdown renders')
    page.evaluate("location.hash='#/team/1'")
    page.wait_for_selector('#teamTabs button[data-tab="records"]')
    assert 'Total All-Play Wins' in page.locator('#teamTabBody').inner_text()
    print('PASS team profile records carry new category')
    page.evaluate("location.hash='#/minigames'")
    page.wait_for_selector('.mini-arcade #jhGapChallenge [data-jh-slot]')
    page.locator('button[data-jh-game="surprise"]').click()
    assert 0<int(page.locator('#jhGameSpent').inner_text().replace(',',''))<=28000
    print('PASS 28K challenge still works')
    assert not errors,errors
    print('PASS no browser errors')
    browser.close()
