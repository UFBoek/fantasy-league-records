'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const model=require('../scripts/dynasty_dominance_model');
const load=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',f+'.json'),'utf8'));
const input={roster:load('current_roster'),values:load('rosteraudit_values'),
 logs:load('player_game_log'),weekly:load('weekly_scoring_ranks'),picks:load('current_future_picks')};
assert.equal(model.ageCurve('RB',25),1);
assert.ok(model.ageCurve('RB',31)<model.ageCurve('RB',25));
assert.ok(model.ageCurve('WR',23)<model.ageCurve('WR',27));
assert.ok(model.marketPpg('QB',8000)>model.marketPpg('QB',100));
const lineup=model.legalLineup([
 {pos:'QB',ppg:20},{pos:'QB',ppg:18},
 {pos:'RB',ppg:9},{pos:'RB',ppg:8},{pos:'RB',ppg:4},
 {pos:'WR',ppg:7},{pos:'WR',ppg:6},{pos:'WR',ppg:5},{pos:'WR',ppg:3},
 {pos:'TE',ppg:4}
]);
assert.equal(lineup,84,'Superflex QB and two best flex players');
assert.equal(model.legalLineup([{pos:'QB',ppg:24},{pos:'QB',ppg:21}]),45);
const baseline=model.playerBaselines(input.roster,input.values,input.logs);
assert.ok(baseline.length>300);
assert.ok(baseline.some(p=>p.samples===0&&p.basePpg>0),'bench player priors are not zero');
const picks=model.makePicks(input.picks);
for(const year of [2027,2028,2029,2030,2031,2032])assert.equal(picks[year].length,40);
for(const year of [2027,2028,2029]){
 const raw=input.picks.filter(p=>p.pick_season===year);
 assert.deepEqual(picks[year].map(x=>[x.round,x.owner,x.origin]).sort(),
  raw.map(x=>[+x.round,+x.current_franchise_id,+x.original_franchise_id]).sort());
}
for(const year of [2030,2031,2032])
 for(let id=1;id<=10;id++)
  assert.deepEqual(picks[year].filter(p=>p.owner===id).map(p=>p.round),[1,2,3,4]);
const a=model.runModel({...input,runs:32,seed:47321});
const b=model.runModel({...input,runs:32,seed:47321});
assert.deepEqual(a,b,'same seed gives same result');
assert.equal(a.status,'research_only');
assert.ok(a.inputs.observed_through_week>=7);
assert.equal(a.whole_horizon.length,10);
assert.equal(a.years.length,6);
for(const year of a.years){
 const season=a.seasons[year];
 assert.equal(season.ranking.length,10);
 assert.equal(season.boek_vs_teams.length,9);
 assert.equal(Math.round(season.ranking.reduce((sum,t)=>sum+t.best_pct,0)),100);
 for(const team of season.ranking){
  assert.ok(team.p10<=team.ppg+15&&team.ppg<=team.p90+15);
  assert.ok(team.best_pct>=0&&team.best_pct<=100);
  assert.ok(team.top3_pct>=0&&team.top3_pct<=100);
 }
 assert.ok(season.boek_vs_teams.every(t=>t.boek_stronger_pct>=0&&t.boek_stronger_pct<=100));
}
assert.throws(()=>model.runModel({...input,values:{players:{}},runs:1}),/coverage/);
console.log('Dynasty dominance deterministic data, pick, and probability smoke checks passed');
