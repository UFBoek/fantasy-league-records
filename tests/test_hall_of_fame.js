'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..');
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,'data',n+'.json'),'utf8'));
const model=new Function('window',fs.readFileSync(path.join(dir,'hall-of-fame-v241.js'),'utf8')+
 '\nreturn window.figHallOfFameModel;')({});
const data={league:read('league_history'),games:read('games'),teamSeasonMaster:read('team_season_master'),
 playerLog:read('player_game_log'),websiteStreaks:read('website_streaks')};
const x=model.model(data);
assert.deepEqual(x.complete,[2023,2024,2025]);
assert.deepEqual(x.finals.map(f=>[f.year,f.champion]),[[2023,4],[2024,6],[2025,6]]);
assert.equal(x.classes.length,1,'Future class must not be auto-created');
assert.equal(x.classes[0].year,2026);
assert.deepEqual(x.inductees.map(e=>e.name),['Josh Allen','Christian McCaffrey',"Ja'Marr Chase",'Trey McBride','Hayden · 2025']);
assert.deepEqual(x.inductees.map(e=>e.kind),['player','player','player','player','season']);
assert.ok(x.classes[0].entries.every(e=>e.proof.ok),'Every enrolled person/season must pass its own eligibility standard');
assert.equal(x.inductees.filter(e=>e.kind==='season').length,1,'Do not automatically induct the top N team seasons');
assert.equal(x.legacy.length,10,'Every manager belongs in the Legacy Points ledger');
assert.ok(x.legacy.every(r=>Number.isInteger(r.pts)&&r.pts>=0&&r.rank>0));
assert.equal(x.legacy.find(r=>r.name==='Hayden').titles,2);
assert.equal(x.legacy.find(r=>r.name==='Sack').titles,1);
assert.equal(x.legacy.find(r=>r.name==='Boek').titles,0);
assert.ok(!x.legacy.some(r=>r.inducted),'Legacy points are not franchise inductions');
assert.ok(x.legacy.find(r=>r.name==='Boek').awards.some(a=>a.label==='90%+ all-play season'&&a.year===2025));
assert.deepEqual(x.vault.map(r=>r.key),['allplay','3k','highs','streak']);
assert.ok(x.vault.every(r=>!r.year||r.year<=2025),'Incomplete 2026 records cannot pollute founding gallery');
const john=x.inductees.find(e=>e.id==='4984');assert.deepEqual(john.career.crowns,[2023,2025]);
assert.ok(john.career.avg>=30);
const rb=x.inductees.find(e=>e.id==='4034');assert.deepEqual(rb.career.crowns,[2023,2025]);
assert.ok(x.inductees.find(e=>e.id==='8130').career.recordSeason);
const immutable={
 ...data,
 league:[...data.league,{season:2027,status:'complete'}],
 playerLog:[...data.playerLog,{season:'2027',week:1,position:'QB',player_id:'999999',player_name:'Invented',starter_points:9000,franchise_id:1}],
 teamSeasonMaster:[...data.teamSeasonMaster,{season:2027,season_complete:true,franchise_id:1,wins:1,losses:0,games:1,points_for:10000,points_per_game:10000,all_play_win_pct:100,weekly_high_scores:1,regular_season_finish:1}]
};
const after=model.model(immutable);
assert.deepEqual(after.inductees.map(e=>e.id),x.inductees.map(e=>e.id),'New season must not elect players or teams automatically');
assert.deepEqual(after.inductees.filter(e=>e.kind==='player').map(e=>e.career.points),
 x.inductees.filter(e=>e.kind==='player').map(e=>e.career.points),'Founding player statistics must remain fixed to 2023–25');
assert.ok(after.legacy.find(r=>r.id===1).pts>x.legacy.find(r=>r.id===1).pts,'Legacy ledger expands across completed future seasons');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'hall-of-fame-v241.css'),'utf8');
assert.match(html,/hall-of-fame-v241\.js\?v=241/);
assert.match(html,/hall-of-fame-v241\.css\?v=241/);
assert.match(sw,/hall-of-fame-v241\.js\?v=241/);
assert.match(sw,/fig-league-shell-v241/);
assert.match(app,/label:'HALL OF FAME',href:'#\/hall-of-fame'/);
assert.match(app,/parts\[0\]==='hall-of-fame'/);
assert.match(css,/@media\(max-width:699px\)/);
assert.match(css,/prefers-reduced-motion:reduce/);
console.log('Hall v241 verified:',JSON.stringify({
 class:x.inductees.map(e=>e.name),legacy:x.legacy.map(r=>[r.name,r.pts]),exhibits:x.vault.length,years:x.complete
}));
