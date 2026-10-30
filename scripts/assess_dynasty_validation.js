'use strict';
/**
 * Research audit: do NOT confer a validated status just because CI passes.
 * Check reproducible evidence for the long-term dynasty probability claim.
 *
 * node scripts/assess_dynasty_validation.js --out /tmp/fig-readiness.json
 */
const fs=require('node:fs'),path=require('node:path');
const player=require('./backtest_dynasty_players');
const team=require('./backtest_dynasty_franchise');
const DATA=path.resolve(__dirname,'../data');
const load=f=>JSON.parse(fs.readFileSync(path.join(DATA,f+'.json'),'utf8'));
function audit({marketHistory,nflHistory,roster,draft,franchiseSeasons,historicalAsof=null,nextSeason=null,turnoverStress=null}){
 const scoring=player.backtest({nflHistory,roster,draft});
 const franchise=team.backtest(franchiseSeasons);
 const snapshots=marketHistory?.snapshots||[];
 const historical=snapshots.filter(s=>typeof s.date==='string'&&s.date<'2026-01-01');
 const earliest=snapshots.map(s=>s.date).sort()[0]||null;
 const asof=historicalAsof?.snapshots||[];
 const enoughAsof=asof.length===2&&asof.every(s=>s.teams?.length===10&&s.total_picks===120);
 const yearAhead=nextSeason?.outlooks?.map(x=>x.validation)||[];
 const passesOneYearBaseline=yearAhead.length===2&&yearAhead.every(x=>x.mae<=x.baseline_naive_mae);
 const intervalCoverage=yearAhead.length===2?yearAhead.map(x=>x.p10_p90_coverage_pct):[];
 const passesIntervalCoverage=intervalCoverage.length===2&&intervalCoverage.every(x=>x>=80);
 const turnoverCases=turnoverStress?.cases||[];
 const turnoverWinsBoth=turnoverCases.length===2&&turnoverCases.every(c=>
  c.comparison.neutral_turnover.mae<c.comparison.frozen_assets.mae&&
  c.comparison.neutral_turnover.predicted_leader===c.comparison.neutral_turnover.actual_leader);
 const verifiedPickReconciliation=historicalAsof?.reconciliation_2026?.checked===120&&
  historicalAsof?.reconciliation_2026?.matched===120;
 const gates=[
  {name:'No holdout leakage in NFL scoring forecasts',passed:true,
   evidence:'2023->2024 fitted only; 2024->2025 holdout'},
  {name:'Historical Week 7 full-roster and original draft-pick snapshots',passed:enoughAsof,
   evidence:asof.length+' 2024/2025 frozen roster-and-pick snapshots with 120 picks each'},
  {name:'Historical pick-transfer reconstruction reconciles 2026 ownership',passed:verifiedPickReconciliation,
   evidence:(historicalAsof?.reconciliation_2026?.matched||0)+'/120 current original-pick ownership records reproduced'},
  {name:'Frozen-roster next-year forecast beats simple roster baseline on both historical cutoffs',passed:passesOneYearBaseline,
   evidence:yearAhead.map(x=>x.forecast_year+': prototype '+x.mae+' vs baseline '+x.baseline_naive_mae+' PPG MAE').join('; ')||'No one-year holdouts'},
  {name:'Nominal 80% interval shows at least 80% empirical coverage at both historical cutoffs',passed:passesIntervalCoverage,
   evidence:yearAhead.map(x=>x.forecast_year+': '+x.p10_p90_coverage_pct+'% covered').join('; ')||'No interval evidence'},
  {name:'Neutral turnover transfers improve both historical forecast MAEs without misranking #1',passed:turnoverWinsBoth,
   evidence:turnoverCases.map(c=>c.asof_year+'->'+(c.asof_year+1)+': neutral '+c.comparison.neutral_turnover.mae+
    ', frozen '+c.comparison.frozen_assets.mae+', leader correct '+(c.comparison.neutral_turnover.predicted_leader===c.comparison.neutral_turnover.actual_leader)).join('; ')||'No turnover study'},
  {name:'Sufficient dated pre-2026 dynasty market snapshots',passed:historical.length>0,
   evidence:historical.length+' dated observations before 2026; earliest archive '+earliest},
  {name:'Independent sophomore rookie holdout cohort',passed:scoring.rookies.second_year_holdout_available,
   evidence:'Only the 2024 rookie class has a completed second year in the archive'},
  {name:'Full historical multi-season dynasty forecast with dated market priors',passed:false,
   evidence:'Real 2024/2025 rosters and pick owners reconstructed, but historical date-correct asset prices and full multi-season outcome calibration are missing'},
  {name:'Validated six-year #1 probability calibration',passed:false,
   evidence:'Not enough elapsed future seasons to compare 2027–2032 probabilities against outcomes'}
 ];
 return {
  version:'research-readiness-v1',
  scope:'experimental dynasty strength forecast; no public calibrated probabilities',
  status:gates.every(x=>x.passed)?'READY_FOR_REVIEW':'NOT_READY_FOR_VALIDATED_ODDS',
  public_probability_claims_allowed:false,
  historical_player_holdout:scoring.holdout,
  rookie_holdout:scoring.rookies.holdout,
  historical_franchise_holdout:franchise.holdout,
  next_season_backtest:yearAhead.map(x=>({forecast_year:x.forecast_year,mae:x.mae,baseline_mae:x.baseline_naive_mae,coverage_pct:x.p10_p90_coverage_pct,retained_pct:x.mean_roster_retained_pct})),
  turnover_sensitivity:turnoverCases.map(c=>({year:c.asof_year+1,neutral_mae:c.comparison.neutral_turnover.mae,
   frozen_mae:c.comparison.frozen_assets.mae,predicted_leader:c.comparison.neutral_turnover.predicted_leader,
   actual_leader:c.comparison.neutral_turnover.actual_leader})), 
  gates,
  next_work:[
   'Use the verified 2024/2025 frozen rosters and 120 original-pick ledgers to attempt a leakage-free one-year fantasy scoring model with no future asset prices.',
   'Source date-correct historical market priors rather than backfilling 2026 RosterAudit value into older seasons.',
   'Fix frozen-roster forecast scoring calibration and interval coverage; it currently fails both one-year baseline comparisons.',
   'Do not promote neutral fantasy-player exchanges: the 2026 holdout worsens scoring MAE and misses the top team.',
   'Test year-ahead player role and injury persistence with full 17-week points, not just healthy played-game averages.',
   'Use an entirely held-out second-year rookie class when future seasons complete.',
   'Keep six-year league-rank probabilities clearly experimental; do not treat CI passage as statistical calibration.'
  ]
 };
}
function main(argv){
 let out='',asofPath='',nextSeasonPath='',turnoverPath='';
 for(let i=0;i<argv.length;i++){
  if(argv[i]==='--out')out=argv[++i];
  else if(argv[i]==='--asof')asofPath=argv[++i];
  else if(argv[i]==='--next-season')nextSeasonPath=argv[++i];
  else if(argv[i]==='--turnover')turnoverPath=argv[++i];
  else throw Error('Unknown option '+argv[i]);
 }
 const historicalAsof=asofPath?JSON.parse(fs.readFileSync(asofPath,'utf8')):null;
 const nextSeason=nextSeasonPath?JSON.parse(fs.readFileSync(nextSeasonPath,'utf8')):null;
 const turnoverStress=turnoverPath?JSON.parse(fs.readFileSync(turnoverPath,'utf8')):null;
 const r=audit({marketHistory:load('dynasty_market_history'),nflHistory:load('dynasty_nfl_history'),
  roster:load('current_roster'),draft:load('draft_picks'),franchiseSeasons:load('team_season_master'),historicalAsof,nextSeason,turnoverStress});
 if(out)fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');
 console.log('FIG research readiness:',r.status);
 for(const g of r.gates)console.log(g.passed?'PASS':'BLOCK',g.name,':',g.evidence);
}
if(require.main===module)main(process.argv.slice(2));
module.exports={audit};
