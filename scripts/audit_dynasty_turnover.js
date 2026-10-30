'use strict';
/* Historical FIG roster turnover audit. No manager skill scores and no
 * predictions are trained on future years. The 2023->2024 cohort is available
 * by the 2024 Week-7 cutoff; 2024->2025 by the 2025 Week-7 cutoff.
 *
 * node scripts/audit_dynasty_turnover.js --out /tmp/fig-turnover.json
 */
const fs=require('node:fs'),path=require('node:path');
const {build}=require('./build_dynasty_asof_snapshots');
const read=n=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',n+'.json'),'utf8'));
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const round=(x,d=3)=>Number(x.toFixed(d));
const IDS=Array.from({length:10},(_,i)=>i+1);
function weeklyMembership(rows,year,week=7){
 const m=Object.fromEntries(IDS.map(id=>[id,new Set()]));
 for(const r of rows)if(+r.season===year&&+r.week===week&&m[+r.franchise_id])
   m[+r.franchise_id].add(String(r.player_id));
 return m;
}
function audit({weeklyRosters,transactions,nflHistory,weeklyScores}){
 const src={weeklyRosters,transactions,nflHistory,weeklyScores};
 const snapshots=build(src,[2023,2024,2025],7).snapshots;
 const next=Object.fromEntries([2024,2025,2026].map(y=>[y,weeklyMembership(weeklyRosters,y,7)]));
 const transitions=[];
 for(const snap of snapshots){
  const follow=next[snap.year+1],rows=[];
  for(const team of snap.teams){
   const now=follow[team.id],old=new Set(team.players.map(p=>p.id));
   const n=team.players.length,incumbents=[...old].filter(id=>now.has(id)).length;
   const starters=team.players.filter(p=>p.starter);
   const startersRetained=starters.filter(p=>now.has(p.id)).length;
   const bench=team.players.filter(p=>!p.starter),benchRetained=bench.filter(p=>now.has(p.id)).length;
   const rookiePicks=team.picks.filter(p=>p.year===snap.year+1).length;
   rows.push({id:team.id,roster_count:team.roster_count,eligible_players:n,
    retained:incumbents,retention:round(incumbents/n),
    starters:starters.length,starters_retained:startersRetained,
    starter_retention:round(startersRetained/Math.max(1,starters.length)),
    bench:bench.length,bench_retained:benchRetained,
    bench_retention:round(benchRetained/Math.max(1,bench.length)),
    new_players:[...now].filter(id=>!old.has(id)).length,
    next_roster_count:now.size,known_next_year_picks:rookiePicks,
    asof_baseline_ppg:team.baseline_ppg});
  }
  transitions.push({from_year:snap.year,to_year:snap.year+1,cutoff_week:7,
   teams:rows,rookie_picks_total:rows.reduce((s,r)=>s+r.known_next_year_picks,0),
   roster_retention_mean:round(avg(rows.map(r=>r.retention))),
   starter_retention:round(rows.reduce((s,r)=>s+r.starters_retained,0)/
    rows.reduce((s,r)=>s+r.starters,0)),
   bench_retention:round(rows.reduce((s,r)=>s+r.bench_retained,0)/
    rows.reduce((s,r)=>s+r.bench,0)),
   observed_new_players:rows.reduce((s,r)=>s+r.new_players,0)});
 }
 return {version:'observed-turnover-v1',status:'HISTORICAL_FACTS_ONLY',
  transitions,
  available_training_cutoffs:{
   '2024-W7':['2023->2024'],
   '2025-W7':['2023->2024','2024->2025']},
  caveats:[
   'Retention measures identical Sleeper player IDs with same franchise between Week 7 snapshots, not every interim transaction.',
   'Player exits and acquisitions arise from trading, waivers, cuts, drafts and roster availability; causation is not identified.',
   'Starter status is from the original Week-7 lineup, not a player talent or manager-trading ability score.',
   '2025->2026 turnover is outcome-only, never used to predict 2026.',
   'Historical 2026 scoring is verified only through Week 7.',
   'No extrapolation of this turnover into a bonus for any named franchise is justified.'
  ]};
}
function main(args){
 let out='';
 for(let i=0;i<args.length;i++)if(args[i]==='--out')out=args[++i];else throw Error('Unknown argument '+args[i]);
 const result=audit({weeklyRosters:read('weekly_full_rosters'),
  transactions:read('transactions'),nflHistory:read('dynasty_nfl_history'),
  weeklyScores:read('weekly_scoring_ranks')});
 if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 for(const t of result.transitions){
  console.log('TURNOVER',t.from_year+'->'+t.to_year,'retention',t.roster_retention_mean,
   'starter_retention',t.starter_retention,'bench_retention',t.bench_retention,
   'new_players',t.observed_new_players,'rookie_picks',t.rookie_picks_total);
  console.log('TURNOVER_TEAMS',t.from_year,JSON.stringify(t.teams.map(x=>({
   id:x.id,retained:x.retention,starting:x.starter_retention,bench:x.bench_retention,
   new:x.new_players,picks:x.known_next_year_picks}))));
 }
}
if(require.main===module)main(process.argv.slice(2));
module.exports={audit,weeklyMembership};
