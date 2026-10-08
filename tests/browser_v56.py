from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
data={'data/'+p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(__import__('re').sub(r'<link[^>]+>', '', (root/'index.html').read_text()).replace('  <script src="app.js?v=56"></script>',''),wait_until='domcontentloaded')
 page.evaluate('ds=>window.fetch=async u=>ds[u]?{ok:true,json:async()=>ds[u]}:{ok:false,status:404}',data)
 page.add_style_tag(content=(root/'styles.css').read_text())
 page.add_script_tag(content=(root/'app.js').read_text())
 page.wait_for_selector('.jh-trade-card',timeout=30000)
 assert page.locator('.jh-trade-card').count()==12
 assert page.locator('.jh-gap-game').count()==0
 assert page.locator('.jh-gap-teaser').count()==1
 assert page.locator('.app-tile[href="#/minigames"]').count()==1
 assert page.locator('.app-dock a[href="#/minigames"]').count()==1
 assert page.locator('.ra-trade-value').count()>10
 assert '2027 early' not in ' '.join(page.locator('.ra-trade-value').all_text_contents())
 assert 'Pick value:' in ' '.join(page.locator('.ra-trade-value').all_text_contents())
 overview=[float(x.replace(',','')) for x in page.locator('.jh-overview-figures strong').all_text_contents()]
 assert overview==[16463,44231],overview
 page.locator('.jh-gap-teaser').click()
 page.wait_for_selector('#jhGapChallenge [data-jh-slot]',timeout=30000)
 assert page.locator('.mini-arcade-card').count()==2
 assert page.locator('.mini-arcade-card.future a').count()==0
 assert page.locator('[data-jh-slot]').count()==10
 assert int(page.locator('.jh-gap-pitch>strong').inner_text().replace(',',''))==27768
 assert page.locator('[data-jh-slot="9"] option').filter(has_text='· QB ·').count()>0
 assert page.locator('[data-jh-slot="9"] option').filter(has_text='· WR ·').count()==0
 assert page.locator('[data-jh-slot="7"] option').filter(has_text='· RB ·').count()>0
 assert page.locator('[data-jh-slot="7"] option').filter(has_text='· QB ·').count()==0
 assert '205 eligible' in page.locator('.jh-game-search-label').inner_text()
 page.locator('button[data-jh-game="surprise"]').click()
 ids=page.locator('[data-jh-slot]').evaluate_all('(xs)=>xs.map(x=>x.value)')
 spent=int(page.locator('#jhGameSpent').inner_text().replace(',',''))
 assert len(ids)==10 and len(set(ids))==10 and all(ids) and 0<spent<=28000,(ids,spent)
 page.locator('#jhGapChallenge').screenshot(path='/mnt/data/v56_game_desktop.png')
 page.locator('button[data-jh-game="reset"]').click()
 assert page.locator('#jhGameSpent').inner_text()=='0'
 print('PASS desktop: 12 trades, valuations unchanged, minigames navigation, 10 legal slots, 28K cap, reset')
 page.set_viewport_size({'width':390,'height':844})
 print('MOBILE starting surprise', flush=True)
 page.locator('button[data-jh-game="surprise"]').click(timeout=8000)
 print('MOBILE surprise clicked', flush=True)
 assert page.locator('.app-dock a').count()==7
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),page.evaluate('({scroll:document.documentElement.scrollWidth,w:innerWidth})')
 page.locator('#jhGapChallenge').screenshot(path='/mnt/data/v56_game_mobile.png',timeout=15000)
 print('MOBILE click home', flush=True)
 page.locator('.app-dock a[href="#/home"]').click(timeout=8000)
 page.wait_for_selector('.jh-trade-card')
 assert page.locator('.jh-gap-game').count()==0
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4')
 print('MOBILE click minigames', flush=True)
 page.locator('.app-dock a[href="#/minigames"]').click(timeout=8000)
 page.wait_for_selector('#jhGapChallenge [data-jh-slot]')
 print('PASS mobile: seven dock links, open game from dock, responsive widths')
 # open #/more page and tap Minigames
 page.evaluate("location.hash='#/more'")
 page.wait_for_selector('a.team-card[href="#/minigames"]')
 page.locator('a.team-card[href="#/minigames"]').click()
 page.wait_for_selector('#jhGapChallenge [data-jh-slot]')
 assert not errors,errors
 print('PASS More menu, no JS exceptions, future game slot')
 browser.close()
