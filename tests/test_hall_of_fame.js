'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,'data',name+'.json'),'utf8'));
const api=new Function('window',fs.readFileSync(path.join(dir,'hall-of-fame-v240.js'),'utf8')+
  '\nreturn window.figHallOfFameModel;')({});
const data={league:read('league_history'),games:read('games'),teamSeasonMaster:read('team_season_master'),playerLog:read('player_game_log')};
const m=api.model(data);
assert.deepEqual(m.years,[2023,2024,2025],'Ongoing 2026 cannot enter inaugural eligibility');
assert.deepEqual(m.finals.map(x=>[x.season,x.champion,x.runnerUp]),[[2023,4,6],[2024,6,1],[2025,6,1]],
 'Championship history must use championship game #1, not third-place game #2');
assert.equal(m.franchises.length,10);
assert.equal(m.franchises.filter(x=>x.inducted).length,3);
assert.ok(m.franchises.every((f,i)=>f.rank===i+1));
assert.ok(m.franchises.every(x=>x.seasons.length===3));
assert.equal(m.franchises.find(x=>x.id===6).titles.length,2);
assert.equal(m.franchises.find(x=>x.id===1).runnerUps.length,2);
assert.equal(m.franchises.find(x=>x.id===4).titles[0],2023);
assert.equal(m.legends.length,12,'Exactly three QB/RB/WR/TE legends in inaugural gallery');
for(const pos of ['QB','RB','WR','TE']){
 const members=m.legends.filter(x=>x.position===pos);
 assert.deepEqual(members.map(x=>x.posRank),[1,2,3]);
 assert.ok(members.every(x=>x.starts>=10&&x.points>0));
}
assert.ok(m.seasons.length===8);
assert.ok(m.seasons.every(x=>m.years.includes(x.year)));
assert.ok(m.seasons.every((x,i,a)=>i===0||a[i-1].allPlay>=x.allPlay));
assert.ok(m.moments.length>=3);
const gameKey=g=>[g.season,g.week,g.matchup_id].join(':');
assert.equal(new Set(m.moments.map(x=>gameKey(x.game))).size,m.moments.length,'Moment gallery must not duplicate an archived game');
assert.ok(m.moments.every(x=>m.years.includes(+x.game.season)));
const first=m.legends.map(x=>[x.id,x.points]);
const fork={...data,playerLog:[...data.playerLog,{season:'2026',week:8,game_type:'Regular Season',player_id:first[0][0],player_name:'Unfinished year',position:'QB',franchise_id:1,starter_points:100000}]};
assert.deepEqual(api.model(fork).legends.map(x=>[x.id,x.points]),first,
 'Incomplete seasons must not mutate historical honors');
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'hall-of-fame-v240.css'),'utf8');
assert.match(app,/label:'HALL OF FAME',href:'#\/hall-of-fame'/);
assert.match(app,/parts\[0\]==='hall-of-fame'/);
assert.match(html,/hall-of-fame-v240\.js\?v=240/);
assert.match(html,/hall-of-fame-v240\.css\?v=240/);
assert.match(sw,/hall-of-fame-v240\.js\?v=240/);
assert.match(sw,/hall-of-fame-v240\.css\?v=240/);
assert.match(css,/@media \(max-width:699px\)/);
assert.match(css,/prefers-reduced-motion/);
assert.ok(css.startsWith('/* FIG Hall of Fame'));
console.log('Hall of Fame inaugural data audited:',JSON.stringify({
 seasons:m.years,
 champions:m.finals.map(x=>x.champion),
 franchise_inductees:m.franchises.filter(x=>x.inducted).map(x=>({name:x.name,score:x.score})),
 player_inductees:m.legends.length,iconic_games:m.moments.length
}));
