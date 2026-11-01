'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'data',p+'.json'),'utf8'));
const win={figHallOfFame:async()=>{}};
new Function('window',fs.readFileSync(path.join(root,'hall-of-fame-legacy-v245.js'),'utf8'))(win);
const api=win.figHallLegacy;
const m=api.calculate({league:read('league_history'),playerSeasons:read('player_seasons'),playerLog:read('player_game_log')});
assert.equal(api.THRESHOLD,500);assert.equal(api.MIN_STARTS,8);
assert.deepEqual(api.FLOORS,[22,13,13,10]);
assert.equal(m.all.length,386);assert.equal(m.watch.length,35);
assert.equal(m.allScored.length,210,'All Players displays only earned Legacy scorers');
assert.equal(m.all.length-m.allScored.length,176,'Zero-point archive players hidden from All Players');
assert.ok(m.allScored.every(p=>p.total>0),'No zero-point players in All Players');
assert.ok(m.all.filter(p=>p.total===0).every(p=>!m.allScored.includes(p)),'Zero players retained in full archive, but filtered from UI');
assert.ok(m.watch.every(p=>p.watched),'Commissioner watchlist remains independent');
assert.ok(Math.abs(m.season-10253.7)<1e-5);
assert.equal(m.games,4734);
assert.ok(m.ratio>.683&&m.ratio<.685,'Historical season/game share after removing low-scoring QB bonuses');
assert.deepEqual(m.eligible.map(p=>p.name),[],'500 is not yet earned in four FIG seasons');
assert.equal(m.all[0].name,'Josh Allen');
assert.equal(m.all[0].remaining,29.5);
assert.equal(m.all.find(p=>p.id==='7564').remaining,81);
assert.equal(m.all.find(p=>p.id==='4034').remaining,121.4);
assert.equal(m.all.find(p=>p.id==='9493').remaining,124.5);
assert.ok(m.all.every(p=>p.eligible===(p.total>=500)));
const totals=[['4984',470.5],['4034',378.6],['7564',419],['9493',375.5],
 ['8130',299.9],['6786',309.2],['9221',371.2],['9488',233.8],['11604',250.4]];
for(const [id,total] of totals)assert.equal(m.all.find(p=>p.id===id)?.total,total,id);
assert.deepEqual(m.watch.filter(p=>p.founder).map(p=>p.id),[]);
assert.deepEqual(m.all.filter(p=>p.founder).map(p=>p.id),['4984','9493']);
assert.equal(m.all.find(p=>p.id==='9221').current.pending,192.9);
assert.equal(m.all.find(p=>p.id==='9488').current.pending,189.4);
assert.equal(m.all.find(p=>p.id==='4984').current.pending,148.8);
assert.equal(m.all.find(p=>p.name==='George Pickens').current.pending,29.5);
assert.equal(api.gamePoints('QB',25).points,0);
assert.equal(api.gamePoints('QB',25).band,-1,'No QB 20-point milestone awarded');
assert.equal(api.gamePoints('QB',29.99).points,0);
assert.equal(api.gamePoints('RB',25).points,2);
assert.equal(api.gamePoints('WR',25).points,2);
assert.equal(api.gamePoints('TE',25).points,3);
assert.equal(api.gamePoints('QB',30).points,3);
assert.equal(api.gamePoints('QB',40).points,7);
assert.equal(api.seasonPoints('RB',31.79),192.9);
assert.equal(api.seasonPoints('WR',31.44),189.4);
assert.equal(api.seasonPoints('WR',23.999),112.9);
assert.equal(api.seasonPoints('WR',24),112.9);
const expectedWatchByPosition={
 "QB": [
  "4881",
  "6904",
  "6770",
  "3294",
  "4046",
  "3163",
  "8183",
  "11566",
  "11560",
  "11564",
  "9758",
  "7523",
  "4892",
  "6804"
 ],
 "RB": [
  "4034",
  "9221",
  "9509",
  "8150",
  "3198",
  "4866",
  "9226",
  "6813",
  "8138",
  "12527"
 ],
 "WR": [
  "7564",
  "7547",
  "6786",
  "6794",
  "5859",
  "9488",
  "6801",
  "8144",
  "9997"
 ],
 "TE": [
  "8130",
  "11604"
 ]
};
const expectedWatchIds=Object.values(expectedWatchByPosition).flat();
assert.equal(expectedWatchIds.length,35);
assert.deepEqual([...api.WATCH].sort(),expectedWatchIds.slice().sort(),'Commissioner list exactly matches selected players');
assert.deepEqual(m.watch.map(p=>p.id).sort(),expectedWatchIds.slice().sort(),'Every selected player in league game archive');
for(const [pos,ids] of Object.entries(expectedWatchByPosition)){
 assert.equal(m.watch.filter(p=>p.position===pos).length,ids.length,'Expected '+pos+' watchlist count');
 for(const id of ids)assert.equal(m.watch.find(p=>p.id===id)?.position,pos,'Wrong position or missing '+id);
}
for(const n of ['Josh Allen','Puka Nacua','Tyreek Hill','Travis Kelce','Bryce Young','Tetairoa McMillan'])
 assert.ok(!m.watch.some(p=>p.name===n)&&m.all.some(p=>p.name===n),'Excluded from watch only: '+n);
