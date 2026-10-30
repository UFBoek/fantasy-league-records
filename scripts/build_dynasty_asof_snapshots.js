'use strict';
/* Reconstruct historical week-7 rosters and rookie-pick ownership using only
   transactions/weekly rosters known at the cutoff. Never use 2026 market
   prices as if they existed in 2024 or 2025.
   node scripts/build_dynasty_asof_snapshots.js --out /tmp/asof.json
*/
const fs=require('node:fs'),path=require('node:path');
const data=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',f+'.json'),'utf8'));
const IDS=Array.from({length:10},(_,i)=>i+1),POSITIONS=new Set(['QB','RB','WR','TE']);
const average=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const round=x=>Number(x.toFixed(2)),K=(year,r,origin)=>[year,r,origin].join(':');
function replayPicks(transactions,year,week=7){
 const ledger=new Map(),warnings=[],seenTransactions=new Set();
 for(let draft=year+1;draft<=year+3;draft++)
  for(let r=1;r<=4;r++)for(const orig of IDS)ledger.set(K(draft,r,orig),orig);
 const eligible=transactions.filter(t=>t.transaction_type==='trade'&&t.status==='complete'&&
  (+t.season<year||(+t.season===year&&+t.week<=week)))
 .sort((a,b)=>(+a.status_updated_timestamp||+a.created_timestamp||0)-(+b.status_updated_timestamp||+b.created_timestamp||0)||
 String(a.transaction_id).localeCompare(String(b.transaction_id)));
 for(const t of eligible){
  const tid=String(t.transaction_id);
  if(seenTransactions.has(tid))continue;
  seenTransactions.add(tid);
  for(const x of t.draft_picks||[]){
   const k=K(+x.season,+x.round,+x.roster_id);
   if(!ledger.has(k))continue;
   const prev=+x.previous_owner_id,now=+x.owner_id,had=ledger.get(k);
   if(!IDS.includes(prev)||!IDS.includes(now)){
    warnings.push({type:'invalid_owner',transaction:tid,pick:k,previous:prev,new:now});
    continue;
   }
   if(prev!==had)warnings.push({type:'chain_gap',transaction:tid,pick:k,expected:had,actual_previous:prev,new:now});
   ledger.set(k,now);
  }
 }
 const picks=[...ledger].map(([k,owner])=>{
  const [year,round,origin]=k.split(':').map(Number);
  return {year,round,origin,owner,chain_warning:warnings.some(w=>w.pick===k)};
 });
 return {picks,warnings,trades_seen:eligible.length};
}
function pointsToDate(history,pid,year,cutoff=7){
 const current=history.seasons[String(year)]?.players[String(pid)]?.weekly||[];
 const prior=history.seasons[String(year-1)]?.players[String(pid)]?.weekly||[];
 return {ppg:average(Array.from({length:cutoff},(_,i)=>{
  const hit=current.find(([week])=>week===i+1);return hit?+hit[1]:0;
 })),past_ppg:prior.reduce((s,[,v])=>s+(+v||0),0)/17,
  games:current.filter(([w])=>+w<=cutoff).length};
}
function legalLineup(players,field){
 const groups={QB:[],RB:[],WR:[],TE:[]};
 for(const p of players)if(groups[p.pos])groups[p.pos].push(Math.max(0,+p[field]||0));
 for(const a of Object.values(groups))a.sort((x,y)=>y-x);
 function take(k,n){let s=0;for(let i=0;i<n;i++)s+=groups[k].shift()||0;return s;}
 const required=take('QB',1)+take('RB',2)+take('WR',3)+take('TE',1);
 const flex=[...groups.RB,...groups.WR,...groups.TE].sort((a,b)=>b-a);
 return required+(flex.shift()||0)+(flex.shift()||0)+Math.max(groups.QB[0]||0,flex[0]||0);
}
function build({weeklyRosters,transactions,nflHistory,weeklyScores},seasons=[2024,2025],cutoff=7){
 if(!Array.isArray(weeklyRosters)||!weeklyRosters.length||!Array.isArray(transactions)||!nflHistory?.seasons)throw Error('Missing archive input');
 const output=[];
 for(const year of seasons){
  const pickLedger=replayPicks(transactions,year,cutoff);
  const current=weeklyRosters.filter(r=>+r.season===year&&+r.week===cutoff);
  const teams=[],unknownPosition=[];
  for(const id of IDS){
   const roster=current.filter(r=>+r.franchise_id===id),seen=new Set(),players=[];
   if(roster.length<10||roster.length>55)throw Error('Roster size invalid '+year+' F'+id+' '+roster.length);
   for(const row of roster){
    const pid=String(row.player_id||''),pos=String(row.position||row.current_position||'');
    if(!pid||pid==='0'||seen.has(pid))throw Error('Duplicate/invalid roster player '+year+' F'+id+'/'+pid);
    seen.add(pid);
    if(!POSITIONS.has(pos)){unknownPosition.push({franchise:id,id:pid,pos});continue;}
    const scores=pointsToDate(nflHistory,pid,year,cutoff);
    players.push({id:pid,pos,name:row.player_name||row.full_name||'',
     starter:row.starter_status==='Starter',ppg:round(scores.ppg),
     past_ppg:round(scores.past_ppg),games:scores.games});
   }
   const official=weeklyScores.filter(r=>+r.season===year&&+r.franchise_id===id&&+r.week>cutoff&&+r.week<=14);
   if(official.length!==14-cutoff)throw Error('Missing future weekly score '+year+' F'+id);
   const owned=pickLedger.picks.filter(x=>x.owner===id);
   teams.push({id,roster_count:roster.length,players,picks:owned,
    baseline_ppg:round(legalLineup(players,'ppg')),
    previous_season_blend_ppg:round(legalLineup(players.map(p=>({...p,blend:.7*p.ppg+.3*p.past_ppg})),'blend')),
    future_actual_team_ppg:round(average(official.map(r=>+r.points_for)))});
  }
  const mae=field=>round(average(teams.map(t=>Math.abs(t[field]-t.future_actual_team_ppg))));
  const leader=field=>teams.slice().sort((a,b)=>b[field]-a[field])[0].id;
  output.push({year,cutoff,pick_ledger_warnings:pickLedger.warnings,trade_transactions_seen:pickLedger.trades_seen,
   unknown_positions:unknownPosition,total_picks:teams.reduce((s,t)=>s+t.picks.length,0),
   total_rostered_players:teams.reduce((s,t)=>s+t.roster_count,0),
   mae_same_season:mae('baseline_ppg'),mae_prior_blend:mae('previous_season_blend_ppg'),
   predicted_leader:leader('baseline_ppg'),actual_later_leader:leader('future_actual_team_ppg'),teams});
 }
 return {version:'historical-asof-v1',status:'PARTIAL_HISTORICAL_RECONSTRUCTION',snapshots:output,
  limitations:[
   'Player baselines only use NFL games through week 7 and previous completed seasons, both standardized to FIG 2026 fantasy scoring.',
   'Observed subsequent team PPG uses historical league scoring and real roster moves; these are NOT matched scoring systems or frozen-roster outcomes.',
   'Pick ledger uses transaction timestamps/week numbers and preserves warnings on inconsistent previous owner chains.',
   'No 2026 RosterAudit prices are backfilled to historic dates.',
   'This compares short-horizon scoring forecasts, not calibrated six-year dynasty rank probabilities.'
  ]};
}
function main(argv){
 let out='';
 for(let i=0;i<argv.length;i++)if(argv[i]==='--out')out=argv[++i];else throw Error('Unknown '+argv[i]);
 const input={weeklyRosters:data('weekly_full_rosters'),transactions:data('transactions'),
  nflHistory:data('dynasty_nfl_history'),weeklyScores:data('weekly_scoring_ranks')};
 const result=build(input);
 const current=data('current_future_picks');
 const comparison=replayPicks(input.transactions,2026,7);
 const expected=new Map(current.filter(x=>+x.pick_season>=2027&&+x.pick_season<=2029)
  .map(x=>[K(+x.pick_season,+x.round,+x.original_franchise_id),+x.current_franchise_id]));
 const mismatches=comparison.picks.filter(p=>expected.get(K(p.year,p.round,p.origin))!==p.owner);
 result.reconciliation_2026={checked:comparison.picks.length,expected:expected.size,
  matched:comparison.picks.length-mismatches.length,
  chain_warnings:comparison.warnings.length,
  mismatches:mismatches.map(x=>({...x,expected:expected.get(K(x.year,x.round,x.origin))}))};
 if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 for(const s of result.snapshots)console.log('ASOF',s.year,'Week',s.cutoff,
  'rostered',s.total_rostered_players,'picks',s.total_picks,'pick chain warnings',s.pick_ledger_warnings.length,
  'unknown position',s.unknown_positions.length,
  'mae current',s.mae_same_season,'mae blend',s.mae_prior_blend,
  'leader predicted',s.predicted_leader,'actual',s.actual_later_leader);
}
if(require.main===module)main(process.argv.slice(2));
module.exports={replayPicks,pointsToDate,legalLineup,build};
