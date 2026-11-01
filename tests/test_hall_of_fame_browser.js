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
   assert.equal(await page.locator('.fig-hof-242-grid .fig-hof-242-card').count(),2);
   assert.deepEqual(await page.locator('.fig-hof-242-grid h3').allInnerTexts(),['Josh Allen','Puka Nacua']);
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
   assert.equal(await page.locator('.fig-hof-nav').count(),0,'Remove redundant Hall navigation with Induction Philosophy');
   assert.equal(await page.locator('a[href="#/hall-of-fame/charter"]').count(),0,'No philosophy links remain');
   assert.match(await page.locator('.fig-hof-242-grid .fig-hof-242-card').nth(1).innerText(),/THE LOGO/);
   assert.match(await page.locator('.fig-hof-242-grid .fig-hof-242-card').nth(1).innerText(),/face of FIG/);
   const classGrid=await page.locator('.fig-hof-242-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
   assert.equal(classGrid,width<=699?1:2,'Two spacious founding cards on desktop and one per row on mobile');
   const dims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
   assert.ok(dims.scrollWidth<=dims.clientWidth+3,'Unexpected horizontal overflow '+label+': '+JSON.stringify(dims));
   await page.screenshot({path:'hof-'+label+'.png',fullPage:true});
   const combinedPeaks={'4984':'30.80','9493':'25.56'};
   for(const [id,name] of [['4984','Josh Allen'],['9493','Puka Nacua']]){
    const card=page.locator('.fig-hof-242-card[href="#/hall-of-fame/inductee/player/'+id+'"]');
    assert.ok((await card.innerText()).includes(combinedPeaks[id]+' COMBINED PPG'),
     'Founding class card uses combined 2025 peak for '+name);
   }
   for(const [id,name] of [['4984','Josh Allen'],['9493','Puka Nacua']]){
    await go(page,'/inductee/player/'+id,'.fig-hof-242-plaque h1');
    assert.equal(await page.locator('.fig-hof-242-plaque h1').innerText(),name);
    if(id==='9493')assert.match(await page.locator('.fig-hof-v2-plaque-copy').innerText(),/THE LOGO/);
    assert.equal(await page.locator('.fig-hof-v2-standard').count(),0,'Remove generic induction philosophy from plaques');
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
   await go(page,'','.fig-hof-242-hero h1');
   assert.equal(await page.locator('a[href="#/hall-of-fame/eligibility"]').count(),1,
    'Nomination standards linked from Hall without appearing as a main exhibit');
   assert.equal(await page.locator('.fig-hof-248-eligibility').count(),0,
    'The Hall landing page does not display the full requirements');
   await page.locator('a[href="#/hall-of-fame/eligibility"]').click();
   await page.locator('.fig-hof-248-eligibility h1').waitFor({timeout:30000});
   assert.match(await page.locator('.fig-hof-248-eligibility h1').innerText(),/Eligibility & Nomination/);
   const requirements=page.locator('.fig-hof-248-rules li');
   assert.equal(await requirements.count(),5,'Exactly five nomination requirements');
   assert.deepEqual(await requirements.locator('h3').allInnerTexts(),[
    'Elite Production','Positional Supremacy','Sustained Dominance','Sustained Excellence','Career Consistency']);
   const pathText=await page.locator('.fig-hof-248-routes').innerText();
   assert.match(pathText,/3\s+OF\s+5/);
   assert.equal(await page.locator('.fig-hof-248-route').count(),1,
    'There must be exactly one Hall nomination standard');
   assert.doesNotMatch(pathText,/SUPREMACY EXCEPTION|STANDARD PATH|2 TITLES/);
   assert.match(pathText,/Every requirement, including #2, counts as one/);
   assert.match(pathText,/No individual requirement qualifies a player by itself/);
   assert.doesNotMatch(pathText,/qualifies a player on its own|exception/i);
   assert.match(await requirements.nth(1).innerText(),/One completed season finishing #1 in positional PPG/);
   assert.match(await requirements.nth(2).innerText(),/Three top-six positional PPG finishes/);
   assert.match(await requirements.nth(2).innerText(),/Tight ends must finish top three/);
   assert.match(await requirements.nth(4).innerText(),/Four completed seasons/);
   assert.match(await requirements.nth(1).innerText(),/Counts as one of the five required benchmarks/);
   const criteria=await page.locator('.fig-hof-248-eligibility').innerText();
   assert.ok(criteria.includes('at least 9 official FIG starts'));
   assert.ok(criteria.includes('average points per FIG start (PPG)'));
   assert.ok(criteria.includes('not their total points'));
   assert.ok(criteria.includes('A player with 8 starts is excluded'));
   assert.ok(!criteria.includes('at least 10 verified FIG starts'));
   assert.ok(criteria.includes('three of the five requirements'));
   assert.ok(criteria.includes('three-of-five nomination standard'));
   assert.ok(!criteria.includes('four-of-five nomination standard'));
   assert.ok(criteria.includes('at least nine FIG starts'));
   assert.ok(criteria.includes('Josh Allen and Puka Nacua are exempt'));
   assert.ok(criteria.includes('commissioner makes the final induction decision'));
   const tableValues=await page.locator('.fig-hof-248-table-wrap tbody tr').evaluateAll(rows=>
    rows.map(row=>Array.from(row.querySelectorAll('th,td'),cell=>cell.textContent.trim())));
   assert.deepEqual(tableValues,[['QB','25+','TOP 10'],['RB','17+','TOP 10'],
    ['WR','17+','TOP 10'],['TE','14+','TOP 3']]);
   const rowColors=await page.locator('.fig-hof-248-table-wrap tbody tr').evaluateAll(rows=>
    rows.map(row=>({background:getComputedStyle(row.querySelector('td')).backgroundColor,
      text:getComputedStyle(row.querySelector('td')).color})));
   assert.ok(rowColors.every(row=>row.background==='rgb(25, 40, 51)'),
    'Every positional table data cell must have dark background, including RB and TE: '+JSON.stringify(rowColors));
   assert.ok(rowColors.every(row=>row.text==='rgb(246, 237, 220)'),
    'Every positional table data cell must retain readable light text: '+JSON.stringify(rowColors));
   const watchTable=page.locator('.fig-hof-249-table');
   assert.equal(await watchTable.count(),1,'Eligibility watch table renders on requirements page');
   const watchHeadings=await watchTable.locator('thead th').allInnerTexts();
   assert.equal(watchHeadings.length,6,'Player column followed by five requirement columns');
   assert.deepEqual(watchHeadings.slice(1).map(t=>t.replace(/\s+/g,' ').trim().toUpperCase()),[
    '#1 ELITE PRODUCTION','#2 POSITIONAL SUPREMACY','#3 SUSTAINED DOMINANCE',
    '#4 SUSTAINED EXCELLENCE','#5 CAREER CONSISTENCY']);
   const candidates=watchTable.locator('tbody tr');
   assert.equal(await candidates.count(),26,'Historical watchlist expanded to include nine selected players');
   const selectedNames=['James Cook III',"De'Von Achane",'Malik Nabers','Drake Maye',
    'Jayden Daniels','Caleb Williams','Jared Goff','Justin Jefferson','Jonathan Taylor'];
   const candidateNames=await candidates.locator('.fig-hof-249-player strong').allInnerTexts();
   for(const player of selectedNames)
    assert.ok(candidateNames.includes(player),'Selected watch player should appear: '+player);
   for(const player of ['Tyreek Hill','Drake London','Zay Flowers','Chris Olave'])
    assert.ok(!candidateNames.includes(player),'Removed watch player should be excluded: '+player);
   assert.ok(candidateNames.includes("Ja'Marr Chase")&&candidateNames.includes('Christian McCaffrey'),
    'Historical contenders remain available');
   const newPlayerCounts=[
    ['Jared Goff',['0 / 2 SEASONS','0 / 1 SEASONS','1 / 3 SEASONS','2 / 4 SEASONS','2 / 4 SEASONS']],
    ['Justin Jefferson',['1 / 2 SEASONS','0 / 1 SEASONS','1 / 3 SEASONS','1 / 4 SEASONS','1 / 4 SEASONS']],
    ['Jonathan Taylor',['1 / 2 SEASONS','0 / 1 SEASONS','1 / 3 SEASONS','1 / 4 SEASONS','1 / 4 SEASONS']]
   ];
   for(const [player,expected] of newPlayerCounts){
    const row=candidates.filter({has:page.locator('.fig-hof-249-player strong',{hasText:player})});
    assert.equal(await row.count(),1,'Added candidate must have one row: '+player);
    assert.equal(await row.locator('.fig-hof-249-progress.is-met').count(),0);
    const actual=await row.locator('td .fig-hof-249-progress span').allInnerTexts();
    assert.deepEqual(actual,expected,'Completed FIG season progress must be correct for '+player);
   }
   const firstCandidate=await candidates.first().innerText();
   assert.ok(firstCandidate.includes("Ja'Marr Chase"),'Chase leads after one positional championship satisfies #2');
   assert.ok(firstCandidate.includes('2 OF 5 MET'),'One positional title still does not automatically qualify Chase');
   assert.ok(await candidates.first().locator('td').nth(1).innerText().then(t=>t.includes('1 / 1 SEASONS')),
    'One positional championship satisfies the positional supremacy benchmark');
   assert.equal(await candidates.first().locator('.fig-hof-249-progress.is-met').count(),2);
   assert.ok(await candidates.first().locator('td').nth(2).innerText().then(t=>t.includes('67%')),
    'Chase has two out of three sustained dominance seasons');
   assert.ok(await candidates.first().locator('td').nth(3).innerText().then(t=>t.includes('75%')),
    'Chase has three out of four sustained excellence seasons');
   assert.ok(await candidates.first().locator('td').nth(4).innerText().then(t=>t.includes('75%')),
    'Chase has three out of four career consistency seasons');
   const chartText=await watchTable.innerText();
   assert.ok(!chartText.includes('Josh Allen')&&!chartText.includes('Puka Nacua'),
    'Founders remain inducted, not placed on a candidate watchlist');
   assert.match(await page.locator('.fig-hof-249-footnote').innerText(),/Minimum nine starts per season/);
   const matrixSize=await page.locator('.fig-hof-249-scroll').evaluate(el=>({
    content:el.scrollWidth,viewport:el.clientWidth}));
   assert.ok(matrixSize.content>=matrixSize.viewport,'Eligibility matrix must fit or scroll within its region');
   assert.equal(await candidates.first().locator('.fig-hof-249-player').getAttribute('href'),'#/player/7564',
    'Watch player links to existing player archive');
   const eligibilityDims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
   assert.ok(eligibilityDims.scrollWidth<=eligibilityDims.clientWidth+3,
    'Eligibility layout should not overflow '+label+': '+JSON.stringify(eligibilityDims));
   await page.screenshot({path:'hof-eligibility-'+label+'.png',fullPage:true});
   await page.locator('.fig-hof-248-back a').click();
   await page.locator('.fig-hof-242-grid .fig-hof-242-card').first().waitFor();
   await go(page,'/charter','.fig-hof-242-grid .fig-hof-242-card');
   assert.equal(await page.locator('.fig-hof-242-charter').count(),0,
    'Retired induction philosophy route now shows the Hall');
   assert.equal(await page.locator('.fig-hof-v2-rule').count(),0);
   for(const id of ['9221','8130']){
    await go(page,'/inductee/player/'+id,'.fig-hof-content');
    assert.match(await page.locator('.fig-hof-content').first().innerText(),/not part of the 2026 founding class/i,
     'Previously enshrined player '+id+' is not in the new founding class');
   }
   await go(page,'/hall','.fig-hof-242-grid .fig-hof-242-card');
   await go(page,'/legacy','.fig-hof-242-grid .fig-hof-242-card');
   await go(page,'/records','.fig-hof-242-grid .fig-hof-242-card');
   await page.goto(origin+'/#/more');
   await page.locator('a[href="#/hall-of-fame"]').first().waitFor();
   console.log('Hall founding two: verified all exhibits and no overflow on',label);
   await page.close();
  }
  assert.deepEqual(bad,[],'JavaScript errors on Hall routes');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