for(const p of m.all)assert.equal(p.total,+(p.season+p.games).toFixed(1));

const positions=['QB','RB','WR','TE'];
const counts=Object.fromEntries(positions.map(p=>[p,{games:0,points:0}]));
for(const x of read('player_game_log')){
 const entry=counts[x.position];
 if(!entry)continue;
 entry.games++;entry.points+=api.gamePoints(x.position,Number(x.starter_points)).points;
}
const expectedRates={QB:1.19,RB:.91,WR:.82,TE:.69};
for(const p of positions){
 const rate=counts[p].points/counts[p].games;
 assert.ok(Math.abs(rate-expectedRates[p])<.025,'Legacy 2.0 positional game rate for '+p+': '+rate);
}
assert.deepEqual(api.GAMES,[[20,0,2,2,3],[30,3,5,5,10],[40,7,10,10,18],[50,13,15,15,26],[60,22,25,25,35]]);
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
assert.equal(api.seasonPoints('WR',13),0);
assert.equal(api.seasonPoints('WR',13.5),6);
assert.equal(api.seasonPoints('WR',15.1),25.2);
assert.equal(api.seasonPoints('WR',15.49),29.9);
assert.equal(api.seasonPoints('WR',15.5),30);
assert.equal(api.seasonPoints('WR',18.5),50);
assert.equal(api.seasonPoints('WR',15.457142857142856),29.5);
assert.equal(api.seasonPoints('RB',15.5),25);
assert.equal(api.seasonPoints('QB',22),0);
assert.equal(api.seasonPoints('TE',10),0);
assert.equal(api.seasonPoints('TE',13.47),29.7);
assert.equal(api.seasonPoints('QB',24.83),28.3);
assert.equal(api.seasonPoints('QB',99),205);
for(const pos of positions){
 const f=api.FLOORS[positions.indexOf(pos)],first=api.SEASONS[0][positions.indexOf(pos)+1];
 assert.equal(api.seasonPoints(pos,f),0);
 assert.equal(api.seasonPoints(pos,first),30);
 assert.ok(api.seasonPoints(pos,first-0.01)>0,'Smooth positive points below first milestone for '+pos);
}

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
assert.equal(mockRows.filter(p=>p.total>=450).length,39,'Historical 450-point reference after QB bonus change');
assert.equal(mockRows.filter(p=>p.total>=500).length,29,'500 remains near historic 30-player selectivity');
assert.equal(mockRows.filter(p=>p.total>=550).length,24);
assert.deepEqual([+mockGet('Mike Evans').seasons.toFixed(1),mockGet('Mike Evans').games,+mockGet('Mike Evans').total.toFixed(1)],[421.1,179,600.1]);
assert.deepEqual([+mockGet('Cooper Kupp').seasons.toFixed(1),mockGet('Cooper Kupp').games,+mockGet('Cooper Kupp').total.toFixed(1)],[501.1,156,657.1]);
const mockSeason=mockRows.reduce((n,p)=>n+p.seasons,0);
const mockGames=mockRows.reduce((n,p)=>n+p.games,0);
assert.ok(mockSeason>39150&&mockSeason<39165);
assert.equal(mockGames,19979);
assert.ok(mockSeason/(mockSeason+mockGames)>.66&&mockSeason/(mockSeason+mockGames)<.67);

console.log('FIG Legacy verified: ',m.all.length,'players,',m.watch.length,
 'watched; seasonal',m.season,'game',m.games,'share',m.ratio.toFixed(4));
