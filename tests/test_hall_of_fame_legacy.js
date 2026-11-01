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
assert.equal(m.season,5825);assert.equal(m.games,2513);
assert.ok(m.ratio>.698&&m.ratio<.700);
assert.deepEqual(m.eligible.map(p=>p.name),["Ja'Marr Chase",'Christian McCaffrey','Josh Allen']);
const totals=[['7564',326],['4034',305],['4984',304],['9493',269],
 ['8130',228],['6786',224],['9221',219],['9488',169],['11604',172]];
for(const [id,total] of totals)assert.equal(m.all.find(p=>p.id===id)?.total,total,id);
assert.deepEqual(m.watch.filter(p=>p.founder).map(p=>p.id),['4984','9493']);
assert.equal(m.all.find(p=>p.id==='9221').current.pending,175);
assert.equal(m.all.find(p=>p.id==='9488').current.pending,175);
assert.equal(m.all.find(p=>p.id==='4984').current.pending,140);
assert.equal(api.gamePoints('QB',25).points,0);
assert.equal(api.gamePoints('QB',30).points,1);
assert.equal(api.gamePoints('QB',40).points,3);
assert.equal(api.seasonPoints('RB',31.79),175);
assert.equal(api.seasonPoints('WR',31.44),175);
assert.equal(api.seasonPoints('WR',23.999),75);
assert.equal(api.seasonPoints('WR',24),110);
for(const id of ['12527','12526','9228','8138','8183'])
 assert.ok(m.watch.some(p=>p.id===id),'Retain commissioner selection '+id);
for(const n of ['Tyreek Hill','Derrick Henry','Travis Kelce'])
 assert.ok(!m.watch.some(p=>p.name===n)&&m.all.some(p=>p.name===n));
for(const p of m.all)assert.equal(p.total,+(p.season+p.games).toFixed(1));

const positions=['QB','RB','WR','TE'];
const counts=Object.fromEntries(positions.map(p=>[p,{games:0,points:0}]));
for(const x of read('player_game_log')){
 const entry=counts[x.position];
 if(!entry)continue;
 entry.games++;entry.points+=api.gamePoints(x.position,Number(x.starter_points)).points;
}
for(const p of positions){
 const rate=counts[p].points/counts[p].games;
 assert.ok(rate>.475&&rate<.485,'Historically balanced game points for '+p+': '+rate);
}
assert.deepEqual(api.GAMES,[[20,0,1,1,2],[30,1,2,3,7],[40,3,7,6,14],[50,7,14,14,24],[60,20,25,25,35]]);
const html=fs.readFileSync(path.join(root,'hall-of-fame-legacy-v245.js'),'utf8');
assert.match(html,/class="hoflp-season-card"/);
assert.match(html,/class="hoflp-game-counts"/);
assert.doesNotMatch(html,/<table><thead><tr><th>YEAR<\/th>/);
const css=fs.readFileSync(path.join(root,'hall-of-fame-legacy-v245.css'),'utf8');
assert.match(css,/\.hoflp-detail-body\{/);
assert.match(css,/overflow-x:hidden/);
assert.doesNotMatch(css,/\.hoflp-detail-scroll\{/);

console.log('FIG Legacy verified: ',m.all.length,'players,',m.watch.length,
 'watched; seasonal',m.season,'game',m.games,'share',m.ratio.toFixed(4));
