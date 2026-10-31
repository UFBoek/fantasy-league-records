'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const origin='http://127.0.0.1:8765',bad=[];
 async function go(page,route,selector){
  await page.goto(origin+'/#/hall-of-fame'+route,{waitUntil:'domcontentloaded'});
  await page.locator(selector).first().waitFor({timeout:30000});
 }
 try{
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>bad.push({label,error:String(e)}));
   await go(page,'','.fig-hof-v2-hero h1');
   assert.match(await page.locator('.fig-hof-v2-hero h1').innerText(),/Greatness/);
   assert.equal(await page.locator('.fig-hof-v2-founders .fig-hof-v2-inductee').count(),5);
   assert.deepEqual(await page.locator('.fig-hof-stat-bar .fig-hof-number strong').allInnerTexts(),['5','4','1','3']);
   const dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
   assert.ok(dims.sw<=dims.cw+3,'Horizontal page overflow '+label+': '+JSON.stringify(dims));
   await page.screenshot({path:'hof-'+label+'.png',fullPage:true});
   await go(page,'/hall','.fig-hof-v2-inductee');
   assert.equal(await page.locator('.fig-hof-v2-inductee').count(),5);
   assert.deepEqual((await page.locator('.fig-hof-v2-inductee-info h3').allInnerTexts()).slice(0,4),
     ['Josh Allen','Christian McCaffrey',"Ja'Marr Chase",'Trey McBride']);
   await go(page,'/inductee/player/4984','.fig-hof-v2-plaque h1');
   assert.equal(await page.locator('.fig-hof-v2-plaque h1').innerText(),'Josh Allen');
   assert.ok(await page.locator('.fig-hof-v2-receipts a').count()>=5);
   await go(page,'/inductee/season/6/2025','.fig-hof-v2-plaque h1');
   assert.equal(await page.locator('.fig-hof-v2-plaque h1').innerText(),'Hayden · 2025');
   await go(page,'/legacy','.fig-hof-v2-legacy-list a');
   assert.equal(await page.locator('.fig-hof-v2-legacy-list a').count(),10);
   await go(page,'/legacy/1','.fig-hof-v2-legacy-profile h1');
   assert.equal(await page.locator('.fig-hof-v2-legacy-profile h1').innerText(),'Boek');
   assert.ok(await page.locator('.fig-hof-v2-legacy-awards a').count()>0);
   assert.ok((await page.locator('.fig-hof-v2-legacy-awards').innerText()).includes('25+ consecutive 175-point games'),
     'A still-active streak must earn an official 25-game milestone');
   await go(page,'/records','.fig-hof-v2-record');
   assert.equal(await page.locator('.fig-hof-v2-record').count(),4);
   const record=page.locator('.fig-hof-v2-record').first();
   assert.ok((await record.locator('.fig-hof-v2-record-header').innerText()).includes('175+ STREAK RECORD'));
   assert.match(await record.locator('.fig-hof-v2-record-status').innerText(),/(ACTIVE THROUGH|FINAL)/);
   assert.match(await record.locator('.fig-hof-v2-record-metric').innerText(),/STRAIGHT/);
   await go(page,'/charter','.fig-hof-v2-rule');
   assert.equal(await page.locator('.fig-hof-v2-rule').count(),10);
   await go(page,'/franchises','.fig-hof-v2-legacy-list a');
   await go(page,'/players','.fig-hof-v2-inductee');
   await go(page,'/moments','.fig-hof-v2-record');
   await page.goto(origin+'/#/more');
   await page.locator('a[href="#/hall-of-fame"]').first().waitFor();
   console.log('Hall v241: all exhibits, profiles, charter, legacy, old links and no overflow:',label);
   await page.close();
  }
  assert.deepEqual(bad,[],'Unhandled errors on Hall of Fame routes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
