from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
data={'data/'+p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><nav id="topNav" class="top-nav"></nav><div id="app" class="page-wrap"></div></body></html>')
    page.evaluate('ds=>window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}',data)
    page.add_style_tag(content=(root/'styles.css').read_text())
    page.add_script_tag(content=(root/'app.js').read_text())
    page.wait_for_selector('.jh-trade-card',timeout=30000)
    assert page.locator('.jh-trade-card').count()==12
    assert page.locator('.jh-trace').count()==0
    assert page.locator('.jh-trade-card details').count()==0
    assert page.get_by_text('FOLLOW THE ASSET').count()==0
    assert page.get_by_text('FOLLOW THE PICK').count()==0
    assert page.locator('.ra-trade-value small').count()==0
    assert page.locator('.jh-method').count()==0
    assert page.locator('.jh-overall-note').count()==0
    assert page.locator('.jh-gap-game').count()==1
    assert page.locator('.jh-overview-team').count()==2
    assert page.locator('.ra-trade-value').count()>10
    assert page.locator('.jh-asset-detail').count()>10
    assert page.locator('.jh-item .jh-production').count()>10
    assert page.locator('.ra-trade-context').count()==1
    credit=page.locator('.ra-trade-context').inner_text()
    assert 'RosterAudit.com' in credit
    assert len(credit)<95,credit
    # Inspect one complete trade; ensure no dangling whitespace after removed cards.
    page.locator('.jh-trade-card').first.screenshot(path='/mnt/data/v55_trade_card_preview.png')
    page.locator('.jh-overall').screenshot(path='/mnt/data/v55_overall_preview.png')
    vals=[float(s.replace(',','')) for s in page.locator('.jh-overview-figures strong').all_text_contents()]
    assert vals==[16463,44231],vals
    # All 12 cards can still filter by 2025, and back.
    page.locator('.jh-year[data-year="2025"]').click()
    assert 0<page.locator('.jh-trade-card').count()<12
    page.locator('.jh-year[data-year="all"]').click()
    assert page.locator('.jh-trade-card').count()==12
    page.locator('button[data-jh-game="surprise"]').click()
    ids=page.locator('[data-jh-slot]').evaluate_all('(xs)=>xs.map(x=>x.value)')
    assert len(ids)==10 and len(set(ids))==10 and all(ids)
    assert 0<int(page.locator('#jhGameSpent').inner_text().replace(',',''))<=28000
    assert page.locator('[data-jh-slot="9"] option').filter(has_text='· WR ·').count()==0
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4')
    page.locator('.jh-trade-card').first.screenshot(path='/mnt/data/v55_trade_card_mobile.png')
    assert not errors,errors
    print('PASS: 12 trade cards, RosterAudit credit, no trace dropdowns or long green market explanations')
    print('PASS: original totals [16463, 44231], year filter, 28K challenge, mobile width')
    browser.close()
