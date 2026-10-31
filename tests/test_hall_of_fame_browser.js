'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const origin='http://127.0.0.1:8765';
 const bad=[];
 try{
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>bad.push({label,error:String(e)}));
   await page.goto(origin+'/#/hall-of-fame',{waitUntil:'domcontentloaded'});
   await page.locator('.fig-hof-hero h1').waitFor({timeout:30000});
   assert.match(await page.locator('.fig-hof-hero h1').innerText(),/Immortalize/);
   assert.deepEqual(await page.locator('.fig-hof-member-grid .fig-hof-member h3').allInnerTexts(),['Hayden','Boek','Sack']);
   assert.deepEqual(await page.locator('.fig-hof-stat-bar .fig-hof-number strong').allInnerTexts(),['3','3','12','3']);
   const dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
   assert.ok(dims.sw<=dims.cw+3,'Unexpected horizontal overflow '+label+': '+JSON.stringify(dims));
   await page.screenshot({path:'hof-'+label+'.png',fullPage:true});
   await page.locator('.fig-hof-nav a[href="#/hall-of-fame/franchises"]').click();
   await page.locator('.fig-hof-ballot a').first().waitFor();
   assert.equal(await page.locator('.fig-hof-ballot a').count(),10);
   await page.locator('.fig-hof-ballot a[href="#/hall-of-fame/franchise/6"]').click();
   await page.locator('.fig-hof-profile-hero h1').waitFor();
   assert.equal(await page.locator('.fig-hof-profile-hero h1').innerText(),'Hayden');
   await page.locator('.fig-hof-nav a[href="#/hall-of-fame/players"]').click();
   await page.locator('.fig-hof-player').first().waitFor();
   assert.equal(await page.locator('.fig-hof-player').count(),12);
   await page.locator('.fig-hof-filter a[href="#/hall-of-fame/players/QB"]').click();
   await page.locator('.fig-hof-player').first().waitFor();
   assert.equal(await page.locator('.fig-hof-player').count(),3);
   await page.locator('.fig-hof-player').first().click();
   await page.locator('.fig-hof-profile-hero h1').waitFor();
   await page.locator('.fig-hof-nav a[href="#/hall-of-fame/moments"]').click();
   await page.locator('.fig-hof-game').first().waitFor();
   assert.ok(await page.locator('.fig-hof-game').count()>=6);
   await page.locator('.fig-hof-nav a[href="#/hall-of-fame/seasons"]').click();
   await page.locator('.fig-hof-season').first().waitFor();
   assert.equal(await page.locator('.fig-hof-season').count(),8);
   await page.goto(origin+'/#/more');
   await page.locator('a[href="#/hall-of-fame"]').first().waitFor();
   console.log('Passed',label,'full route test');
   await page.close();
  }
  assert.deepEqual(bad,[],'No JavaScript exceptions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
