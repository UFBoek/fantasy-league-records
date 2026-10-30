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
function audit({marketHistory,nflHistory,roster,draft,franchiseSeasons,historicalAsof=null}){
 const scoring=player.backtest({nflHistory,roster,draft});
 const franchise=team.backtest(franchiseSeasons);
 const snapshots=marketHistory?.snapshots||[];
 const historical=snapshots.filter(s=>typeof s.date==='string'&&s.date<'2026-01-01');
 const earliest=snapshots.map(s=>s.date).sort()[0]||null;
 const asof=historicalAsof?.snapshots||[];
 const enoughAsof=asof.length===2&&asof.every(s=>s.teams?.length===10&&s.total_picks===120);
 const verifiedPickReconciliation=historicalAsof?.reconciliation_2026?.checked===120&&
  historicalAsof?.reconciliation_2026?.matched===120;
 const gates=[
  {name:'No holdout leakage in NFL scoring forecasts',passed:true,
   evidence:'2023->2024 fitted only; 2024->2025 holdout'},
  {name:'Historical Week 7 full-roster and original draft-pick snapshots',passed:enoughAsof,
   evidence:asof.length+' 2024/2025 frozen roster-and-pick snapshots with 120 picks each'},
  {name:'Historical pick-transfer reconstruction reconciles 2026 ownership',passed:verifiedPickReconciliation,
   evidence:(historicalAsof?.reconciliation_2026?.matched||0)+'/120 current original-pick ownership records reproduced'},
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
  gates,
  next_work:[
   'Use the verified 2024/2025 frozen rosters and 120 original-pick ledgers to attempt a leakage-free one-year fantasy scoring model with no future asset prices.',
   'Source date-correct historical market priors rather than backfilling 2026 RosterAudit value into older seasons.',
   'Test year-ahead player role and injury persistence with full 17-week points, not just healthy played-game averages.',
   'Use an entirely held-out second-year rookie class when future seasons complete.',
   'Keep six-year league-rank probabilities clearly experimental; do not treat CI passage as statistical calibration.'
  ]
 };
}
function main(argv){
 let out='',asofPath='';
 for(let i=0;i<argv.length;i++){
  if(argv[i]==='--out')out=argv[++i];
  else if(argv[i]==='--asof')asofPath=argv[++i];
  else throw Error('Unknown option '+argv[i]);
 }
 const historicalAsof=asofPath?JSON.parse(fs.readFileSync(asofPath,'utf8')):null;
 const r=audit({marketHistory:load('dynasty_market_history'),nflHistory:load('dynasty_nfl_history'),
  roster:load('current_roster'),draft:load('draft_picks'),franchiseSeasons:load('team_season_master'),historicalAsof});
 if(out)fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');
 console.log('FIG research readiness:',r.status);
 for(const g of r.gates)console.log(g.passed?'PASS':'BLOCK',g.name,':',g.evidence);
}
if(require.main===module)main(process.argv.slice(2));
module.exports={audit};
