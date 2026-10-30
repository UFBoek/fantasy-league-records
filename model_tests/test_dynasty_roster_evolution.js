'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {audit}=require('../scripts/audit_dynasty_turnover');
const neutral=require('../scripts/stress_dynasty_roster_evolution');
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f+'.json'),'utf8'));
const input={weeklyRosters:read('weekly_full_rosters'),transactions:read('transactions'),
 nflHistory:read('dynasty_nfl_history'),weeklyScores:read('weekly_scoring_ranks'),
 drafts:read('draft_picks')};
const rates=audit(input);
assert.deepEqual(rates.transitions.map(t=>t.from_year),[2023,2024,2025]);
const t24=neutral.trainRates(rates,2024),t25=neutral.trainRates(rates,2025);
assert.deepEqual(t24.training_transitions,['2023->2024']);
assert.deepEqual(t25.training_transitions,['2023->2024','2024->2025']);
assert.ok(t24.starter_retention>t24.bench_retention);
assert.ok(t25.starter_retention>t25.bench_retention);
assert.equal(t24.training_teams,10);assert.equal(t25.training_teams,20);
const altered=JSON.parse(JSON.stringify(rates));
altered.transitions[2].teams.forEach(x=>{x.starters_retained=0;x.bench_retained=0;});
assert.deepEqual(neutral.trainRates(altered,2024),t24);
assert.deepEqual(neutral.trainRates(altered,2025),t25,
 '2025->2026 turnover may NEVER be used at 2025 week-7 cutoff');
const pool=[{from:1,ppg:20},{from:2,ppg:10},{from:3,ppg:4}];
const idsBefore=pool.map(x=>x.ppg).sort((a,b)=>a-b);
let state=1;const random={u:()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return(state+.5)/4294967296;}};
const swap=neutral.shuffledExchange(pool,[1,2,3],random);
assert.deepEqual(pool.map(x=>x.ppg).sort((a,b)=>a-b),idsBefore,
 "Neutral trade exchange must conserve every player\'s output");
assert.ok(swap.selfReturn>=0);
const model=neutral.study({...input,runs:25,seed:712});
assert.equal(model.cases.length,2);
const repeat=neutral.study({...input,runs:25,seed:712});
assert.deepEqual(model,repeat);
for(const c of model.cases){
 const n=c.comparison.neutral_turnover,f=c.comparison.frozen_assets;
 assert.equal(n.paired.length,10);assert.equal(f.paired.length,10);
 assert.ok(Number.isFinite(n.mae)&&n.mae>=0);
 assert.ok(Number.isFinite(n.p10_p90_coverage_pct));
 assert.ok(c.forecast.mean_players_reassigned>=0);
 assert.equal(c.training_rates.train_through_year<=c.asof_year,true);
 assert.equal(c.forecast.predicted.length,10);
 assert.equal(Math.round(c.forecast.predicted.reduce((s,x)=>s+x.best_pct,0)),100);
}
assert.throws(()=>neutral.forecast({year:2024,teams:[]},{rates:{
 starter_retention:0.7,bench_retention:0.4,train_through_year:2025}},1),
 /Future turnover training leakage/);
console.log('Evidence-based neutral roster transfer stress, cutoff and conservation tests passed');
