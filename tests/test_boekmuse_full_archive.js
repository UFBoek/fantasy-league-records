'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../workers/boekmuse-v2/src/index.js'),'utf8');
const api=new Function(src.replace('export default {','const handler = {')+
 '\nreturn {archiveDatasetNames,createArchiveChunks,sqlClean,SCHEMA};')();
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/manifest.json'),'utf8'));
const expected=api.archiveDatasetNames(manifest);
assert.ok(expected.length>=60,'Must include all named archive sources plus advanced derived data');
for(const name of ['weekly_full_rosters','dynasty_dominance_projection','dynasty_market_history',
 'current_future_picks','current_roster','injury_history','trade_assets','transactions',
 'player_weekly_touchdowns','records','all_play_seasons','waiver_fa','rosteraudit_values']){
 assert.ok(expected.includes(name),'Missing league dataset: '+name);
}
const original=Array.from({length:50},(_,i)=>({season:2026,week:i%14+1,franchise_id:i%10+1,
 player_id:String(i),points:10+i,nested:{field:['QB','WR'][i%2]}}));
const data=api.createArchiveChunks('weekly_full_rosters',original);
assert.equal(data.catalog[0][3],original.length);
assert.deepEqual(data.chunks.flatMap(row=>JSON.parse(row[4])),original,'All original row fields must survive packing');
const keyed={updated_at:'2026-10-30',players:{'123':{projection:30,age:32},'456':{projection:17,age:22}},
 observations:[{season:2026,team_id:1,mean:202},{season:2027,team_id:1,mean:215}]};
const nested=api.createArchiveChunks('dynasty_projection',keyed);
assert.deepEqual(nested.chunks.map(x=>x[1]).sort(),['__meta__','observations','players']);
assert.deepEqual(JSON.parse(nested.chunks.find(x=>x[1]==='players')[4]),keyed.players);
assert.deepEqual(JSON.parse(nested.chunks.find(x=>x[1]==='observations')[4]),keyed.observations);
assert.equal(JSON.parse(nested.chunks.find(x=>x[1]==='__meta__')[4]).updated_at,keyed.updated_at);
const huge=api.createArchiveChunks('large',Array.from({length:200},(_,i)=>({i,text:'x'.repeat(800)})));
assert.ok(huge.chunks.length>1,'Large arrays must split into query-sized SQLite chunks');
assert.deepEqual(huge.chunks.flatMap(x=>JSON.parse(x[4])),Array.from({length:200},(_,i)=>({i,text:'x'.repeat(800)})));
assert.doesNotThrow(()=>api.sqlClean("SELECT json_extract(j.value, '$.season') FROM archive_chunks c JOIN json_each(c.payload) j WHERE c.dataset='current_roster'"));
assert.throws(()=>api.sqlClean('SELECT * FROM archive_source_meta JOIN games'),/Internal tables/);
assert.throws(()=>api.sqlClean('DROP TABLE archive_chunks_all'),/Only SELECT/);
assert.match(api.SCHEMA,/live snapshots/);
console.log('BoekMuse published archive coverage, nested fidelity, chunking and SQL restrictions passed');
