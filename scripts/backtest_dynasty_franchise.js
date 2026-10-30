'use strict';
/** Retrospective franchise-level one-year scoring persistence.
 * Historical standings contain 10 complete franchises per season, 2023-25.
 * Fit a one-year franchise shrinkage only using 2023->2024; freeze and test
 * against 2024->2025. NOT a full as-of dynasty roster model.
 */
const fs=require('node:fs'),path=require('node:path');
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const round=x=>Number(x.toFixed(3));
function transition(rows,year){
 const data=rows.filter(r=>+r.season===year||+r.season===year+1);
 return Array.from({length:10},(_,i)=>{
  const id=i+1,prior=data.find(r=>+r.season===year&&+r.franchise_id===id);
  const next=data.find(r=>+r.season===year+1&&+r.franchise_id===id);
  if(!prior||!next||prior.games!==14||next.games!==14)throw Error('Missing 14-game season '+year+' team '+id);
  return {id,prior:+prior.points_per_game,target:+next.points_per_game};
 });
}
function fitPrior(train){
 const prevMean=mean(train.map(x=>x.prior));
 let best=null;
 // Predict subsequent year as prior team PPG shrunk toward the historical
 // league mean. League mean is from the prior season only.
 for(let t=0;t<=20;t++){
  const w=t/20;
  const loss=mean(train.map(x=>Math.abs(w*x.prior+(1-w)*prevMean-x.target)));
  if(!best||loss<best.loss-1e-9)best={weight:round(w),loss:round(loss)};
 }
 return best;
}
function evaluate(rows,weight){
 const priorAvg=mean(rows.map(x=>x.prior));
 const forecast=rows.map(x=>({...x,pred:weight*x.prior+(1-weight)*priorAvg}));
 const mae=mean(forecast.map(x=>Math.abs(x.pred-x.target)));
 const actualLeader=[...forecast].sort((a,b)=>b.target-a.target)[0].id;
 const expectedLeader=[...forecast].sort((a,b)=>b.pred-a.pred)[0].id;
 return {n:rows.length,mae:round(mae),
  mean_absolute_change:round(mean(rows.map(x=>Math.abs(x.prior-x.target)))),
  predicted_leader:expectedLeader,actual_leader:actualLeader,
  leader_correct:expectedLeader===actualLeader};
}
function backtest(rows){
 const train=transition(rows,2023),test=transition(rows,2024),fit=fitPrior(train);
 return {type:'franchise_one_year_persistence_only',status:'partial_retro',
  fit_from:'2023->2024',holdout:'2024->2025',trained:fit,
  train:{unchanged:evaluate(train,1),trained:evaluate(train,fit.weight)},
  holdout:{unchanged:evaluate(test,1),trained:evaluate(test,fit.weight)},
  limits:['Ten franchises and only two completed year-to-year transitions; extreme uncertainty.',
   'No market prices, acquisition forecasts, live draft holdings, or player ages as-of historical cutoffs.',
   'Not an end-to-end validation of dynasty simulation or 2027–2032 #1 percentages.']};
}
function main(args){
 let out='';
 for(let i=0;i<args.length;i++)if(args[i]==='--out')out=args[++i];else throw Error('Unknown option '+args[i]);
 const rows=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/team_season_master.json'),'utf8'));
 const report=backtest(rows);
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('Franchise one-year 2025 holdout MAE:',
  report.holdout.unchanged.mae,'unchanged vs',report.holdout.trained.mae,'trained');
 console.log('Actual 2025 leader:',report.holdout.unchanged.actual_leader);
 console.log('NOT A DYNASTY MODEL BACKTEST');
}
if(require.main===module)main(process.argv.slice(2));
module.exports={transition,fitPrior,evaluate,backtest};
