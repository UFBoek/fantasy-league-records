/* Browser regression suite. Run with Playwright available and CHROMIUM_EXECUTABLE
   set when using a system Chromium. No browser dependency ships with the site. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const results=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);const file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}const type={'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(data)});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 await context.route('https://**/*',r=>r.abort()); // Repeatable archive/offline API tests.
 const page=await context.newPage();page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/#/home');
 async function settled(){await page.waitForFunction(()=>window.figUI&&document.querySelector('#app').getAttribute('aria-busy')!=='true');await page.waitForTimeout(100)}
 await settled();
 async function go(route){await page.evaluate(h=>location.hash='#/'+h,route);await page.waitForTimeout(50);await settled()}
 async function check(name,fn){try{await fn();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.message.slice(0,800)});}console.log(JSON.stringify(results.at(-1)));}
 await check('Shell fits 320, 390, 768 and 1440; nav remains reachable',async()=>{
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await go('team/1');const s=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,header:document.querySelector('.site-header').getBoundingClientRect().height,dock:getComputedStyle(document.querySelector('.app-dock')).display,rail:getComputedStyle(document.querySelector('.fig-sidebar')).display}));assert.ok(s.doc<=width+1,JSON.stringify(s));assert.ok(s.header<90,JSON.stringify(s));assert.equal(width<1024?s.dock:s.rail,width<1024?'grid':'flex');}
  await page.setViewportSize({width:390,height:844});
 });
 await check('Standings seasons, views, sorting and frozen rows',async()=>{
  await go('home');await page.locator('.home-standings button[data-value="2025"]').click();await page.locator('.home-standings button[data-value="allplay"]').click();assert.equal(await page.locator('.home-standings button[data-value="allplay"]').getAttribute('aria-pressed'),'true');
  const name=()=>page.locator('.home-standings .fig-frozen-identity tbody tr').first().innerText();const before=await name();await page.locator('.home-standings .sort-head').filter({hasText:'TEAM'}).click();const after=await name();assert.notEqual(before,after);
  const delta=await page.evaluate(()=>{let left=[...document.querySelectorAll('.home-standings .fig-frozen-identity tbody tr')],right=[...document.querySelectorAll('.home-standings .fig-frozen-stats tbody tr')];return Math.max(...left.map((el,i)=>Math.abs(el.getBoundingClientRect().height-right[i].getBoundingClientRect().height)))});assert.ok(delta<2,'Frozen rows must stay aligned: '+delta);
 });
 await check('Back restores standings controls and scroll; forward reopens drilldown',async()=>{
  await go('home');await page.locator('.home-standings button[data-value="2025"]').click();await page.locator('.home-standings button[data-value="allplay"]').click();await page.evaluate(()=>scrollTo(0,500));await sleep(50);
  const previous=await page.evaluate(()=>scrollY);const href=await page.locator('.home-standings a[href^="#/team/"]').first().getAttribute('href');await page.locator('.home-standings a[href^="#/team/"]').first().evaluate(a=>a.click());await settled();assert.equal(await page.evaluate(()=>location.hash),href);await page.locator('#figBack').click();await settled();assert.equal(await page.evaluate(()=>location.hash),'#/home');assert.equal(await page.locator('.home-standings button[data-value="2025"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.home-standings button[data-value="allplay"]').getAttribute('aria-pressed'),'true');const restoredY=await page.evaluate(()=>scrollY);assert.ok(Math.abs(restoredY-previous)<3,JSON.stringify({previous,restoredY}));await page.goForward();await settled();assert.equal(await page.evaluate(()=>location.hash),href);
 });
 await check('All seven franchise tabs render with player and season drilldowns',async()=>{
  await go('team/1');for(const tab of ['records','teamrecords','roster','players','seasons','drafts','waivers']){await page.locator('#teamTabs [data-tab="'+tab+'"]').click();await sleep(150);assert.equal(await page.locator('#teamTabs [data-tab="'+tab+'"]').getAttribute('aria-pressed'),'true');assert.ok((await page.locator('#teamTabBody').innerText()).length>100,tab);if(tab==='roster')assert.ok(await page.locator('#teamTabBody a[href^="#/player/"]').count()>10);if(tab==='seasons')assert.ok(await page.locator('#teamTabBody a[href^="#/teamseason/"]').count()>1);}
 });
 await check('Player search, positions and record scope still filter results',async()=>{
  await go('players');await page.locator('#playerRecordSearch').fill('Lamar');await sleep(150);assert.match(await page.locator('.fig-frozen-identity tbody').innerText(),/Lamar Jackson/);assert.doesNotMatch(await page.locator('.fig-frozen-identity tbody').innerText(),/Josh Allen/);await page.locator('#playerRecordSearch').fill('');await page.locator('button[data-value="RB"]').click();await page.locator('button[data-value="Playoffs"]').click();await sleep(100);assert.equal(await page.locator('button[data-value="RB"]').getAttribute('aria-pressed'),'true');assert.ok(await page.locator('.fig-frozen-identity tbody tr').count()>0);
 });
 await check('Record exclusions and active streak filters retain drilldowns',async()=>{
  await go('records');const toggle=page.locator('[data-record-exclude="1"]');await toggle.click();assert.match(await toggle.getAttribute('class'),/is-excluded/);await toggle.click();await go('streaks');await page.locator('#figActiveStreakType').selectOption({label:'Winning'});assert.ok(await page.locator('.fig-active-streak-row').count()>0);assert.ok(await page.locator('.fig-active-streak-row').first().getAttribute('href'));await page.locator('#figActiveStreakSort').selectOption({label:'Shortest first'});
 });
 await check('Draft search, grades, reset, pagination and team sort work',async()=>{
  await go('draft');const all=await page.locator('.fig-draft-explorer-pick').count();await page.locator('#figDraftExplorerMore').click();assert.ok(await page.locator('.fig-draft-explorer-pick').count()>all);await page.locator('#figDraftExplorerSearch').fill('Love');await sleep(100);assert.ok(await page.locator('.fig-draft-explorer-pick').count()<all);await page.locator('#figDraftExplorerReset').click();assert.equal(await page.locator('#figDraftExplorerSearch').inputValue(),'');await page.locator('#figDraftExplorerGrade').selectOption('A');await sleep(100);assert.ok((await page.locator('.fig-draft-explorer-pick').count())>0);await go('draft/team/1');await page.locator('.fig-draft-team-sort-btn[data-sort="value"]').click();assert.match(await page.locator('.fig-draft-team-sort-btn[data-sort="value"]').getAttribute('class'),/active/);
 });
 await check('Trade manager, season, sort, reset, pagination and disclosures work',async()=>{
  await go('trades');const count=await page.locator('.fig-tr-card').count();await page.locator('#figTrMore').click();assert.ok(await page.locator('.fig-tr-card').count()>count);await page.locator('#figTrManager').selectOption('1');await page.locator('#figTrYear').selectOption('2025');await page.locator('#figTrSort').selectOption({label:'OLDEST'});await page.locator('.fig-tr-card summary').first().click();assert.ok(await page.locator('.fig-tr-card[open]').count()>0);await page.locator('#figTrClear').click();assert.equal(await page.locator('#figTrManager').inputValue(),'all');
 });
 await check('Minigame changes budget, enforces unique players, and clears',async()=>{
  await go('minigames');await page.locator('[data-jh-slot="0"]').selectOption({index:1});const spent=await page.locator('#jhGameSpent').innerText();assert.notEqual(spent,'0');const chosen=await page.locator('[data-jh-slot="0"]').inputValue();await sleep(100);assert.equal(await page.locator('[data-jh-slot="9"] option[value="'+chosen+'"]').evaluate(el=>el.disabled),true);await page.locator('[data-jh-game="reset"]').click();assert.equal(await page.locator('#jhGameSpent').innerText(),'0');await page.locator('[data-jh-game="surprise"]').click();assert.equal(await page.locator('[data-jh-slot]').evaluateAll(es=>es.filter(e=>e.value).length),10);
 });
 await check('Calculator validates manual schedule and switches later weeks',async()=>{
  await go('playoff-calculator');await page.locator('[data-save-schedule]').click();assert.ok((await page.locator('.pcl-editor-error').innerText()).length>10);for(let i=0;i<10;i++)await page.locator('[data-editor-row="'+Math.floor(i/2)+'"][data-editor-side="'+i%2+'"]').selectOption(String(i+1));await page.locator('[data-save-schedule]').click();await sleep(200);assert.ok(await page.locator('.pcl-match').count()>0);await page.locator('#pclWeeks [data-week="14"]').click();assert.match(await page.locator('#pclWeeks [data-week="14"]').getAttribute('class'),/pcl-week-active/);
 });
 await check('Reduced motion disables decorative motion and focus stays accessible',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await go('records');const values=await page.evaluate(()=>({animations:document.getAnimations().filter(a=>a.playState==='running').length,focus:document.activeElement.tagName}));assert.equal(values.animations,0);assert.equal(values.focus,'H1');await page.keyboard.press('Tab');await page.locator('#figBack').focus();assert.notEqual(await page.locator('#figBack').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
 });
 await check('No browser JavaScript errors',async()=>assert.deepEqual(errors,[]));
 await context.close();await browser.close();await new Promise(r=>server.close(r));
 if(process.env.UI_REPORT)fs.writeFileSync(process.env.UI_REPORT,JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
