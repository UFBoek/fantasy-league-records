'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const model=require('../scripts/dynasty_dominance_model');
const load=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',f+'.json'),'utf8'));
const optional=f=>fs.existsSync(path.join(__dirname,'../data',f+'.json'))?load(f):null;
const input={roster:load('current_roster'),values:load('rosteraudit_values'),
 logs:load('player_game_log'),weekly:load('weekly_scoring_ranks'),picks:load('current_future_picks'),
 nflCurrent:load('playoff_nfl_weekly_scores'),nflHistory:optional('dynasty_nfl_history'),drafts:load('draft_picks')};
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
assert.ok(input.nflCurrent.season===2026&&input.nflCurrent.through_week===7);
const actualNfl=model.nflScoringSamples(input.nflCurrent,input.nflHistory,7);
const nflBaseline=model.playerBaselines(input.roster,input.values,input.logs,
 input.nflCurrent,input.nflHistory,7);
assert.ok(nflBaseline.filter(x=>x.nflStarts>0).length>=250);
assert.ok(actualNfl.has('11632:2026'), 'Unstarted NFL games are retained');
const sampleRookie={seasons:{2024:{players:{'1':{weekly:[[1,18],[2,22]]}}},
 2025:{players:{'1':{weekly:[[1,25],[2,25]]}}}}};
const testDrafts=[{draft_season:'2024',round:1,draft_class:'Rookie',
 draft_position:'WR',player_id:'1',draft_full_name:'Sample WR'}];
const resultRookie=model.rookieOutcomes(testDrafts,sampleRookie);
assert.equal(resultRookie[1][0].full_week_ppg,40/17);
assert.equal(resultRookie[1][0].second_year_ppg,50/17);
const realRookies=model.rookieOutcomes(input.drafts,input.nflHistory);
if(input.nflHistory){
 for(const rd of [1,2,3,4])assert.equal(realRookies[rd].length,20);
 assert.ok(realRookies[1].some(x=>x.full_week_ppg>10));
 assert.equal(realRookies[1].filter(x=>x.season===2024&&x.second_year_ppg!==null).length,10);
}
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

const {backtest}=require('../scripts/backtest_dynasty_form');
const {scenarioDefinitions}=require('../scripts/stress_dynasty_dominance');
const scoringBacktest=backtest(input.weekly);
assert.equal(scoringBacktest.team_cutoff_samples,90,'only 2023–25 completed league games used');
assert.ok(scoringBacktest.pooled.full.mae < scoringBacktest.pooled.blend_65_35.mae,
 'Historical test should favor full-season mean on this dated 2023–25 sample');
assert.equal(scoringBacktest.train_2023_24.best_recent_weight,0);
assert.equal(Math.round(model.getForm(input.weekly)[1]*10)/10,234.9,
 'Dynasty model must not reuse unvalidated 65/35 recent-form trend');
const stressCases=scenarioDefinitions(input.roster,input.values);
assert.equal(stressCases.length,8);
assert.ok(stressCases.find(s=>s.key==='boek_star_loss').impacted
 .some(p=>p.name==='Jaxon Smith-Njigba'));
assert.ok(stressCases.find(s=>s.key==='hayden_star_loss').impacted
 .some(p=>p.name==='Josh Allen'));
const severeLoss=stressCases.find(s=>s.key==='boek_star_loss');
const shocked=model.runModel({...input,runs:32,seed:47321,scenario:severeLoss.scenario});
const boekScore=a.seasons[2027].ranking.find(x=>x.id===1).ppg;
const lostScore=shocked.seasons[2027].ranking.find(x=>x.id===1).ppg;
assert.ok(lostScore<boekScore,'Removing two top Boek players must reduce expected scoring');
const lowRookies=model.runModel({...input,runs:32,seed:47321,
 scenario:{rookieMultiplier:.7}});
assert.ok(lowRookies.seasons[2029].ranking.length===10);
assert.throws(()=>model.runModel({...input,runs:1,scenario:{injuryMultiplier:4}}),/scenario/);
assert.throws(()=>model.runModel({...input,runs:1,scenario:{playerMultipliers:{10859:-1}}}),/player multipliers/);

console.log('Dynasty dominance deterministic data, pick, and probability smoke checks passed');
