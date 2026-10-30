'use strict';
/* Historical check of a current-year scoring anchor only.
   No inference about multiyear player aging, injury and rookie odds.
   node scripts/backtest_dynasty_form.js --out /tmp/form-backtest.json
*/
const fs=require('node:fs'),path=require('node:path');
const YEARS=[2023,2024,2025],CUTOFFS=[5,7,10],IDS=Array.from({length:10},(_,i)=>i+1);
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const round=(x,d=2)=>Number(x.toFixed(d));
function backtest(rows){
 const predictions=[];
 for(const year of YEARS)for(const cutoff of CUTOFFS)for(const id of IDS){
  const games=rows.filter(x=>+x.season===year&&+x.franchise_id===id&&+x.week<=14)
   .sort((a,b)=>+a.week-+b.week);
  if(games.length!==14)throw Error('Missing historical weeks: '+year+' team '+id);
  const past=games.filter(x=>+x.week<=cutoff).map(x=>+x.points_for);
  const future=games.filter(x=>+x.week>cutoff).map(x=>+x.points_for);
  if(past.length!==cutoff||future.length!==14-cutoff)throw Error('Invalid cutoff');
  const full=mean(past),recent=mean(past.slice(-3)),actual=mean(future);
  predictions.push({year,cutoff,id,prior_weeks:past.length,future_weeks:future.length,
   actual:round(actual,4),full:round(full,4),recent:round(recent,4)});
 }
 const quality=(examples,weight)=>{
  if(!examples.length)throw Error('No examples');
  const errors=examples.map(x=>((1-weight)*x.full+weight*x.recent)-x.actual);
  return {mae:round(mean(errors.map(Math.abs))),rmse:round(Math.sqrt(mean(errors.map(x=>x*x)))),
   bias:round(mean(errors)),sample_count:errors.length};
 };
 const training=predictions.filter(x=>x.year<2025);
 const testing=predictions.filter(x=>x.year===2025);
 const weights=Array.from({length:21},(_,i)=>i/20);
 const trainingFit=weights.map(w=>({recent_weight:round(w,2),...quality(training,w)}))
  .sort((a,b)=>a.mae-b.mae||a.recent_weight-b.recent_weight);
 const winner=trainingFit[0].recent_weight;
 const yearly=YEARS.map(year=>({year,
  full:quality(predictions.filter(x=>x.year===year),0),
  blend_65_35:quality(predictions.filter(x=>x.year===year),.35)}));
 const cuts=CUTOFFS.map(cutoff=>({cutoff,
  full:quality(predictions.filter(x=>x.cutoff===cutoff),0),
  blend_65_35:quality(predictions.filter(x=>x.cutoff===cutoff),.35)}));
 return {type:'current_year_scoring_anchor_backtest',status:'observed_historical',
  seasons:YEARS,cutoffs:CUTOFFS,team_cutoff_samples:predictions.length,
  year_tables:yearly,cutoff_tables:cuts,
  pooled:{full:quality(predictions,0),blend_65_35:quality(predictions,.35),
    recent_only:quality(predictions,1)},
  train_2023_24:{best_recent_weight:winner,full:quality(training,0),
    blend_65_35:quality(training,.35),best:quality(training,winner)},
  holdout_2025:{full:quality(testing,0),blend_65_35:quality(testing,.35),
    train_selected_weight:winner,train_selected:quality(testing,winner)},
  limitations:[
   'Every target is the unobserved remaining regular-season PPG, never used in feature construction.',
   'This only tests 1-season franchise-average form, NOT long-term player-level aging, injury or rookie simulation.',
   'Observations share teams and seasons; 90 team-cutoff forecasts are not statistically independent.',
   'Three historical seasons are a small sample; there is no demonstrated universal optimum.',
   '2026 scoring rules and player pools may differ; no league-wide relative scoring normalization.'
  ]};
}
function main(args){
 let out='';
 for(let i=0;i<args.length;i++)if(args[i]==='--out')out=args[++i];else throw Error('Unknown option '+args[i]);
 const rows=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/weekly_scoring_ranks.json'),'utf8'));
 const result=backtest(rows);
 if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 console.log('Historical weekly form validation:');
 for(const s of result.year_tables)console.log(s.year,'full-season MAE',s.full.mae,'65/35 MAE',s.blend_65_35.mae);
 console.log('Pooled MAE:',result.pooled.full.mae,'(full) vs',result.pooled.blend_65_35.mae,'(65/35)');
 console.log('2025 holdout optimal 2023-24 training weight:',result.holdout_2025.train_selected_weight);
 console.log('Scope: single-season scoring-form anchor, not dynasty forecast calibration.');
}
if(require.main===module)main(process.argv.slice(2));
module.exports={backtest,YEARS,CUTOFFS};
