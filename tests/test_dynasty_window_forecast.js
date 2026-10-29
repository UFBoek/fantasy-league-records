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
const input={teams,weeklyRanks:weekly,year,currentModel:model,playerValue,pickValue};
const first=engine.forecast(input),second=engine.forecast(input);
assert.equal(first.ready,true);
assert.deepEqual(first.years,[2026,2027,2028,2029,2030,2031]);
assert.equal(first.teams.length,10);
assert.deepEqual(first,second,'same verified inputs generate repeatable odds');
assert.ok(first.teams.every(t=>t.outlook.length===6&&t.farChance>=0&&t.farChance<=100));
for(let y=0;y<6;y++){
 const sum=first.teams.reduce((total,t)=>total+t.outlook[y].topThree,0);
 assert.ok(Math.abs(sum-300)<.8,'three scoring contenders per simulated year');
}
assert.ok(first.teams.every(t=>t.window.indexOf('2032')<0),'do not invent beyond-horizon closure');
assert.ok(first.teams.every(t=>t.openYear===null||t.openYear<=2031));
assert.ok(first.teams.every(t=>t.outlook.every(x=>x.low<=x.high)));
const missingAges=structuredClone(teams);
missingAges[0].roster.forEach(p=>{p.age=null;});
assert.equal(engine.forecast({...input,teams:missingAges}).ready,false,
 'missing verified ages prevent fabricated long-run rankings');
assert.ok(engine.ageCurve('RB',28)<engine.ageCurve('RB',23));
assert.ok(engine.ageCurve('QB',35)>engine.ageCurve('RB',35));
const book=first.teams.find(t=>t.id===1);
console.log('2026–2031 dynasty forecasts pass deterministic scenario and data-quality checks');
console.log('Boek forecast: '+JSON.stringify({window:book.window,opening:book.openYear,peak:book.peakYear,top3:book.outlook.map(x=>[x.year,x.topThree])}));
