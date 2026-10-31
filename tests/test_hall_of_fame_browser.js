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
   page.on('pageerror',e=>bad.push({viewport:label,error:String(e)}));
   await go(page,'','.fig-hof-242-hero h1');
   assert.match(await page.locator('.fig-hof-242-hero h1').innerText(),/Immortals/);
   assert.equal(await page.locator('.fig-hof-242-grid .fig-hof-242-card').count(),4);
   assert.deepEqual(await page.locator('.fig-hof-242-grid h3').allInnerTexts(),['Josh Allen','Jahmyr Gibbs','Puka Nacua','Trey McBride']);
   assert.equal(await page.locator('.fig-hof-242-hero .fig-hof-hero-text p').count(),0,
    'No hero description below The Immortals');
   assert.equal(await page.locator('.fig-hof-242-hero .fig-hof-hero-actions').count(),0,
    'Remove founding-class action and other hero buttons');
   assert.equal(await page.locator('.fig-hof-stat-bar').count(),0,
    'No headline class and season counters');
   assert.equal(await page.locator('.fig-hof-242-charter').count(),0,
    'Induction philosophy must not appear on the Hall landing page');
   assert.equal(await page.locator('.fig-hof-243-season-card').count(),1,
    'Enshrined season replaces old slogan block');
   assert.match(await page.locator('.fig-hof-243-season-card h3').innerText(),/Hayden · 2025/);
   assert.match(await page.locator('.fig-hof-243-season-card-copy p').innerText(),/FIG championship/);
   assert.ok(await page.locator('.fig-hof-243-season-card .fig-hof-247-notable-tags span').count()>=16);
   assert.equal(await page.locator('.fig-hof-242-inscription').count(),0);
   assert.ok(!(await page.locator('.fig-hof-nav').innerText()).includes('Legacy Points'));
   assert.ok(!(await page.locator('.fig-hof-nav').innerText()).includes('Historic Feats'));
   const dims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
   assert.ok(dims.scrollWidth<=dims.clientWidth+3,'Unexpected horizontal overflow '+label+': '+JSON.stringify(dims));
   await page.screenshot({path:'hof-'+label+'.png',fullPage:true});
   const combinedPeaks={'4984':'30.80','9221':'25.37','9493':'25.56','8130':'18.85'};
   for(const [id,name] of [['4984','Josh Allen'],['9221','Jahmyr Gibbs'],['9493','Puka Nacua'],['8130','Trey McBride']]){
    const card=page.locator('.fig-hof-242-card[href="#/hall-of-fame/inductee/player/'+id+'"]');
    assert.ok((await card.innerText()).includes(combinedPeaks[id]+' COMBINED PPG'),
     'Founding class card uses combined 2025 peak for '+name);
   }
   for(const [id,name] of [['4984','Josh Allen'],['9221','Jahmyr Gibbs'],['9493','Puka Nacua'],['8130','Trey McBride']]){
    await go(page,'/inductee/player/'+id,'.fig-hof-242-plaque h1');
    assert.equal(await page.locator('.fig-hof-242-plaque h1').innerText(),name);
    assert.equal(await page.locator('.fig-hof-242-season-row').count(),3);
    const exhibit=await page.locator('.fig-hof-242-profile').innerText();
    assert.ok(exhibit.includes(combinedPeaks[id]+' PPG'),'Hall exhibit matches precise combined archive PPG for '+name);
    assert.ok(exhibit.includes('COMBINED CAREER PPG'),'Combined career average labeled '+name);
    assert.match(exhibit,/ALL-TIME COMBINED/);
    assert.match(exhibit,/regular-season and playoff FIG starting-lineup appearances/);
    assert.ok(await page.locator('.fig-hof-242-receipts a').count()>=5);
    assert.match(await page.locator('.fig-hof-242-data-note').innerText(),/Bench performances are not included/);
   }
   await go(page,'/inductee/season/6/2025','.fig-hof-243-season-profile-hero h1');
   assert.equal(await page.locator('.fig-hof-243-season-profile-hero h1').innerText(),'Hayden · 2025');
   assert.equal(await page.locator('.fig-hof-243-season-proof a').count(),2);
   assert.match(await page.locator('.fig-hof-243-season-profile').innerText(),/3,000\.13/);
   const recordCards=page.locator('.fig-hof-244-record');
   assert.ok(await recordCards.count()>=18);
   const texts=await recordCards.allInnerTexts();
   assert.ok(texts.some(s=>s.includes('40 BOMBS')&&s.includes('TIED #1')));
   assert.ok(texts.some(s=>s.includes('50 BOMBS')&&s.includes('#1')));
   assert.ok(!texts.some(s=>s.includes('150+ Point Games')),'150+ must not appear among historical single-season records');
   assert.ok(texts.some(s=>s.includes('Losses')&&s.match(/#\d+/)),'Non-podium season records must appear');
   assert.ok(texts.some(s=>s.includes('Losses')),'Full record dataset must be represented');
   assert.match(await page.locator('.fig-hof-247-game-head h2').innerText(),/Top-25 scoring games/);
   const gameCards=page.locator('.fig-hof-247-game-grid a');
   const expectedGames=await page.evaluate(async()=>{
    const games=await (await fetch('data/games.json')).json();
    const scores=games.filter(g=>g.game_type==='Regular Season'||g.game_type==='Playoffs')
     .flatMap(g=>[1,2].map(side=>({
      year:Number(g.season),week:Number(g.week),matchupId:Number(g.matchup_id),
      id:Number(g['franchise_'+side]),points:Number(g['score_'+side])
     }))).filter(g=>Number.isFinite(g.points)&&g.points>0)
     .sort((a,b)=>b.points-a.points||a.year-b.year||a.week-b.week||a.id-b.id);
    let previous=null,rank=0;
    return scores.map((g,i)=>{
     if(previous===null||Math.abs(g.points-previous)>0.000001)rank=i+1;
     previous=g.points;return {...g,rank};
    }).filter(g=>g.rank<=25&&g.year===2025&&g.id===6);
   });
   assert.equal(await gameCards.count(),expectedGames.length,
    'Every qualifying all-time top-25 scoring week appears in the exhibit');
   for(let i=0;i<expectedGames.length;i++){
    const game=expectedGames[i],card=gameCards.nth(i),contents=await card.innerText();
    assert.ok(contents.includes('#'+game.rank+' ALL TIME')&&contents.includes('WEEK '+game.week),
     'Verified all-time rank and scoring week for game '+i);
    assert.equal(await card.getAttribute('href'),
     '#/game/'+game.year+'/'+game.week+'/'+game.matchupId,
     'Original box-score link retained for top-25 game '+i);
   }
   assert.ok(await page.locator('.fig-hof-247-notable-tags>span').count()>=16,'All notable records are shown in the summary');
   assert.equal(await page.locator('.fig-hof-243-season-profile .fig-hof-v2-standard').count(),0,'Remove enshrinement case block');
   const columns=await page.locator('.fig-hof-244-record-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(' ').filter(Boolean).length);
   assert.equal(columns,width>900?2:1,'Roomy record layout on '+label);
   const firstRecord=await recordCards.first().boundingBox();
   assert.ok(firstRecord&&firstRecord.height>=220,'Each record has sufficient space on '+label);
   for(const category of ['200+ Point Games','225+ Point Games','250+ Point Games'])
    assert.ok(texts.some(s=>s.includes(category)));
   assert.equal(await page.locator('.fig-hof-244-streak-list').count(),0);
   await go(page,'/charter','.fig-hof-242-charter');
   assert.equal(await page.locator('.fig-hof-v2-rule').count(),4);
   assert.equal(await page.locator('.fig-hof-242-grid').count(),0,
    'The standalone philosophy page must not duplicate the main Hall');
   assert.equal(await page.locator('.fig-hof-243-season-card').count(),0);
   await go(page,'/hall','.fig-hof-242-grid .fig-hof-242-card');
   await go(page,'/legacy','.fig-hof-242-grid .fig-hof-242-card');
   await go(page,'/records','.fig-hof-242-grid .fig-hof-242-card');
   await page.goto(origin+'/#/more');
   await page.locator('a[href="#/hall-of-fame"]').first().waitFor();
   console.log('Hall founding four: verified all exhibits and no overflow on',label);
   await page.close();
  }
  assert.deepEqual(bad,[],'JavaScript errors on Hall routes');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
