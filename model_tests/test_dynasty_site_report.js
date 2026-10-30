'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {build,files,reportVersion}=require('../scripts/build_dynasty_site_report');
const {makePicks}=require('../scripts/dynasty_value_only_model');
const inputs=Object.fromEntries(files.map(n=>[n,JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',n+'.json'),'utf8'))]));
const fixedDate='2026-10-30T00:00:00Z';
const output=build(inputs,{runs:12,seed:407,generatedAt:fixedDate});
assert.equal(output.version,reportVersion);
assert.equal(output.status,'experimental_beta_not_calibrated');
assert.equal(output.validation.full_six_year_backtest_passed,false);
assert.equal(output.validation.one_year_holdout_better_than_baseline,false);
assert.equal(output.generated_at,fixedDate);
assert.equal(output.teams.length,10);
assert.equal(output.version,'fig-beta-1.8-qb-late-aging');
assert.equal(output.league_scoring_calibration.baseline_ppg,1600);
assert.deepEqual(output.league_scoring_calibration.target_range_ppg,[1570,1630]);
assert.ok(output.league_scoring_reference.completed_ten_team_weeks>=49);
assert.ok(output.league_scoring_reference.historical_weekly_avg>1550&&
 output.league_scoring_reference.historical_weekly_avg<1650,
 'Independent historical league aggregate should be around 1,600 PPG');
for(const year of output.years){
 const season=output.seasons[year];
 const sum=season.ranking.reduce((a,x)=>a+x.ppg,0);
 assert.ok(Math.abs(sum-season.league_total_ppg)<.11,
  'Reported league total must agree with all ten displayed team projections');
 assert.ok(season.league_total_ppg>=1569.5&&season.league_total_ppg<=1630.5,
  'All forecast years must land inside the target league scoring interval');
}
assert.deepEqual(output.years,[2027,2028,2029,2030,2031,2032]);
assert.ok(output.source_week>=7);
assert.equal(output.inputs.known_2027_2029_picks,120);
for(const year of output.years){
 const ranking=output.seasons[year].ranking;
 assert.equal(ranking.length,10);
 assert.ok(ranking.every(t=>Number.isFinite(t.ppg)&&t.ppg>=0));
 assert.equal(new Set(ranking.map(t=>t.id)).size,10);
}
const distorted={...inputs,weekly_scoring_ranks:inputs.weekly_scoring_ranks.map(row=>({
 ...row,points_for:99999
}))};
const changed=build(distorted,{runs:12,seed:407,generatedAt:fixedDate});
assert.deepEqual(changed.seasons,output.seasons,
 '2026 actual team scoring may change the display, never projected 2027-2032 PPG');
assert.notDeepEqual(changed.teams.map(x=>x.current_ppg),
 output.teams.map(x=>x.current_ppg),
 'Observed PPG remains a separate actual-performance display');
assert.ok(output.teams.every(t=>Number.isFinite(t.top10_value_weighted_age)));
assert.ok(output.teams.every(t=>Object.keys(t.draft_by_year).length===6));
for(const year of output.years){
 const season=output.seasons[year];
 for(let id=1;id<=10;id++){
  const players=season.players_by_team[id];
  const real=players.filter(p=>!p.projected_rookie);
  const future=players.filter(p=>p.projected_rookie);
  const current=inputs.current_roster.filter(p=>+p.franchise_id===id&&['QB','RB','WR','TE'].includes(p.position));
  assert.equal(real.length,current.length,'Every actual roster player appears exactly once in each future season');
  assert.equal(new Set(players.map(p=>p.id)).size,players.length,'Future draft slots must have stable unique identifiers');
  assert.ok(players.every(p=>p.ppg===null||(Number.isFinite(p.ppg)&&p.ppg>=0&&Number.isFinite(p.p10)&&Number.isFinite(p.p90))));
  assert.ok(real.filter(p=>p.current_market_value===null).every(p=>p.ppg===null),
   'No RosterAudit quote means PPG remains unknown, never borrowed from historical scoring');
  assert.ok(real.every(p=>['QB','RB','WR','TE'].includes(p.pos)&&
   (p.current_market_value===null||Number.isFinite(+p.current_market_value))),
   'Missing RosterAudit player prices must remain unknown, never fabricated');
  assert.ok(future.every(p=>p.pos==='TBD'&&p.current_market_value===null&&p.id.startsWith('pick:')));
  const expectedFuture=Object.entries(makePicks(inputs.current_future_picks))
   .filter(([y])=>+y<=year).flatMap(([,draftPicks])=>draftPicks).filter(p=>p.owner===id);
  assert.equal(future.length,expectedFuture.length,
   'Every truly owned and assumed draft slot is represented once by its forecast year');
 }
}
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
