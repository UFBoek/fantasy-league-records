'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {build}=require('../scripts/build_dynasty_asof_snapshots');
const model=require('../scripts/backtest_dynasty_next_season');
const load=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f+'.json'),'utf8'));
const weeklyRosters=load('weekly_full_rosters'),transactions=load('transactions');
const nflHistory=load('dynasty_nfl_history'),weeklyScores=load('weekly_scoring_ranks'),drafts=load('draft_picks');
const archive=build({weeklyRosters,transactions,nflHistory,weeklyScores});
const input={snapshots:archive.snapshots,drafts,nflHistory,weeklyScores,weeklyRosters,runs:32,seed:32026};
const a=model.run(input),b=model.run(input);
assert.deepEqual(a,b,'All model results must reproduce with a fixed seed');
assert.equal(a.outlooks.length,2);
for(const report of a.outlooks){
 const v=report.validation,f=report.forecast;
 assert.equal(f.asof_week,7);
 assert.equal(f.predicted.length,10);
 assert.equal(v.paired.length,10);
 assert.ok(v.mae>=0&&Number.isFinite(v.mae));
 assert.ok(v.baseline_naive_mae>=0&&Number.isFinite(v.baseline_naive_mae));
 assert.ok(v.p10_p90_coverage_pct>=0&&v.p10_p90_coverage_pct<=100);
 assert.ok(v.mean_roster_retained_pct>0&&v.mean_roster_retained_pct<=100);
 assert.equal(Math.round(f.predicted.reduce((s,x)=>s+x.best_pct,0)),100);
 assert.ok(v.paired.every(x=>x.holdover_share>=0&&x.holdover_share<=1));
}
const [old,young]=a.outlooks;
assert.equal(old.forecast.forecast_year,2025);
assert.equal(old.forecast.rookies_included,false);
assert.equal(old.forecast.empirical_rookie_training_year,null);
assert.equal(old.validation.actual_weeks,14);
assert.equal(young.forecast.forecast_year,2026);
assert.equal(young.forecast.rookies_included,true);
assert.equal(young.forecast.empirical_rookie_training_year,2024);
assert.equal(young.forecast.total_forecast_rookie_picks,40);
assert.equal(young.validation.actual_weeks,7);
const alteredNfl=JSON.parse(JSON.stringify(nflHistory));
for(const [pid,rec] of Object.entries(alteredNfl.seasons['2025'].players)){
 rec.total_points+=500;rec.weekly=rec.weekly.map(([w,score])=>[w,score+500]);
}
const oldForecast=model.asofForecast(archive.snapshots[0],{drafts,nflHistory},25,980);
const oldChanged=model.asofForecast(archive.snapshots[0],{drafts,nflHistory:alteredNfl},25,980);
assert.deepEqual(oldForecast,oldChanged,'2025 NFL scores cannot affect the 2024 historical forecast');
const alteredDraft=JSON.parse(JSON.stringify(drafts));
for(const p of alteredDraft)if(+p.draft_season===2025)p.round=4;
const youngForecast=model.asofForecast(archive.snapshots[1],{drafts,nflHistory},25,980);
const youngChanged=model.asofForecast(archive.snapshots[1],{drafts:alteredDraft,nflHistory},25,980);
assert.deepEqual(youngForecast,youngChanged,'2025 rookie draft outcomes must not train 2025->2026');
const dummyFuture=JSON.parse(JSON.stringify(nflHistory));
for(const rec of Object.values(dummyFuture.seasons['2025'].players)){
 rec.weekly=rec.weekly.map(([w,sc])=>w>=8?[w,sc+50]:[w,sc]);
}
const reArchive=build({weeklyRosters,transactions,nflHistory:dummyFuture,weeklyScores});
const youngSame=model.asofForecast(reArchive.snapshots[1],{drafts,nflHistory:dummyFuture},25,980);
assert.deepEqual(youngForecast,youngSame,'2025 Week 8+ cannot affect as-of 2025 Week 7 forecast');
assert.throws(()=>model.asofForecast(archive.snapshots[0],{drafts,nflHistory},0),/simulation/);
const {audit}=require('../scripts/assess_dynasty_validation');
const readiness=audit({
 marketHistory:load('dynasty_market_history'),nflHistory,roster:load('current_roster'),
 draft:drafts,franchiseSeasons:load('team_season_master'),historicalAsof:archive,nextSeason:a
});
assert.equal(readiness.status,'NOT_READY_FOR_VALIDATED_ODDS');
assert.equal(readiness.public_probability_claims_allowed,false);
assert.ok(readiness.gates.some(g=>g.name.includes('beats simple roster baseline')&&!g.passed));
assert.ok(readiness.gates.some(g=>g.name.includes('80% interval')&&!g.passed));
console.log('Frozen-roster one-year model, original pick ownership, and cutoff leakage checks passed');
