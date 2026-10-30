'use strict';
/* FIG Dynasty Dominance public beta report.
 * Experimental scoring-strength research only. Never assert calibrated odds.
 * Read current validated JSON, preserve actual known pick owners for 2030+,
 * regenerate only when inputs change. Does NOT publish website by itself.
 * node scripts/build_dynasty_site_report.js
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {runModel,makePicks}=require('./dynasty_value_only_model');
const root=path.resolve(__dirname,'../data');
// The forecast engine receives NO past game outcomes; weekly scoring is
// loaded only for the separately labeled 2026 actual-results display.
const files=['current_roster','rosteraudit_values','weekly_scoring_ranks','current_future_picks'];
const output=path.join(root,'dynasty_dominance_projection.json');
const IDS=Array.from({length:10},(_,i)=>i+1);
const LABELS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
const reportVersion='fig-beta-1.4-league-scale';
function build(inputs,{runs=1500,seed=20261030,generatedAt=new Date().toISOString()}={}){
 const [roster,values,weekly,picks]=files.map(n=>inputs[n]);
 // Actual league history is used only as a benchmark shown beside the
 // projection. It is NOT an argument to runModel or a team-specific prior.
 const observedWeekly=new Map();
 for(const row of weekly){
  if(+row.season<2023||+row.season>2026||+row.week<1||+row.week>14)continue;
  const key=row.season+':'+row.week;
  if(!observedWeekly.has(key))observedWeekly.set(key,[]);
  observedWeekly.get(key).push(row);
 }
 const leagueWeeks=[...observedWeekly.values()].filter(rows=>rows.length===10&&
  new Set(rows.map(r=>+r.franchise_id)).size===10);
 const leagueAvg=leagueWeeks.length?
  Number((leagueWeeks.reduce((sum,rows)=>sum+rows.reduce((a,r)=>a+(+r.points_for),0),0)/leagueWeeks.length).toFixed(1)):null;
 const completed=weekly.filter(x=>+x.season===2026),
  throughWeek=Math.max(0,...completed.map(x=>+x.week||0));
 const actualPpg=id=>{
  const points=completed.filter(x=>+x.franchise_id===id).map(x=>+x.points_for);
  return points.length?Number((points.reduce((s,x)=>s+x,0)/points.length).toFixed(1)):0;
 };
 if(values?.status!=='ready'||Object.keys(values?.players||{}).length<300)
  throw Error('RosterAudit provider not ready');
 const model=runModel({roster,values,picks,runs,seed});
 if(model.status!=='research_only'||model.years.length!==6||model.inputs.market_coverage_pct<95)
  throw Error('Dynasty research input coverage insufficient');
 if(model.inputs.known_2027_2029_picks!==120)
  throw Error('Incomplete real 2027–2029 draft pick assignments');
 const count=(arr,fn)=>arr.filter(fn).length;
 const allPicks=makePicks(picks);
 const teams=IDS.map(id=>{
   const players=roster.filter(p=>+p.franchise_id===id&&['QB','RB','WR','TE'].includes(p.position));
   const known=picks.filter(p=>+p.current_franchise_id===id&&+p.pick_season>=2027&&+p.pick_season<=2032);
   const valued=players.map(p=>({...p,value:+values.players?.[String(p.player_id)]?.value||0}))
      .sort((a,b)=>b.value-a.value);
   const top=valued.slice(0,10);
   const denom=top.reduce((a,p)=>a+p.value,0);
   const topAge=denom?top.reduce((a,p)=>a+p.value*(+p.age||25),0)/denom:0;
   return {id,name:LABELS[id],roster_count:players.length,
     top10_value_weighted_age:Number(topAge.toFixed(1)),
     known_future_picks:known.length,
     known_first_rounders:count(known,p=>+p.round===1),
     draft_by_year:Object.fromEntries(model.years.map(year=>{
       const rows=allPicks[year].filter(p=>p.owner===id);
       return [year,{known:count(rows,p=>!p.assumed),round1:count(rows,p=>p.round===1&&!p.assumed),
         projected_assumed:count(rows,p=>p.assumed)}];
     })),
     current_ppg:actualPpg(id),
     market_value_known_players:Math.round(valued.reduce((s,p)=>s+p.value,0))};
 });
 const seasons=Object.fromEntries(model.years.map(year=>{
   const s=model.seasons[year];
   return [year,{league_total_ppg:Number(s.ranking.reduce((sum,t)=>sum+t.ppg,0).toFixed(1)),
     ranking:s.ranking.map(t=>({id:t.id,ppg:t.ppg,p10:t.p10,p90:t.p90})),
     // From the same simulation used for the franchise scores; the market
     // value shown is TODAY's RosterAudit figure, never a future estimate.
     players_by_team:Object.fromEntries(IDS.map(id=>[id,(s.player_projections?.[id]||[]).map(p=>({
       id:p.id,name:p.name,pos:p.pos,age:p.age,ppg:p.ppg,p10:p.p10,p90:p.p90,
       projected_rookie:p.rookie,pick_year:p.pick_year,pick_round:p.pick_round,
       pick_origin:p.pick_origin,
       current_market_value:p.rookie?null:(values.players?.[String(p.id)]?.value??null)
     }))])), 
     boek_vs_leagues_best_opponent:{gap_ppg:s.boek_vs_leagues_best_opponent.gap_ppg,
      p10:s.boek_vs_leagues_best_opponent.p10,p90:s.boek_vs_leagues_best_opponent.p90},
     boek_vs_teams:s.boek_vs_teams.map(t=>({id:t.id,gap_ppg:t.gap_ppg,
      p10:t.p10,p90:t.p90}))}];
 }));
 return {version:reportVersion,status:'experimental_beta_not_calibrated',
   generated_at:generatedAt,source_week:throughWeek,
   source_season:2026,model_version:model.version,runs,seed,
   assumptions:{no_future_trades:true,
     known_pick_ownership_through:Math.max(...picks.map(p=>+p.pick_season||2029)),
     later_picks_assumed_by_original_franchise:true,
     scenario_range:'Model sensitivity only; percentile bands are not calibrated confidence intervals',
     future_score_interpretation:'Future player PPG uses only position, 2026 roster age and current RosterAudit value. Observed 2026 league scoring is displayed separately; it NEVER feeds future forecasts.',
     future_player_model:'Position-specific market-implied PPG, pre-peak maturation, veteran decline and uncertain career breakouts; future rookies use RosterAudit draft-pick value tiers and unknown sampled positions.',
     player_forecast_interpretation:'Future fantasy PPG from the exact team simulation; current RosterAudit values are historical present-day reference only, never projected resale values'},
   validation:{full_six_year_backtest_passed:false,
    one_year_holdout_better_than_baseline:false,
    one_year_intervals_calibrated:false,
    description:'Historical one-year tests did not consistently beat the simpler roster scoring baseline. The model is research only.'},
   league_scoring_reference:{historical_weekly_avg:leagueAvg,completed_ten_team_weeks:leagueWeeks.length,
    description:'Measured total team scoring across completed 10-team regular-season FIG weeks; display-only context, never an input to a player forecast'},
   inputs:model.inputs,teams,seasons,years:model.years};
}
function main(){
 let args=process.argv.slice(2),runs=1500;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--runs')runs=Number(args[++i]);
  else throw Error('Unknown option '+args[i]);
 }
 const inputs={},hash=crypto.createHash('sha256').update(reportVersion);
 for(const file of files){
  const raw=fs.readFileSync(path.join(root,file+'.json'),'utf8');
  hash.update(file).update(raw);inputs[file]=JSON.parse(raw);
 }
 const fp=hash.digest('hex').slice(0,24);
 if(fs.existsSync(output)){
  try{
   const previous=JSON.parse(fs.readFileSync(output,'utf8'));
   if(previous.version===reportVersion&&previous.input_fingerprint===fp&&previous.runs===runs){
    console.log('Dynasty Dominance beta: inputs unchanged; retaining published report');
    return;
   }
  }catch(_){}
 }
 const result=build(inputs,{runs});
 result.input_fingerprint=fp;
 const tmp=output+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(result,null,2)+'\n');
 fs.renameSync(tmp,output);
 console.log('Dynasty Dominance beta:',result.teams.length,'teams,',
  result.years.length,'forecast seasons; Week',result.source_week,
  'generated; real picks through',result.assumptions.known_pick_ownership_through);
}
if(require.main===module)main();
module.exports={build,files,reportVersion};
