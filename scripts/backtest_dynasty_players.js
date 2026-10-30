'use strict';
/**
 * Time-safe validation of dynasty player-scoring assumptions.
 *
 * Data as it would have been known at season boundaries:
 * - train scoring persistence on 2023 NFL results -> 2024 results
 * - freeze parameters, then test 2024 -> 2025 out of sample
 * - train rookie fantasy-draft-round priors on 2024 rookie class
 * - freeze priors, then test 2025 first-year class
 *
 * ALL fantasy points use FIG 2026 scoring weights so scoring changes do not
 * contaminate cross-year comparison. This does NOT validate dynasty odds.
 *
 * node scripts/backtest_dynasty_players.js --out /tmp/dynasty-player-backtest.json
 */
const fs=require('node:fs'),path=require('node:path');
const {ageCurve}=require('./dynasty_dominance_model');
const pct=(arr,p)=>{
 const a=[...arr].sort((x,y)=>x-y);
 return a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:null;
};
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const round=(x,d=3)=>Number(x.toFixed(d));
const POS=new Set(['QB','RB','WR','TE']);
function metrics(samples,prediction){
 const results=samples.map(x=>({
  error:prediction(x)-x.target,
  prediction:prediction(x),
  target:x.target
 }));
 const errors=results.map(x=>x.error);
 return {n:samples.length,
  mae:round(mean(errors.map(Math.abs))),
  rmse:round(Math.sqrt(mean(errors.map(x=>x*x)))),
  bias:round(mean(errors)),
  avg_prediction:round(mean(results.map(x=>x.prediction))),
  avg_actual:round(mean(results.map(x=>x.target)))};
}
function seasonTransition(archive,fromYear){
 const prior=archive.seasons[String(fromYear)]?.players;
 const next=archive.seasons[String(fromYear+1)]?.players;
 if(!prior||!next)throw Error('Missing completed NFL scoring archive '+fromYear);
 const rows=[];
 for(const [pid,record] of Object.entries(prior)){
  const games=Number(record.games);
  if(!Number.isInteger(games)||games<1||games>17)throw Error('Invalid past games '+pid);
  // Full 17 weeks, not games-played average: the target includes missed weeks.
  const prev=Number(record.total_points)/17;
  const target=Number(next[pid]?.total_points||0)/17;
  if(!Number.isFinite(prev)||!Number.isFinite(target))throw Error('Invalid score '+pid);
  rows.push({id:pid,from_year:fromYear,games,prior:prev,target});
 }
 return rows;
}
function fitPersistence(train){
 // Fit only from 2023->2024. Candidate weights and intercepts are chosen
 // before the 2024->2025 holdout is scored.
 let best=null;
 const selected=train.filter(x=>x.games>=3);
 for(let i=0;i<=20;i++){
  const alpha=i*.05;
  for(let j=0;j<=20;j++){
   const intercept=j*.2;
   const fit=metrics(selected,x=>alpha*x.prior+intercept);
   const candidate={alpha:round(alpha,2),intercept:round(intercept,2),mae:fit.mae,rmse:fit.rmse};
   if(!best||candidate.mae<best.mae-1e-7||
    (candidate.mae===best.mae&&candidate.rmse<best.rmse))best=candidate;
  }
 }
 return best;
}
function ageKnownCohort(rows,currentRoster){
 const ages=new Map(currentRoster.filter(x=>POS.has(x.position)&&Number.isFinite(+x.age))
  .map(x=>[String(x.player_id),{age:+x.age,pos:x.position}]));
 return rows.filter(x=>ages.has(x.id)).map(x=>{
  const known=ages.get(x.id);
  const oldAge=known.age-(2026-x.from_year);
  const nextAge=oldAge+1;
  return {...x,known_age:oldAge,pos:known.pos,
   age_factor:ageCurve(known.pos,nextAge)/ageCurve(known.pos,oldAge)};
 });
}
function cohortMetrics(rows,fit){
 const groups={
  all:rows,
  at_least_3_games:rows.filter(x=>x.games>=3),
  at_least_8_games:rows.filter(x=>x.games>=8),
  established_8_plus_ppg:rows.filter(x=>x.prior>=8&&x.games>=8),
  established_15_plus_ppg:rows.filter(x=>x.prior>=15&&x.games>=8),
 };
 return Object.fromEntries(Object.entries(groups).map(([key,subset])=>[key,{
  naive:metrics(subset,x=>x.prior),
  trained_shrinkage:metrics(subset,x=>fit.alpha*x.prior+fit.intercept),
  zero_forecast:metrics(subset,()=>0)
 }]));
}
function draftRows(draft,archive,year){
 const season=archive.seasons[String(year)]?.players;
 if(!season)throw Error('Missing rookie scoring for '+year);
 const result=[];
 for(const p of draft){
  if(+p.draft_season!==year||p.draft_class!=='Rookie'||!POS.has(p.draft_position||p.position))continue;
  const roundNo=+p.round;
  if(roundNo<1||roundNo>4)continue;
  const score=Number(season[String(p.player_id)]?.total_points||0)/17;
  result.push({id:String(p.player_id),name:p.draft_full_name||p.player_name,
   round:roundNo,position:p.draft_position||p.position,target:score});
 }
 if(result.length!==40||[1,2,3,4].some(r=>result.filter(x=>x.round===r).length!==10))
  throw Error('Incomplete 40-pick rookie class '+year);
 return result;
}
function rookieBacktest(draft,archive){
 const train=draftRows(draft,archive,2024),test=draftRows(draft,archive,2025);
 const overall=mean(train.map(x=>x.target));
 const roundMeans=Object.fromEntries([1,2,3,4].map(roundNo=>
  [roundNo,mean(train.filter(x=>x.round===roundNo).map(x=>x.target))]));
 const overallMetric=metrics(test,()=>overall);
 const roundMetric=metrics(test,x=>roundMeans[x.round]);
 const zeroMetric=metrics(test,()=>0);
 const ranks=[1,2,3,4].map(roundNo=>{
  const t=train.filter(x=>x.round===roundNo).map(x=>x.target);
  const v=test.filter(x=>x.round===roundNo);
  const lo=pct(t,.1),hi=pct(t,.9);
  return {round:roundNo,n_training:10,n_holdout:10,
   training_mean:round(overallMetric.n?mean(t):0),
   holdout_mean:round(mean(v.map(x=>x.target))),
   mae:metrics(v,x=>roundMeans[x.round]).mae,
   training_p10:round(lo),training_p90:round(hi),
   holdout_in_prior_10_90_pct:round(100*v.filter(x=>x.target>=lo&&x.target<=hi).length/v.length,1)};
 });
 return {train_class:2024,holdout_class:2025,
  train_n:train.length,holdout_n:test.length,round_means:roundMeans,
  holdout:{prior_round_mean:roundMetric,pooled_mean:overallMetric,zero:zeroMetric},
  by_round:ranks,second_year_holdout_available:false};
}
function backtest({nflHistory,roster,draft}){
 if(nflHistory?.scoring_season!==2026)throw Error('Expected FIG 2026 scoring weights');
 const y23=seasonTransition(nflHistory,2023),y24=seasonTransition(nflHistory,2024);
 const fit=fitPersistence(y23);
 const ageRows=ageKnownCohort(y24,roster);
 const ageMetric=metrics(ageRows,x=>x.prior*x.age_factor);
 const noAgeMetric=metrics(ageRows,x=>x.prior);
 const report={
  version:'dynasty-player-retrospective-v1',
  status:'HISTORICAL_PARTIAL_VALIDATION',
  scoring_weights:'FIG 2026 (reapplied to 2023-2025)',
  train_transition:'2023->2024',holdout_transition:'2024->2025',
  training_cases:y23.length,holdout_cases:y24.length,
  trained_parameters:fit,
  training:cohortMetrics(y23,fit),
  holdout:cohortMetrics(y24,fit),
  age_curve_subset:{current_2026_roster_only:true,known_age_count:ageRows.length,
   year:'2024->2025',without_aging:noAgeMetric,with_aging:ageMetric},
  rookies:rookieBacktest(draft,nflHistory),
  caveats:[
   'Time-safe: fitted scoring parameters use only 2023->2024 results, holdout is 2024->2025. No 2026 player values enter training.',
   '2026 FIG scoring weights are applied consistently to all historical game observations.',
   'Scoring target is full 17-week PPG, counting missed NFL weeks as zero. The current dynasty simulator models played-game PPG with stochastic availability, so these outputs are not directly interchangeable.',
   'Age-curve cohort consists only of 2026 roster survivors and is survivorship-biased; it is a diagnostic, not population-level calibration.',
   'Rookie holdout is 10 picks per fantasy draft round, across only two FIG draft classes. Round is fantasy draft order, not NFL round.',
   'League historical dynasty rosters, draft holdings, and period-correct RosterAudit prices are not all available as dated point-in-time market snapshots for 2023-2025.',
   'The 2024 class has observed sophomore outcomes but there is no separate completed sophomore cohort to use as out-of-sample holdout.',
   'This report cannot verify six-year #1 percentages, full roster acquisition/trades, injuries, schedule effects or championship probabilities.'
  ]};
 return report;
}
function main(args){
 let output='';
 for(let i=0;i<args.length;i++){
  if(args[i]==='--out')output=args[++i];else throw Error('Unknown option '+args[i]);
 }
 const load=name=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',name),'utf8'));
 const r=backtest({nflHistory:load('dynasty_nfl_history.json'),
  roster:load('current_roster.json'),draft:load('draft_picks.json')});
 if(output)fs.writeFileSync(output,JSON.stringify(r,null,2)+'\n');
 console.log('Prior 2023->2024; held-out 2024->2025');
 console.log('Training persistence:',JSON.stringify(r.trained_parameters));
 for(const [k,v] of Object.entries(r.holdout))
  console.log('Holdout '+k+' n='+v.naive.n+' naive MAE='+v.naive.mae+
   ', trained MAE='+v.trained_shrinkage.mae+', zero MAE='+v.zero_forecast.mae);
 console.log('2026-survivors age comparison: '+r.age_curve_subset.without_aging.mae+
  ' vs '+r.age_curve_subset.with_aging.mae);
 console.log('2025 rookie class: fantasy-draft-round prior MAE '+r.rookies.holdout.prior_round_mean.mae+
  ', pooled prior MAE '+r.rookies.holdout.pooled_mean.mae);
 console.log('These tests do not validate long-term dynasty probability estimates.');
}
if(require.main===module)main(process.argv.slice(2));
module.exports={seasonTransition,fitPersistence,cohortMetrics,ageKnownCohort,draftRows,rookieBacktest,backtest};
