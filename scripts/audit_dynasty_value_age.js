'use strict';
/* Diagnostic only; current RosterAudit prices have observed part of 2026.
 * Do NOT call this cross-sectional fit an out-of-time historical validation.
 */
const fs=require('node:fs'),path=require('node:path');
const model=require('./dynasty_dominance_model');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',n+'.json'),'utf8'));
const round=x=>Number(x.toFixed(2));
const AVG=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
const PRIOR={QB:[3,10,800,35],RB:[1,9,1800,27],WR:[1,9,1600,29],TE:[1,8,1600,25]};
function oldPpg(pos,v){
 const f=PRIOR[pos];return Math.max(.2,Math.min(f[3],f[0]+f[1]*Math.log1p(Math.max(0,v)/f[2])));
}
function scoreCheck(roster,values,nfl){
 const weeks=Object.values(nfl.weeks).slice(0,nfl.through_week);
 const rows=roster.filter(p=>PRIOR[p.position]&&values.players?.[String(p.player_id)]?.value!=null).map(p=>{
  const v=+values.players[String(p.player_id)].value||0;
  const actual=AVG(weeks.map(w=>+w[String(p.player_id)]||0));
  return {pos:p.position,actual,previous:oldPpg(p.position,v),value_anchor:model.marketPpg(p.position,v),value:v};
 });
 const result={total:rows.length,by_position:{}};
 for(const pos of Object.keys(PRIOR)){
  const group=rows.filter(p=>p.pos===pos);
  const high=group.filter(p=>p.value>=2000);
  const mae=(group,k)=>round(AVG(group.map(p=>Math.abs(p[k]-p.actual))));
  result.by_position[pos]={n:group.length,n_valuable:high.length,
   previous_mae:mae(group,'previous'),revised_mae:mae(group,'value_anchor'),
   prior_high_value_mae:mae(high,'previous'),revised_high_value_mae:mae(high,'value_anchor')};
 }
 result.all_mae=round(AVG(rows.map(p=>Math.abs(p.value_anchor-p.actual))));
 result.old_all_mae=round(AVG(rows.map(p=>Math.abs(p.previous-p.actual))));
 return result;
}
function measure({runs=300,seed=1919}={}){
 const input={roster:read('current_roster'),values:read('rosteraudit_values'),
  logs:read('player_game_log'),weekly:read('weekly_scoring_ranks'),picks:read('current_future_picks'),
  nflCurrent:read('playoff_nfl_weekly_scores'),nflHistory:read('dynasty_nfl_history'),drafts:read('draft_picks')};
 const diagnostic=scoreCheck(input.roster,input.values,input.nflCurrent);
 const variants={
  productionOnly:model.runModel({...input,runs,seed,scenario:{valuationBlendStrength:0}}),
  valueAndAge:model.runModel({...input,runs,seed,scenario:{valuationBlendStrength:1}})
 };
 const years=variants.valueAndAge.years;
 const future=years.map(year=>{
  const team=id=>{
   const score=m=>m.seasons[year].ranking.find(t=>t.id===id);
   return {id,productionOnly:score(variants.productionOnly).ppg,
    valueAndAge:score(variants.valueAndAge).ppg,
    change:round(score(variants.valueAndAge).ppg-score(variants.productionOnly).ppg)};
  };
  const n=variants.valueAndAge.seasons[year].ranking;
  return {year,topChallenger:n.filter(t=>t.id!==1)[0]?.name,boek:team(1),hayden:team(6),camnol:team(9)};
 });
 return {sample_scope:'2026 same-date market vs scoring (NOT a future or out-of-sample forecast)',
  current_cross_section:diagnostic,
  future_sensitivity:future,
  parameter:'valuationBlendStrength 0 versus 1 with identical RNG seeds',
  warning:'Changing this experimental model cannot establish reliable future league champion odds; retrospective RosterAudit dates before 2026 are missing.'};
}
function main(args){
 let runs=300;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--runs')runs=+args[++i];else throw Error('Unknown '+args[i]);
 }
 const r=measure({runs});
 console.log('VALUE_AGE_CROSS_SECTION',JSON.stringify(r.current_cross_section));
 for(const a of r.future_sensitivity)console.log('VALUE_AGE_FUTURE',JSON.stringify(a));
 console.log('CAVEAT',r.warning);
}
if(require.main===module)main(process.argv.slice(2));
module.exports={scoreCheck,measure};
