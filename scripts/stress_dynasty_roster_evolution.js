'use strict';
/*
 * Neutral roster-evolution stress test. NO manager trading-skill priors.
 * All incumbent players survive with a league-wide empirical retention
 * rate conditioned ONLY on starter/bench status at the historical cutoff.
 * Departing incumbents are shuffled across franchises and every transfer
 * has a corresponding removal. No talent is created in a trade.
 *
 * A prospective class of rookies is sampled only if a *prior completed*
 * FIG rookie class existed at the historical cutoff.
 *
 * This tests whether uncertainty from player movement helps predict next-
 * season team strength. It is not a retrospective reconstruction of
 * unknown trade partners or an endorsement of simulated transfer outcomes.
 *
 * node scripts/stress_dynasty_roster_evolution.js --runs 900
 */
const fs=require('node:fs'),path=require('node:path');
const {build,legalLineup}=require('./build_dynasty_asof_snapshots');
const {audit}=require('./audit_dynasty_turnover');
const {observedRookieCohort,asofForecast,heldOutTargets,evaluate}=require('./backtest_dynasty_next_season');
const {random}=require('./dynasty_dominance_model');
const IDS=Array.from({length:10},(_,i)=>i+1),mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const rnd=(x,d=2)=>Number(x.toFixed(d));
const pct=(a,q)=>{let b=[...a].sort((x,y)=>x-y);return b[Math.floor((b.length-1)*q)];};
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f+'.json'),'utf8'));
function trainRates(turnover,asofYear){
 const past=turnover.transitions.filter(x=>x.to_year<=asofYear);
 if(!past.length)throw Error('No cohort available before '+asofYear);
 const rows=past.flatMap(x=>x.teams);
 const st=rows.reduce((s,x)=>s+x.starters,0),str=rows.reduce((s,x)=>s+x.starters_retained,0);
 const bn=rows.reduce((s,x)=>s+x.bench,0),bnr=rows.reduce((s,x)=>s+x.bench_retained,0);
 if(st<10||bn<10)throw Error('Incomplete retrospective turnover cohort');
 return {train_through_year:Math.max(...past.map(x=>x.to_year)),
   training_transitions:past.map(x=>x.from_year+'->'+x.to_year),
   training_teams:rows.length,
   starter_retention:rnd(str/st,4),bench_retention:rnd(bnr/bn,4)};
}
function shuffledExchange(pool,vacancies,r){
 // Random exchange across ten teams, using no team-specific strengths,
 // manager traits, market prices, or simulated discretionary trades.
 for(let i=pool.length-1;i>0;i--){
  const j=Math.floor(r.u()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];
 }
 // Avoid re-assigning an outbound player back to the same team when
 // possible, while keeping a strictly balanced player count.
 let selfReturn=0;
 for(let i=0;i<pool.length;i++){
  if(pool[i].from!==vacancies[i])continue;
  const options=[];
  for(let j=i+1;j<pool.length;j++)if(pool[i].from!==vacancies[j]&&pool[j].from!==vacancies[i])options.push(j);
  if(options.length){
   const j=options[Math.floor(r.u()*options.length)];
   [pool[i],pool[j]]=[pool[j],pool[i]];
  }else selfReturn++;
 }
 return {selfReturn};
}
function forecast(snapshot,{nflHistory,drafts,rates},runs=900,seed=522026){
 if(!Number.isInteger(runs)||runs<1||runs>20000)throw Error('Invalid runs');
 if(!rates||![rates.starter_retention,rates.bench_retention].every(x=>Number.isFinite(x)&&x>=0&&x<=1))
   throw Error('Invalid retention priors');
 if(rates.train_through_year>snapshot.year)throw Error('Future turnover training leakage');
 const rng=random(seed),rookies=observedRookieCohort(drafts,nflHistory,snapshot.year+1);
 const distributions=Object.fromEntries(IDS.map(id=>[id,[]])),first=Object.fromEntries(IDS.map(id=>[id,0]));
 let transfers=0,returns=0;
 for(let iteration=0;iteration<runs;iteration++){
  const rosters=Object.fromEntries(IDS.map(id=>[id,[]]));
  const departing=[],vacancies=[];
  for(const team of snapshot.teams){
   for(const p of team.players){
    const prior=.7*p.ppg+.3*p.past_ppg,sd=p.games<3?.65:.36;
    const pp=Math.max(0,prior*Math.exp(sd*rng.normal()-.5*sd*sd));
    const item={pos:p.pos,ppg:pp,from:team.id};
    const retain=p.starter?rates.starter_retention:rates.bench_retention;
    if(rng.u()<retain)rosters[team.id].push(item);
    else{departing.push(item);vacancies.push(team.id);}
   }
  }
  const move=shuffledExchange(departing,vacancies,rng);
  returns+=move.selfReturn;transfers+=departing.length;
  for(let i=0;i<departing.length;i++)rosters[vacancies[i]].push(departing[i]);
  if(rookies.usable)for(const team of snapshot.teams){
   for(const p of team.picks.filter(p=>p.year===snapshot.year+1)){
    const cohort=rookies.by_round[p.round];
    if(!cohort?.length)continue;
    const pick=cohort[Math.floor(rng.u()*cohort.length)];
    rosters[team.id].push({pos:pick.pos,ppg:pick.ppg,from:'rookie'});
   }
  }
  const scores=Object.fromEntries(IDS.map(id=>[id,legalLineup(rosters[id],'ppg')]));
  const max=Math.max(...Object.values(scores));
  for(const id of IDS){
   distributions[id].push(scores[id]);
   if(scores[id]===max)first[id]++;
  }
 }
 const projected=IDS.map(id=>{
  const arr=distributions[id],team=snapshot.teams.find(x=>x.id===id);
  return {id,mean_ppg:rnd(mean(arr)),p10:rnd(pct(arr,.1)),p90:rnd(pct(arr,.9)),
    best_pct:rnd(100*first[id]/runs,1),asof_current_week7_ppg:team.baseline_ppg,
    frozen_players:team.players.length,rookie_picks_held:team.picks.filter(x=>x.year===snapshot.year+1).length};
 }).sort((a,b)=>b.mean_ppg-a.mean_ppg);
 return {asof_year:snapshot.year,asof_week:7,forecast_year:snapshot.year+1,
  runs,seed,predicted:projected,rates,rookies_included:rookies.usable,
  mean_players_reassigned:rnd(transfers/runs),mean_self_returns:rnd(returns/runs),
  leader:projected[0].id,model_scope:'neutral exchange of departing incumbents; no new traded talent or manager skill'};
}
function study({weeklyRosters,transactions,nflHistory,weeklyScores,drafts,runs=900,seed=522026}){
 const input={weeklyRosters,transactions,nflHistory,weeklyScores};
 const turnover=audit(input);
 const snapshots=build(input,[2024,2025]).snapshots;
 const cases=snapshots.map((s,i)=>{
  const rates=trainRates(turnover,s.year);
  const neutral=forecast(s,{nflHistory,drafts,rates},runs,seed+i);
  const frozen=asofForecast(s,{nflHistory,drafts},runs,seed+i);
  const targets=heldOutTargets({weeklyRosters,weeklyScores},s);
  return {asof_year:s.year,training_rates:rates,
   comparison:{
    neutral_turnover:evaluate(neutral,targets),
    frozen_assets:evaluate(frozen,targets)
   },forecast:neutral};
 });
 return {version:'neutral-turnover-v1',status:'RESEARCH_SENSITIVITY_ONLY',
  cases,
  caveats:[
   'Identical league-wide retention rates for all managers, separated only by starter and bench status. No manager skill bonus.',
   'Turnover cohorts must be fully observed by the given cutoff. 2025->2026 outcomes never train a 2026 prediction.',
   'Departing incumbents are redistributed within the existing league; no unrostered free agents or invented net league talent.',
   'The redistribution experiment does not represent real trade partner choices or trading permissions.',
   'Rookies added only from already completed draft classes; no future draft results enter priors.',
   '2024->2025 evaluates 14 games; 2025->2026 only 7. Fantasy league scoring rules can vary.',
   'Only two one-year holdouts, insufficient for credible six-year dynasty odds.'
  ]};
}
function main(args){
 let out='',runs=900;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--out')out=args[++i];
  else if(args[i]==='--runs')runs=+args[++i];
  else throw Error('Unknown '+args[i]);
 }
 const r=study({weeklyRosters:read('weekly_full_rosters'),transactions:read('transactions'),
  nflHistory:read('dynasty_nfl_history'),weeklyScores:read('weekly_scoring_ranks'),
  drafts:read('draft_picks'),runs});
 if(out)fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');
 for(const x of r.cases){
  const n=x.comparison.neutral_turnover,f=x.comparison.frozen_assets;
  console.log('NEUTRAL_TURNOVER',x.asof_year+'->'+(x.asof_year+1),
   'trained',x.training_rates.training_transitions.join(','),
   'starter retention',x.training_rates.starter_retention,
   'bench retention',x.training_rates.bench_retention,
   'MAE',n.mae,'frozen MAE',f.mae,'baseline MAE',f.baseline_naive_mae,
   'coverage',n.p10_p90_coverage_pct+'%',
   'predicted leader',n.predicted_leader,'actual',n.actual_leader);
  console.log('NEUTRAL_TEAM_FORECASTS',x.asof_year,JSON.stringify(n.paired.map(z=>({
   id:z.id,expected:z.mean_ppg,actual:z.actual_ppg,prob_top:z.best_pct}))));
 }
}
if(require.main===module)main(process.argv.slice(2));
module.exports={trainRates,shuffledExchange,forecast,study};
