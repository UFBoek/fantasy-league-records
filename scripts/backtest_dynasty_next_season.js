'use strict';
/*
 * Frozen-as-of one-season dynasty scoring experiment.
 *
 * 2024 W7 => actual 2025 regular season (14 weeks)
 * 2025 W7 => actual 2026 W1-7 (latest verified weeks)
 *
 * NEVER uses 2026 RosterAudit valuations or subsequent rookies/rosters as
 * forecasting inputs. Historical transactions and roster membership come
 * solely from the parent as-of builder.
 *
 * The 2024 forecast has no eligible past FIG rookie-draft class, so it
 * intentionally omits unknown rookie contributions rather than using 2024
 * later-season results. 2025 forecast samples 2024 rookies only.
 *
 * This is a partial "hold assets, no future trades" stress experiment,
 * NOT a fitted six-season simulator.
 *
 * node scripts/backtest_dynasty_next_season.js --runs 800 --out /tmp/next-season.json
 */
const fs=require('node:fs');
const path=require('node:path');
const {build,legalLineup}=require('./build_dynasty_asof_snapshots');
const {random}=require('./dynasty_dominance_model');
const IDS=Array.from({length:10},(_,i)=>i+1);
const POS=new Set(['QB','RB','WR','TE']);
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const rnd=(x,d=2)=>Number(x.toFixed(d));
const pctl=(a,p)=>{let b=[...a].sort((x,y)=>x-y);return b[Math.floor((b.length-1)*p)];};
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f+'.json'),'utf8'));

