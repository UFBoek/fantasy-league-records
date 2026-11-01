'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'data',p+'.json'),'utf8'));
const win={figHallOfFame:async()=>{}};
new Function('window',fs.readFileSync(path.join(root,'hall-of-fame-legacy-v245.js'),'utf8'))(win);
const api=win.figHallLegacy;
const m=api.calculate({league:read('league_history'),playerSeasons:read('player_seasons'),playerLog:read('player_game_log')});
assert.equal(api.THRESHOLD,350);assert.equal(api.MIN_STARTS,8);
assert.equal(m.all.length,386);assert.equal(m.watch.length,36);
assert.equal(m.season,5825);assert.equal(m.games,2513);
assert.ok(m.ratio>.698&&m.ratio<.700);
assert.equal(m.eligible.length,0,'No player has reached 350 earned points yet');
assert.equal(m.all[0].name,'Josh Allen');
assert.equal(m.all[0].remaining,16);
assert.ok(m.all.every(p=>p.eligible===(p.total>=350)));
const totals=[['4984',334],['4034',325],['7564',301],['9493',269],
 ['8130',248],['6786',184],['9221',234],['9488',144],['11604',187]];
for(const [id,total] of totals)assert.equal(m.all.find(p=>p.id===id)?.total,total,id);
assert.deepEqual(m.watch.filter(p=>p.founder).map(p=>p.id),['4984','9493']);
assert.equal(m.all.find(p=>p.id==='9221').current.pending,190);
assert.equal(m.all.find(p=>p.id==='9488').current.pending,190);
assert.equal(m.all.find(p=>p.id==='4984').current.pending,150);
assert.equal(api.gamePoints('QB',25).points,0);
assert.equal(api.gamePoints('QB',30).points,1);
assert.equal(api.gamePoints('QB',40).points,3);
assert.equal(api.seasonPoints('RB',31.79),190);
assert.equal(api.seasonPoints('WR',31.44),190);
assert.equal(api.seasonPoints('WR',23.999),85);
assert.equal(api.seasonPoints('WR',24),85);
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


const oldSeasonTiers=[[15,25,16,14.5,13.5],[30,26.5,18.5,17.5,15],
 [50,28.5,19.5,19,16],[75,29.5,22.5,21,17],
 [110,32,26,24,18.5],[140,34.5,28,27,20.5],
 [175,37.5,30,30,22.5],[215,41,33,33,25]];
const completed=read('player_seasons').filter(x=>x.scoring_view==='All-Time Combined'
 &&x.season_complete&&x.starts>=8&&['RB','WR'].includes(x.position));
function rankedAverage(position,tiers,k){
 let sum=0;
 for(const year of ['2023','2024','2025']){
  const ranked=completed.filter(x=>x.season===year&&x.position===position)
   .sort((a,b)=>b.total_points/b.starts-a.total_points/a.starts).slice(0,k);
  assert.equal(ranked.length,k);
  for(const row of ranked){let pt=0,ppg=row.total_points/row.starts;
   for(const tier of tiers)if(ppg>=tier[position==='RB'?2:3])pt=tier[0];
   sum+=pt;
  }
 }
 return sum/(k*3);
}
const before=rankedAverage('WR',oldSeasonTiers,10)-rankedAverage('RB',oldSeasonTiers,10);
const after=rankedAverage('WR',api.SEASONS,10)-rankedAverage('RB',api.SEASONS,10);
assert.ok(Math.abs(after)<=5,'Top-10 comparable players earn similar points');
assert.ok(Math.abs(after)<Math.abs(before)*0.4,'Improve rank-calibrated fairness');
assert.deepEqual(api.SEASONS.map(x=>x[0]),[15,35,55,85,120,150,190,230]);
assert.deepEqual(api.SEASONS.map(x=>x[3]),[15.5,18.5,19.5,21.5,25,27.5,30,33]);
assert.equal(api.seasonPoints('WR',15.49),0);
assert.equal(api.seasonPoints('WR',15.5),15);
assert.equal(api.seasonPoints('RB',15.5),0);
assert.equal(api.seasonPoints('WR',25),120);

console.log('FIG Legacy verified: ',m.all.length,'players,',m.watch.length,
 'watched; seasonal',m.season,'game',m.games,'share',m.ratio.toFixed(4));
