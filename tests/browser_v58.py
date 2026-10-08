"""Visual/interactive regression test for reduced team record categories."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root = Path(__file__).resolve().parents[1]
data = {'data/' + p.name: json.loads(p.read_text()) for p in (root / 'data').glob('*.json')}
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<!DOCTYPE html><html><head></head><body><nav class="top-nav" id="topNav"></nav><div id="app"></div></body></html>')
    page.evaluate('ds=>window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}', data)
    page.add_style_tag(content=(root/'styles.css').read_text())
    page.add_script_tag(content=(root/'app.js').read_text())
    page.evaluate("location.hash='#/records'")
    page.wait_for_selector('#recordBody .record-index-card')
    def check_categories():
        labels = page.locator('#recordBody .record-index-label').all_text_contents()
        assert labels, 'Missing record cards'
        for category in ('Career Scoring Average', 'Season Scoring Average', 'Scoring Average'):
            assert category not in labels, (category, labels)
        return labels
    labels = check_categories()
    assert 'Career Points Scored' in labels
    print('PASS All-time team records: redundant averages removed, points still present')
    for view in ('REGULAR SEASON', 'PLAYOFFS', 'SINGLE SEASON'):
        page.locator('#recordView button').filter(has_text=view).click()
        labels=check_categories()
        if view == 'SINGLE SEASON':
            assert 'Points For' in labels
            assert 'Median Score' in labels
        print('PASS team records view:', view)
    page.evaluate("location.hash='#/singleseasons'")
    page.wait_for_selector('.record-index-card')
    labels = page.locator('.record-index-card .record-index-label').all_text_contents()
    assert 'Scoring Average' not in labels and 'Points For' in labels
    print('PASS dedicated single-season leaderboard')
    page.evaluate("location.hash='#/team/1'")
    page.wait_for_selector('#teamTabs button[data-tab="records"]')
    body=page.locator('#teamTabBody')
    assert 'Scoring Average' not in body.inner_text()
    assert 'AVG SCORE' in page.locator('.team-career-stats').inner_text()
    print('PASS team page: record removed, ordinary AVG SCORE stat retained')
    page.evaluate("location.hash='#/minigames'")
    page.wait_for_selector('.mini-arcade #jhGapChallenge [data-jh-slot]')
    page.locator('button[data-jh-game="surprise"]').click()
    assert 0 < int(page.locator('#jhGameSpent').inner_text().replace(',','')) <= 28000
    print('PASS 28K challenge unchanged')
    assert not errors,errors
    print('PASS no browser errors')
    browser.close()
