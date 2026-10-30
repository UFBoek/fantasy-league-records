'use strict';
/*
 * Independent macro scoring-environment diagnostic.
 * 2023–2026 historical FIG scores are used to CHECK league-wide scale,
 * never passed into individual future player projections.
 * node scripts/audit_dynasty_league_scoring.js --runs 300
 */
const fs=require('node:fs'),path=require('node:path');
const model=require('./dynasty_value_only_model');
const root=path.resolve(__dirname,'../data');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n+'.json'),'utf8'));
function actualLeague(rows){
 const group=new Map();
 for(const r of rows){
  if(+r.season<2023||+r.season>2026||+r.week<1||+r.week>14)continue;
  const key=r.season+':'+r.week;if(!group.has(key))group.set(key,[]);
  group.get(key).push(r);
 }
 const weekly=[...group.entries()].filter(([k,r])=>r.length===10&&new Set(r.map(x=>+x.franchise_id)).size===10)
  .map(([k,r])=>({season:+k.split(':')[0],week:+k.split(':')[1],
   points:r.reduce((a,x)=>a+(+x.points_for),0)}));
 if(weekly.length<40)throw Error('Not enough complete league-wide scoring weeks');
 const mean=weekly.reduce((a,x)=>a+x.points,0)/weekly.length;
 const bySeason=Object.fromEntries([...new Set(weekly.map(w=>w.season))].map(y=>{
  const group=weekly.filter(x=>x.season===y);
  return [y,{weeks:group.length,average_ppg:Number((group.reduce((s,x)=>s+x.points,0)/group.length).toFixed(1))}];
 }));
 return {completed_weeks:weekly.length,historical_ppg:Number(mean.toFixed(1)),by_season:bySeason};
}
function audit({runs=300,seed=20261030}={}){
 const reference=actualLeague(read('weekly_scoring_ranks'));
 const projected=model.runModel({roster:read('current_roster'),
  values:read('rosteraudit_values'),picks:read('current_future_picks'),runs,seed});
 const future=projected.years.map(year=>{
  const total=projected.seasons[year].ranking.reduce((sum,t)=>sum+t.ppg,0);
  return {year,total_ppg:Number(total.toFixed(1)),
   gap_from_historical:Number((total-reference.historical_ppg).toFixed(1)),
   gap_pct:Number((100*(total/reference.historical_ppg-1)).toFixed(1))};
 });
 return {reference,model_version:projected.version,runs,
  future,within_12_pct_each_year:future.every(x=>Math.abs(x.gap_pct)<=12),
  note:'Aggregate historical league scoring is a diagnostic ONLY, not a player-scoring or team-specific input.'};
}
if(require.main===module){
 let runs=300;
 for(let i=2;i<process.argv.length;i++){
  if(process.argv[i]==='--runs')runs=+process.argv[++i];
  else throw Error('Unknown argument '+process.argv[i]);
 }
 const result=audit({runs});
 console.log('FIG_HISTORICAL_WEEKLY_TOTAL',JSON.stringify(result.reference));
 for(const row of result.future)console.log('FIG_FUTURE_WEEKLY_TOTAL',JSON.stringify(row));
 console.log('FIG_SCORING_SCALE_CHECK',result.within_12_pct_each_year?'PASS':'FAIL');
 if(!result.within_12_pct_each_year)process.exitCode=1;
}
module.exports={audit,actualLeague};