function observedRookieCohort(drafts,nfl,forecastYear){
  const trainingYear=forecastYear-2; // 2026 forecast: only completed 2024 class
  if(trainingYear<2024)return {training_year:null,usable:false,by_round:{}};
  const byRound={1:[],2:[],3:[],4:[]};
  const season=nfl.seasons[String(trainingYear)]?.players;
  if(!season)throw Error('Missing first-year rookie training season '+trainingYear);
  for(const p of drafts){
    if(+p.draft_season!==trainingYear||p.draft_class!=='Rookie'||!POS.has(p.draft_position||p.position))continue;
    const rd=+p.round;if(!byRound[rd])continue;
    const score=Number(season[String(p.player_id)]?.total_points||0)/17;
    byRound[rd].push({id:String(p.player_id),pos:p.draft_position||p.position,
      ppg:Math.max(0,score)});
  }
  const valid=[1,2,3,4].every(r=>byRound[r].length===10);
  return {training_year:trainingYear,usable:valid,by_round:byRound,
    note:valid?'20? No: exactly 10 2024 FIG rookies per draft round':'Insufficient eligible rookie class'};
}
function asofForecast(snapshot,{drafts,nflHistory,persistenceFactor=1},runs=800,seed=552024){
  if(!Number.isFinite(persistenceFactor)||persistenceFactor<0||persistenceFactor>1.5)throw Error('Invalid persistence factor');
  if(!Number.isInteger(runs)||runs<1||runs>20000)throw Error('Invalid simulation count');
  const targetYear=snapshot.year+1;
  const rookies=observedRookieCohort(drafts,nflHistory,targetYear);
  const results=Object.fromEntries(IDS.map(id=>[id,[]]));
  const leaderCounts=Object.fromEntries(IDS.map(id=>[id,0]));
  const r=random(seed);
  for(let t=0;t<runs;t++){
    const score={};
    for(const team of snapshot.teams){
      // Underlying scoring includes zero-score weeks. Random future
      // availability and role changes are already in the full-week target
      // distribution; do not add a second injury penalty.
      const lineup=team.players.map(p=>{
        const prior=.7*p.ppg+.3*p.past_ppg;
        // The full-week scoring rate already includes missed NFL games.
        // Do NOT apply the 0.8 prior-FULL-SEASON regression on top of
        // current seven-week values and separately simulated variance.
        // Vary this explicit factor in stress checks rather than claiming
        // it was fitted at this historical cutoff.
        const regression=persistenceFactor*prior;
        const sd=p.games<3?.65:.36;
        const shock=Math.exp(sd*r.normal()-.5*sd*sd);
        return {pos:p.pos,ppg:Math.max(0,regression*shock)};
      });
      if(rookies.usable){
        for(const owned of team.picks.filter(p=>p.year===targetYear)){
          const cohort=rookies.by_round[owned.round];
          if(!cohort?.length)continue;
          const draw=cohort[Math.floor(r.u()*cohort.length)];
          lineup.push({pos:draw.pos,ppg:draw.ppg});
        }
      }
      score[team.id]=legalLineup(lineup,'ppg');
      results[team.id].push(score[team.id]);
    }
    const best=Math.max(...Object.values(score));
    for(const id of IDS)if(score[id]===best)leaderCounts[id]+=1;
  }
  const predicted=IDS.map(id=>{
    const values=results[id],t=snapshot.teams.find(t=>t.id===id);
    return {id,mean_ppg:rnd(mean(values)),p10:rnd(pctl(values,.1)),
      p90:rnd(pctl(values,.9)),best_pct:rnd(100*leaderCounts[id]/runs,1),
      rookie_picks_held:t.picks.filter(p=>p.year===targetYear).length,
      frozen_players:t.players.length,
      asof_current_week7_ppg:t.baseline_ppg};
  }).sort((a,b)=>b.mean_ppg-a.mean_ppg);
  return {asof_year:snapshot.year,asof_week:7,forecast_year:targetYear,
    empirical_rookie_training_year:rookies.training_year,
    rookies_included:rookies.usable,
    total_forecast_rookie_picks:rookies.usable?predicted.reduce((s,x)=>s+x.rookie_picks_held,0):0,
    runs,seed,persistenceFactor,predicted,leader:predicted[0].id,
    model_scope:'Freeze Week 7 franchise roster and pick holdings, no discretionary trades'};
}
function heldOutTargets({weeklyScores,weeklyRosters,history,currentNFL},snapshot){
  const forecastYear=snapshot.year+1;
  const completed=forecastYear===2026?7:14;
  const actual=[];
  for(const id of IDS){
    const scores=weeklyScores.filter(r=>+r.season===forecastYear&&+r.franchise_id===id&&+r.week>=1&&+r.week<=completed);
    if(scores.length!==completed)throw Error('Missing target scoring '+forecastYear+' F'+id);
    const observed=mean(scores.map(x=>+x.points_for));
    const prior=new Set(snapshot.teams.find(t=>t.id===id).players.map(p=>p.id));
    const nextRows=weeklyRosters.filter(r=>+r.season===forecastYear&&+r.week===7&&+r.franchise_id===id);
    if(nextRows.length<10)throw Error('Missing future-week-7 roster '+forecastYear+' F'+id);
    const next=new Set(nextRows.map(r=>String(r.player_id)));
    const retained=[...prior].filter(p=>next.has(p)).length;
    // Retention is *diagnostic*, never a model input.
    actual.push({id,actual_ppg:rnd(observed),
      followup_weeks:completed,
      holdover_players:retained,
      frozen_player_count:prior.size,
      holdover_share:rnd(retained/prior.size,3),
      actual_week7_roster_count:next.size});
  }
  return actual;
}
function evaluate(forecast,actual){
  const byId=new Map(actual.map(r=>[r.id,r]));
  const paired=forecast.predicted.map(p=>({...p,...byId.get(p.id),
    error_ppg:rnd(p.mean_ppg-byId.get(p.id).actual_ppg)}));
  const errors=paired.map(p=>p.error_ppg),actualRank=actual.slice().sort((a,b)=>b.actual_ppg-a.actual_ppg);
  const predictedRank=[...forecast.predicted];
  const baselineError=paired.map(p=>p.asof_current_week7_ppg-p.actual_ppg);
  return {asof_year:forecast.asof_year,forecast_year:forecast.forecast_year,
    actual_weeks:actual[0].followup_weeks,
    empirical_rookies:forecast.rookies_included,
    mae:rnd(mean(errors.map(Math.abs))),
    rmse:rnd(Math.sqrt(mean(errors.map(x=>x*x)))),
    mean_bias_ppg:rnd(mean(errors)),
    baseline_naive_mae:rnd(mean(baselineError.map(Math.abs))),
    p10_p90_coverage_pct:rnd(100*paired.filter(p=>p.actual_ppg>=p.p10&&p.actual_ppg<=p.p90).length/paired.length,1),
    mean_roster_retained_pct:rnd(100*mean(actual.map(x=>x.holdover_share)),1),
    actual_leader:actualRank[0].id,
    predicted_leader:predictedRank[0].id,
    highest_projected_team_probability:predictedRank[0].best_pct,
    paired:paired.sort((a,b)=>a.id-b.id)};
}
function run({snapshots,drafts,nflHistory,weeklyScores,weeklyRosters,currentNFL=null,runs=800,seed=552024,persistenceFactor=1}){
  if(snapshots?.length!==2||!snapshots.every(s=>[2024,2025].includes(s.year)))throw Error('Need two historical Week 7 snapshots');
  const reports=[];
  for(const s of snapshots){
    const forecast=asofForecast(s,{drafts,nflHistory,persistenceFactor},runs,seed+s.year);
    const actual=heldOutTargets({weeklyScores,weeklyRosters,history:nflHistory,currentNFL},s);
    reports.push({forecast,validation:evaluate(forecast,actual)});
  }
  return {version:'frozen-asset-next-season-v1',
    status:'PARTIAL_FROZEN_ROSTER_BACKTEST',
    persistenceFactor,outlooks:reports,
    caveats:[
      '2024 Week-7 to 2025 full season and 2025 Week-7 to 2026 first seven weeks are two different-length holdouts.',
      'The no-double-discount default persistenceFactor=1 is explicit and heuristic, not fitted before 2024. Alternative factors are diagnostic only.',
      'No historical market values from before October 2026 were used.',
      'Model freezes player and draft-pick ownership; observed next-year teams can trade or add players.',
      '2024 cutoff has no completed previous FIG rookie draft cohort, so forecast rookies are excluded; 2025 cutoff uses only completed 2024 rookies to forecast 2026 picks.',
      'League scoring rules may vary across 2024-2026; model uses standardized 2026 NFL fantasy scores while targets use original annual team points.',
      'Optimized fantasy lineup of season-average player production is not a simulated week-by-week start/sit decision.',
      '10-team sample and two holdouts do not validate 2027-2032 six-year strongest-franchise probabilities.'
    ]};
}
function main(args){
  let out='',runs=800,persistenceFactor=1;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--out')out=args[++i];
    else if(args[i]==='--runs')runs=+args[++i];
    else if(args[i]==='--persistence')persistenceFactor=+args[++i];
    else throw Error('Unknown option '+args[i]);
  }
  const weeklyRosters=read('weekly_full_rosters');
  const nflHistory=read('dynasty_nfl_history');
  const weeklyScores=read('weekly_scoring_ranks');
  const archive=build({weeklyRosters,transactions:read('transactions'),nflHistory,weeklyScores});
  const result=run({snapshots:archive.snapshots,drafts:read('draft_picks'),
    nflHistory,weeklyScores,weeklyRosters,runs,persistenceFactor});
  if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
  for(const r of result.outlooks){
    const s=r.validation;
    console.log('FROZEN_BACKTEST',s.asof_year,'to',s.forecast_year,
      'actual weeks',s.actual_weeks,'mean absolute error',s.mae,
      'naive baseline error',s.baseline_naive_mae,
      'mean bias',s.mean_bias_ppg,'p10-p90 coverage',s.p10_p90_coverage_pct+'%',
      'persistence',r.forecast.persistenceFactor,
      'predicted #1',s.predicted_leader,'actual #1',s.actual_leader,
      'rookie cohort',r.forecast.empirical_rookie_training_year,
      'rookies included',r.forecast.rookies_included,
      'avg retained',s.mean_roster_retained_pct+'%');
    console.log('FROZEN_TEAMS',s.forecast_year,JSON.stringify(s.paired.map(x=>({
      id:x.id,expected:x.mean_ppg,actual:x.actual_ppg,err:x.error_ppg,
      top_pct:x.best_pct,retained:x.holdover_share,rookie_picks:x.rookie_picks_held}))));
  }
}
if(require.main===module)main(process.argv.slice(2));
module.exports={observedRookieCohort,asofForecast,heldOutTargets,evaluate,run};
