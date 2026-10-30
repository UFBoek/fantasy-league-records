'use strict';
const fs=require('node:fs'),path=require('node:path');
const previous=require('./dynasty_dominance_model');
const redesigned=require('./dynasty_value_only_model');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',n+'.json'),'utf8'));
function audit(runs=300){
 const input={roster:read('current_roster'),values:read('rosteraudit_values'),picks:read('current_future_picks')};
 const original=previous.runModel({...input,weekly:read('weekly_scoring_ranks'),logs:read('player_game_log'),
  nflCurrent:read('playoff_nfl_weekly_scores'),nflHistory:read('dynasty_nfl_history'),
  drafts:read('draft_picks'),runs,seed:20261030});
 const alternative=redesigned.runModel({...input,runs,seed:20261030});
 const summaries=alternative.years.map(year=>{
  const get=(x,id)=>x.seasons[year].ranking.find(t=>t.id===id)?.ppg;
  return {year,challenger:alternative.seasons[year].ranking.find(t=>t.id!==1)?.name,
   boek:{before:get(original,1),after:get(alternative,1)},
   hayden:{before:get(original,6),after:get(alternative,6)},
   camnol:{before:get(original,9),after:get(alternative,9)}};
 });
 const search=['Malik Nabers','Drake Maye','Ashton Jeanty','Jaxon Smith-Njigba',
  'Colston Loveland','Carnell Tate','Derrick Henry','Josh Allen','Christian McCaffrey'];
 const players=search.map(name=>{
  const roster=input.roster.find(x=>x.player_name===name);
  if(!roster)return {name,missing:true};
  const id=String(roster.player_id),teams={};
  for(const year of [2027,2028,2029,2030,2032]){
   const p=alternative.seasons[year].player_projections[roster.franchise_id].find(x=>x.id===id);
   teams[year]=p?.ppg??null;
  }
  const value=input.values.players[id]?.value??null;
  return {name,pos:roster.position,age:roster.age,value,year_ppg:teams};
 });
 return {model:alternative.version,summary:summaries,player_development:players,
  limitations:'Relative scoring strength comparisons; RosterAudit contains market expectations and this model has no valid out-of-time valuation holdout. No historical player scoring used in redesigned forecast.'};
}
if(require.main===module){
 let runs=300;
 for(let i=2;i<process.argv.length;i++)if(process.argv[i]==='--runs')runs=Number(process.argv[++i]);
 else throw Error('Unknown argument '+process.argv[i]);
 const report=audit(runs);
 console.log('VALUE_ONLY_TEAM',JSON.stringify(report.summary));
 console.log('VALUE_ONLY_PLAYER',JSON.stringify(report.player_development));
 console.log('VALUE_ONLY_CAVEAT',report.limitations);
}
module.exports={audit};
