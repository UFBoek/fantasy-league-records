'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const model=require('../scripts/build_dynasty_asof_snapshots');
const load=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f+'.json'),'utf8'));
const input={weeklyRosters:load('weekly_full_rosters'),transactions:load('transactions'),
 nflHistory:load('dynasty_nfl_history'),weeklyScores:load('weekly_scoring_ranks')};
const result=model.build(input);
assert.equal(result.snapshots.length,2);
for(const snap of result.snapshots){
 assert.equal(snap.teams.length,10);
 assert.equal(snap.total_picks,120);
 assert.ok(snap.total_rostered_players>=250);
 const keys=new Set(snap.teams.flatMap(t=>t.picks.map(p=>[p.year,p.round,p.origin].join(':'))));
 assert.equal(keys.size,120,'Each original future draft slot belongs to exactly one franchise');
 assert.deepEqual([...new Set(snap.teams.flatMap(t=>t.picks.map(p=>p.year)))].sort(),
  [snap.year+1,snap.year+2,snap.year+3]);
 assert.ok(snap.teams.every(t=>t.players.length>=9));
 assert.ok(snap.teams.every(t=>t.baseline_ppg>=0&&t.baseline_ppg<350));
}
assert.ok(result.snapshots[0].teams.every(t=>t.players.every(p=>p.games<=7)));
const mockPositions=[
 {pos:'QB',ppg:30},{pos:'QB',ppg:20},{pos:'RB',ppg:12},{pos:'RB',ppg:9},
 {pos:'RB',ppg:6},{pos:'WR',ppg:16},{pos:'WR',ppg:15},{pos:'WR',ppg:14},
 {pos:'WR',ppg:8},{pos:'TE',ppg:11},{pos:'TE',ppg:7}
];
assert.equal(model.legalLineup(mockPositions,'ppg'),30+12+9+16+15+14+11+8+7+20);
for(const season of ['2024','2025']){
 const modifiedArchive={...input.nflHistory,seasons:{...input.nflHistory.seasons}};
 const old=modifiedArchive.seasons[season];
 modifiedArchive.seasons[season]={...old,players:{}};
 for(const [pid,record] of Object.entries(old.players)){
  modifiedArchive.seasons[season].players[pid]={...record,weekly:record.weekly.map(([w,pts])=>
   w>7?[w,pts+999]:[w,pts])};
 }
 const changed=model.build({...input,nflHistory:modifiedArchive});
 const idx=season==='2024'?0:1;
 assert.deepEqual(result.snapshots[idx].teams.map(t=>t.baseline_ppg),
   changed.snapshots[idx].teams.map(t=>t.baseline_ppg),
   'Changing data after Week 7 must not affect same-season baseline');
}
// A fabricated Week 8 trade cannot change the end-of-Week-7 pick ledger.
const late={season:'2024',week:8,transaction_id:'time-leak-test',
 transaction_type:'trade',status:'complete',status_updated_timestamp:9999999999999,
 draft_picks:[{season:'2025',round:1,roster_id:1,previous_owner_id:1,owner_id:2}]};
const original=model.replayPicks(input.transactions,2024,7);
const withLate=model.replayPicks([...input.transactions,late],2024,7);
assert.deepEqual(withLate,original);
const fakeSnapshot=model.build({...input,transactions:[...input.transactions,late]});
assert.deepEqual(fakeSnapshot.snapshots[0].teams.map(x=>x.picks),
 result.snapshots[0].teams.map(x=>x.picks));
assert.throws(()=>model.build({...input,weeklyRosters:input.weeklyRosters.filter(x=>+x.season!==2024)}),/Roster size invalid/);
console.log('Historical as-of rosters, 120 picks, 2025 holdout, and time-cutoff leakage tests passed');
