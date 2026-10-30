'use strict';
/* Conservative stress checks: optional parameters on an otherwise identical
   roster-strength model. No manager skill or fabricated transactions.
   node scripts/stress_dynasty_dominance.js --runs 600 --out /tmp/stress.json
*/
const fs=require('node:fs'),path=require('node:path');
const {runModel}=require('./dynasty_dominance_model');
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f+'.json'),'utf8'));
function topAssets(roster,values,id,count){
 return roster.filter(x=>+x.franchise_id===id)
  .sort((a,b)=>(+values.players[String(b.player_id)]?.value||0)-(+values.players[String(a.player_id)]?.value||0))
  .slice(0,count).map(p=>({id:String(p.player_id),name:p.player_name,value:+values.players[String(p.player_id)]?.value||0}));
}
function scenarioDefinitions(roster,values){
 const boek=topAssets(roster,values,1,2),hayden=topAssets(roster,values,6,2);
 const lost=a=>Object.fromEntries(a.map(x=>[x.id,0]));
 return [
  {key:'baseline',name:'Baseline',scenario:{}},
  {key:'fast_aging',name:'Faster aging for every player',scenario:{ageCurveExponent:1.5}},
  {key:'slow_aging',name:'Slower aging for every player',scenario:{ageCurveExponent:.6}},
  {key:'weak_rookies',name:'Rookie results 30% weaker for every team',scenario:{rookieMultiplier:.7}},
  {key:'strong_rookies',name:'Rookie results 30% stronger for every team',scenario:{rookieMultiplier:1.3}},
  {key:'injury_risk',name:'Injury risk 50% higher for every team',scenario:{injuryMultiplier:1.5}},
  {key:'boek_star_loss',name:'Boek permanently loses two most valuable 2026 players',scenario:{playerMultipliers:lost(boek)},impacted:boek},
  {key:'hayden_star_loss',name:'Hayden permanently loses two most valuable 2026 players',scenario:{playerMultipliers:lost(hayden)},impacted:hayden}
 ];
}
function summarize(model){
 const years=[2027,2029,2032],byYear={};
 for(const year of years){
  const s=model.seasons[year],b=s.ranking.find(x=>x.id===1),h=s.ranking.find(x=>x.id===6);
  byYear[year]={boek_ppg:b.ppg,hayden_ppg:h.ppg,
   boek_best_pct:b.best_pct,hayden_best_pct:h.best_pct,
   boek_hayden_gap_ppg:s.boek_vs_teams.find(x=>x.id===6).gap_ppg,
   boek_gap_vs_strongest_other_ppg:s.boek_vs_leagues_best_opponent.gap_ppg};
 }
 return {years:byYear,boek_expected_years_best:model.whole_horizon.find(x=>x.id===1).expected_years_best,
  boek_best_3plus_pct:model.whole_horizon.find(x=>x.id===1).chance_best_at_least_three_years_pct};
}
function study(input,{runs=600,seed=20261030}={}){
 const cases=scenarioDefinitions(input.roster,input.values);
 const results=[];
 for(const c of cases){
  const m=runModel({...input,runs,seed,scenario:c.scenario});
  results.push({key:c.key,name:c.name,scenario:c.scenario,impacted:c.impacted||[],
    ...summarize(m)});
 }
 return {version:'experimental-stress-v1',seed,runs,
  results,scope:'hypothetical_persistent_risk_sensitivity',
  limitations:[
   'Rookie/age/injury scenarios change explicit assumptions uniformly across all teams; no discretionary manager skill adjustments.',
   'Star-loss stress represents permanent removal of two players, NOT an ordinary multiweek injury or expected event.',
   'Model is not backtested for future roster construction, aging and injury probabilities.',
   'Scenario comparisons share the same seed but may still have Monte Carlo variation due to different simulation paths.',
   'Rosters and 2027-29 traded picks are fixed to the current dated snapshot. No future player trades are invented.'
  ]};
}
function main(args){
 let runs=600,seed=20261030,out='';
 for(let i=0;i<args.length;i++){
  if(args[i]==='--runs')runs=+args[++i];
  else if(args[i]==='--seed')seed=+args[++i];
  else if(args[i]==='--out')out=args[++i];
  else throw Error('Unknown argument '+args[i]);
 }
 const exists=f=>fs.existsSync(path.resolve(__dirname,'../data',f+'.json'));
 const optional=f=>exists(f)?read(f):null;
 const input={roster:read('current_roster'),values:read('rosteraudit_values'),
  logs:read('player_game_log'),weekly:read('weekly_scoring_ranks'),picks:read('current_future_picks'),
  nflCurrent:optional('playoff_nfl_weekly_scores'),nflHistory:optional('dynasty_nfl_history'),
  drafts:optional('draft_picks')};
 const report=study(input,{runs,seed});
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 for(const c of report.results)
  console.log(c.key,'Boek years #1',c.boek_expected_years_best,
   '2027/2029/2032 PPG',c.years[2027].boek_ppg,c.years[2029].boek_ppg,c.years[2032].boek_ppg);
 console.log('Hypothetical unvalidated stresses; full assumptions in report.');
}
if(require.main===module)main(process.argv.slice(2));
module.exports={topAssets,scenarioDefinitions,summarize,study};
