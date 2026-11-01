'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'data',p+'.json'),'utf8'));
const win={figHallOfFame:async()=>{}};
new Function('window',fs.readFileSync(path.join(root,'hall-of-fame-legacy-v245.js'),'utf8'))(win);
const api=win.figHallLegacy;
const m=api.calculate({league:read('league_history'),playerSeasons:read('player_seasons'),playerLog:read('player_game_log')});
assert.equal(api.THRESHOLD,450);assert.equal(api.MIN_STARTS,8);
assert.equal(m.all.length,386);assert.equal(m.watch.length,36);
assert.equal(m.season,7640);assert.equal(m.games,5085);
assert.ok(m.ratio>.599&&m.ratio<.601,'Target aggregate 60/40 season/game');
assert.deepEqual(m.eligible.map(p=>p.name),['Josh Allen']);
assert.equal(m.all[0].name,'Josh Allen');
assert.equal(m.all[0].remaining,0);
assert.equal(m.all.find(p=>p.id==='7564').remaining,78);
assert.equal(m.all.find(p=>p.id==='4034').remaining,84);
assert.equal(m.all.find(p=>p.id==='9493').remaining,115);
assert.ok(m.all.every(p=>p.eligible===(p.total>=450)));
const totals=[['4984',456],['4034',366],['7564',372],['9493',335],
 ['8130',278],['6786',262],['9221',317],['9488',203],['11604',231]];
for(const [id,total] of totals)assert.equal(m.all.find(p=>p.id===id)?.total,total,id);
assert.deepEqual(m.watch.filter(p=>p.founder).map(p=>p.id),['4984','9493']);
assert.equal(m.all.find(p=>p.id==='9221').current.pending,175);
assert.equal(m.all.find(p=>p.id==='9488').current.pending,175);
assert.equal(m.all.find(p=>p.id==='4984').current.pending,145);
assert.equal(api.gamePoints('QB',25).points,1);
assert.equal(api.gamePoints('QB',30).points,3);
assert.equal(api.gamePoints('QB',40).points,7);
assert.equal(api.seasonPoints('RB',31.79),175);
assert.equal(api.seasonPoints('WR',31.44),175);
assert.equal(api.seasonPoints('WR',23.999),95);
assert.equal(api.seasonPoints('WR',24),95);
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
const expectedRates={QB:1.54,RB:.91,WR:.82,TE:.69};
for(const p of positions){
 const rate=counts[p].points/counts[p].games;
 assert.ok(Math.abs(rate-expectedRates[p])<.025,'Legacy 2.0 positional game rate for '+p+': '+rate);
}
assert.deepEqual(api.GAMES,[[20,1,2,2,3],[30,3,5,5,10],[40,7,10,10,18],[50,13,15,15,26],[60,22,25,25,35]]);
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
assert.deepEqual(api.SEASONS.map(x=>x[0]),[30,50,70,95,120,145,175,205]);
assert.deepEqual(api.SEASONS.map(x=>x[3]),[15.5,18.5,19.5,21.5,25,27.5,30,33]);
assert.equal(api.seasonPoints('WR',15.49),0);
assert.equal(api.seasonPoints('WR',15.5),30);
assert.equal(api.seasonPoints('RB',15.5),0);
assert.equal(api.seasonPoints('WR',25),120);


/* Research-only 2017-2025 NFL game simulation. Not official FIG starts. */
const historic=JSON.parse(fs.readFileSync(path.join(root,'research','fig_historical_ppg_2010_2025.json'),'utf8'));
const mock=new Map();
for(let yr=2017;yr<=2025;yr++){
 const players=historic.seasons[String(yr)].players;
 for(const [id,p] of Object.entries(players)){
  if(!positions.includes(p.pos)||!p.weekly?.length)continue;
  let row=mock.get(id);
  if(!row){row={name:p.name,position:p.pos,seasons:0,games:0};mock.set(id,row);}
  const sum=p.weekly.reduce((n,w)=>n+Number(w[1]),0);
  if(p.weekly.length>=8)row.seasons+=api.seasonPoints(p.pos,sum/p.weekly.length);
  for(const week of p.weekly)row.games+=api.gamePoints(p.pos,Number(week[1])).points;
 }
}
const mockRows=[...mock.values()].map(p=>({...p,total:p.seasons+p.games}));
const mockGet=name=>mockRows.find(p=>p.name===name);
assert.equal(mockRows.length,1529);
assert.equal(mockRows.filter(p=>p.total>=350).length,43,'Retain prior 350 baseline for comparison');
assert.equal(mockRows.filter(p=>p.total>=450).length,30,'450-point cutoff in 2017-2025 NFL mock');
assert.deepEqual([mockGet('Mike Evans').seasons,mockGet('Mike Evans').games,mockGet('Mike Evans').total],[310,179,489]);
assert.deepEqual([mockGet('Cooper Kupp').seasons,mockGet('Cooper Kupp').games,mockGet('Cooper Kupp').total],[420,156,576]);
const mockSeason=mockRows.reduce((n,p)=>n+p.seasons,0);
const mockGames=mockRows.reduce((n,p)=>n+p.games,0);
assert.equal(mockSeason,28645);
assert.equal(mockGames,21680);
assert.ok(mockSeason/(mockSeason+mockGames)>.56&&mockSeason/(mockSeason+mockGames)<.58);

console.log('FIG Legacy verified: ',m.all.length,'players,',m.watch.length,
 'watched; seasonal',m.season,'game',m.games,'share',m.ratio.toFixed(4));
