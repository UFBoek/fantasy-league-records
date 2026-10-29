/* End-to-end guardrails for the 2026–2031 contender-window scenarios. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..','data',p+'.json'),'utf8'));
const model=require('../dynasty-window-model-v210.js');
const engine=require('../dynasty-window-forecast-v212.js');
const rosters=read('current_roster'),picks=read('current_future_picks'),market=read('rosteraudit_values');
const standings=read('standings_career'),current=read('current_standings_web'),weekly=read('weekly_scoring_ranks');
const year=Math.max(...current.map(row=>Number(row.season)));
const pickValue=p=>{
 const orig=Number(p.original_franchise_id),round=Number(p.round),y=Number(p.pick_season);
 if(orig===10)return [6300,1600,464,146][round-1]||0;
 const tier=(orig===1||orig===6)?'late':'mid';
 return Number(market.future_picks[String(Math.max(2027,y))+':'+round+':'+tier]||0);
};
const playerValue=id=>Number(market.players[String(id)]?.value||0);
const teams=standings.map(s=>{
 const id=Number(s.franchise_id),roster=rosters.filter(p=>Number(p.franchise_id)===id);
 const draft=picks.filter(p=>Number(p.current_franchise_id)===id&&Number(p.pick_season)>year);
 const pv=roster.reduce((sum,p)=>sum+playerValue(p.player_id),0);
 const totalPicks=draft.reduce((sum,p)=>sum+pickValue(p),0);
 return {id,value:pv+totalPicks,picks:totalPicks,roster,asset:{picks:draft}};
});
const input={teams,weeklyRanks:weekly,year,currentModel:model,playerValue,pickValue,market};
const first=engine.forecast(input),second=engine.forecast(input);
assert.equal(first.ready,true);
assert.deepEqual(first.years,[2026,2027,2028,2029,2030,2031]);
assert.equal(engine.EQUITABLE_TITLE_SHARE,10,'window benchmark uses equal share of the actual league championship');
for(const t of first.teams){
 const qualified=t.outlook.filter(o=>o.titleChance>=engine.EQUITABLE_TITLE_SHARE);
 if(t.openYear!==null){
  assert.ok(qualified.length>0);
  const idx=t.outlook.findIndex(o=>o.year===t.endYear);
  assert.ok(t.outlook[idx].titleChance>=engine.EQUITABLE_TITLE_SHARE);
  if(idx<t.outlook.length-1)assert.ok(t.outlook[idx+1].titleChance<engine.EQUITABLE_TITLE_SHARE);
 }else{
  assert.equal(qualified.length,0);
 }
}

assert.equal(first.teams.length,10);
assert.deepEqual(first,second,'same verified inputs generate repeatable odds');
assert.ok(first.teams.every(t=>t.outlook.length===6&&t.farChance>=0&&t.farChance<=100));
assert.ok(first.calibration.slope>0,'actual league player values and scoring are positively associated');
const forecastSource=fs.readFileSync(path.join(__dirname,'..','dynasty-window-forecast-v212.js'),'utf8');
assert.doesNotMatch(forecastSource,/convertVeterans|consolidateBench|lastKnownPickYear/,
 'baseline must not credit fictitious future trade conversions or draft-pick grants');
assert.match(forecastSource,/state\.picks\.filter\(p=>p\.year===year\)/,
 'new rookies come from owned or newly issued original draft picks; never assumed trades');

assert.match(first.metric,/championship rate/i);
for(let y=0;y<6;y++){
 const sum=first.teams.reduce((total,t)=>total+t.outlook[y].titleChance,0);
 assert.ok(Math.abs(sum-100)<.9,'exactly one neutral-bracket champion in each simulated year');
 const top3=first.teams.reduce((total,t)=>total+t.outlook[y].topThree,0);
 assert.ok(Math.abs(top3-300)<.9,'retain top-three diagnostics separately from title chances');
}
assert.ok(first.teams.every(t=>t.window.includes('2032+')||!t.window.includes('2032')),
 'a window after 2031 remains open-ended, not an invented exact finish');
assert.equal(first.tailHorizon,2033);
assert.ok(first.teams.every(t=>t.outlook.at(-1).year===2031),'public annual chart still ends at 2031');
assert.ok(first.teams.every(t=>t.outlook.at(-1).futurePickCount===12),
 'all 10 teams have original rounds 1–4 for 2032, 2033, 2034 by 2031');
const projectedStock=[2027,2028,2029].reduce((sum,y)=>sum+
  [1,2,3,4].reduce((part,r)=>part+Number(market.future_picks[y+':'+r+':mid']||0),0),0);
assert.ok(first.teams.every(t=>Math.abs(t.outlook.at(-1).futurePickCapital-projectedStock)<=1),
 'future self-owned 2032–34 draft capital is valued at comparable RosterAudit horizons');
const issued={id:1,base:{latestKnownDraftYear:2029},picks:[]};
engine.addNewOriginalPicks(issued,2027,market);
assert.deepEqual(issued.picks.map(p=>p.year),[2030,2030,2030,2030],
 '2030 original draft rounds appear in 2027, not before');
for(let season=2028;season<=2031;season++)engine.addNewOriginalPicks(issued,season,market);
assert.equal(engine.futureDraftCapital(issued,2031,market).count,12);
assert.deepEqual([...new Set(issued.picks.filter(p=>p.year>2031).map(p=>p.year))],[2032,2033,2034]);
assert.ok(first.teams.every(t=>t.openYear===null||t.openYear<=2033));
assert.ok(first.teams.every(t=>t.outlook.every(x=>x.low<=x.high)));
assert.ok(first.teams.every(t=>t.peakYear==='2032+'||
  t.peakYear===t.outlook.reduce((best,row)=>row.strength>best.strength?row:best,t.outlook[0]).year),
 'peaks beyond the visible range must be labeled 2032+, rather than invented 2031 peaks');
const james=first.teams.find(t=>t.id===10),fromm=first.teams.find(t=>t.id===3);
assert.ok(fromm.outlook.at(-1).strength>james.outlook.at(-1).strength,
 'asset-rich rebuild should project more scoring power than a depleted roster');
assert.ok(teams.find(t=>t.id===3).value>teams.find(t=>t.id===10).value,
 'franchise valuation source distinguishes the rebuilds');
const missingAges=structuredClone(teams);
missingAges[0].roster.forEach(p=>{p.age=null;});
assert.equal(engine.forecast({...input,teams:missingAges}).ready,false,
 'missing verified ages prevent fabricated long-run rankings');
assert.ok(engine.ageCurve('RB',28)<engine.ageCurve('RB',23));
assert.ok(engine.ageCurve('QB',35)>engine.ageCurve('RB',35));
const book=first.teams.find(t=>t.id===1);
console.log('2026–2031 dynasty forecasts, 2032–34 future draft capital, and horizon labels verified');
console.log('Boek forecast: '+JSON.stringify({window:book.window,opening:book.openYear,peak:book.peakYear,title:book.outlook.map(x=>[x.year,x.titleChance]),top3:book.outlook.map(x=>[x.year,x.topThree])}));
console.log('ALL FRANCHISES: '+JSON.stringify(first.teams.map(t=>({id:t.id,peak:t.peakYear,window:t.window,champ:t.outlook.map(x=>x.titleChance),top3:t.outlook.map(x=>x.topThree),strength:t.outlook.map(x=>x.strength)}))));
