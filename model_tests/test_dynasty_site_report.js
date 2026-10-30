'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {build,files,reportVersion}=require('../scripts/build_dynasty_site_report');
const {makePicks}=require('../scripts/dynasty_dominance_model');
const inputs=Object.fromEntries(files.map(n=>[n,JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',n+'.json'),'utf8'))]));
const fixedDate='2026-10-30T00:00:00Z';
const output=build(inputs,{runs:12,seed:407,generatedAt:fixedDate});
assert.equal(output.version,reportVersion);
assert.equal(output.status,'experimental_beta_not_calibrated');
assert.equal(output.validation.full_six_year_backtest_passed,false);
assert.equal(output.validation.one_year_holdout_better_than_baseline,false);
assert.equal(output.generated_at,fixedDate);
assert.equal(output.teams.length,10);
assert.deepEqual(output.years,[2027,2028,2029,2030,2031,2032]);
assert.ok(output.source_week>=7);
assert.equal(output.inputs.known_2027_2029_picks,120);
for(const year of output.years){
 const ranking=output.seasons[year].ranking;
 assert.equal(ranking.length,10);
 assert.ok(ranking.every(t=>Number.isFinite(t.ppg)&&t.ppg>=0));
 assert.equal(new Set(ranking.map(t=>t.id)).size,10);
}
assert.ok(output.teams.every(t=>Number.isFinite(t.top10_value_weighted_age)));
assert.ok(output.teams.every(t=>Object.keys(t.draft_by_year).length===6));
const rawPicks=inputs.current_future_picks;
const fixture=rawPicks.filter(x=>+x.pick_season===2030);
if(fixture.length===40){
 const actual=makePicks(rawPicks)[2030];
 assert.equal(actual.filter(x=>!x.assumed).length,40);
 assert.equal(output.inputs.known_2030_2032_picks>=40,true);
 assert.equal(output.inputs.assumed_2030_2032_picks,80);
}
const reportCopied=JSON.parse(JSON.stringify(inputs));
reportCopied.current_future_picks=reportCopied.current_future_picks.filter(p=>+p.pick_season!==2030);
const fallback=build(reportCopied,{runs:4,seed:407,generatedAt:fixedDate});
assert.equal(fallback.inputs.assumed_2030_2032_picks,120,'Unknown years get original one-per-round picks');
assert.equal(fallback.teams.reduce((s,t)=>s+t.draft_by_year[2030].projected_assumed,0),40);
assert.throws(()=>build({...inputs,rosteraudit_values:{status:'unavailable'}},{runs:4}),/RosterAudit/);
console.log('Dynasty beta generated inputs, 2030 real pick rights, fallback year and research disclosures passed');
