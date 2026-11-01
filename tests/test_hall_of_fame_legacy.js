'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'data',p+'.json'),'utf8'));
const win={figHallOfFame:async()=>{}};
new Function('window',fs.readFileSync(path.join(root,'hall-of-fame-legacy-v245.js'),'utf8'))(win);
const api=win.figHallLegacy;
const m=api.calculate({league:read('league_history'),playerSeasons:read('player_seasons'),playerLog:read('player_game_log')});
assert.equal(api.THRESHOLD,300);assert.equal(api.MIN_STARTS,8);
assert.equal(m.all.length,386);assert.equal(m.watch.length,36);
assert.equal(m.season,5825);assert.equal(m.games,1401);
assert.ok(m.ratio>.805&&m.ratio<.807);
assert.equal(m.eligible.length,0);
const totals=[['7564',287],['4034',283],['4984',271],['9493',242.5],
 ['8130',208],['6786',203.5],['9221',185.5],['9488',150],['11604',152]];
for(const [id,total] of totals)assert.equal(m.all.find(p=>p.id===id)?.total,total,id);
assert.deepEqual(m.watch.filter(p=>p.founder).map(p=>p.id),['4984','9493']);
assert.equal(m.all.find(p=>p.id==='9221').current.pending,175);
assert.equal(m.all.find(p=>p.id==='9488').current.pending,175);
assert.equal(m.all.find(p=>p.id==='4984').current.pending,140);
assert.equal(api.gamePoints('QB',25).points,0);
assert.equal(api.gamePoints('QB',30).points,.5);
assert.equal(api.gamePoints('QB',40).points,2);
assert.equal(api.seasonPoints('RB',31.79),175);
assert.equal(api.seasonPoints('WR',31.44),175);
assert.equal(api.seasonPoints('WR',23.999),75);
assert.equal(api.seasonPoints('WR',24),110);
for(const id of ['12527','12526','9228','8138','8183'])
 assert.ok(m.watch.some(p=>p.id===id),'Retain commissioner selection '+id);
for(const n of ['Tyreek Hill','Derrick Henry','Travis Kelce'])
 assert.ok(!m.watch.some(p=>p.name===n)&&m.all.some(p=>p.name===n));
for(const p of m.all)assert.equal(p.total,+(p.season+p.games).toFixed(1));
console.log('FIG Legacy verified: ',m.all.length,'players,',m.watch.length,
 'watched; seasonal',m.season,'game',m.games,'share',m.ratio.toFixed(4));
