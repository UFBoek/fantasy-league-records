'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../league-ask-ai-v221.js');
const base={dataset:'player_touchdowns',metric:'touchdowns',group_by:'week',
 team_id:1,season_from:2026,season_to:2026,limit:18};
const games=[
 {season:'2026',week:1,game_type:'Regular Season',franchise_1:1,franchise_2:2,matchup_id:1},
 {season:'2026',week:2,game_type:'Regular Season',franchise_1:1,franchise_2:6,matchup_id:2}
];
const seed=(week,player,td)=>({season:2026,week,game_type:'Regular Season',franchise_id:1,
 player_id:player,player_name:'Test '+player,position:player==='100'?'RB':'WR',
 rush_td:td,rec_td:0,touchdowns:td});
const stats={source:'Sleeper raw NFL weekly stats: rush_td + rec_td (started non-QB offense only)',
 coverage:{'2026:1:Regular Season:1':['100','101'],'2026:2:Regular Season:1':['100','101']},
 records:[seed(1,'100',2),seed(1,'101',1),seed(2,'100',0),seed(2,'101',4)],games};
function result(p=base,data=stats){return engine.execute(p,data);}
{
 const r=result();assert.equal(r.ok,true,r.message);
 assert.equal(r.value,'7 TDs');
 assert.deepEqual(r.rows.map(x=>x.values),[
 ['2026 W1',3,2],['2026 W2',4,2]]);
 assert.equal(r.interpretation.measure,'Rushing + receiving touchdowns');
 assert.match(r.note,/No touchdowns inferred from fantasy points/);
 assert.match(r.rows[0].href,/#\/game\/2026\/1\/1/);
}
{
 const other={...stats,coverage:{...stats.coverage}};
 delete other.coverage['2026:2:Regular Season:1'];
 const r=result(base,other);
 assert.equal(r.ok,false);
 assert.match(r.message,/incomplete for 2026 Week 2/i);
}
{
 const other={...stats,records:stats.records.slice(0,-1)};
 const r=result(base,other);
 assert.equal(r.ok,false);
 assert.match(r.message,/Source coverage check failed/);
}
{
 const r=result({...base,metric:'count'});
 assert.equal(r.ok,false);
 assert.match(r.message,/only supports verified touchdown totals/);
}
{
 const r=result({...base,group_by:'none'});
 assert.equal(r.ok,true);
 assert.equal(r.value,'7 TDs');
}
{
 const q='How many non qb tds does Boek have in every game in 2026';
 assert.match(engine.verifyQuestion(q,{dataset:'games',metric:'count',group_by:'week',team_id:1,season_from:2026,season_to:2026}),/Touchdowns cannot be counted/);
 assert.equal(engine.verifyQuestion(q,{...base}), '');
 assert.match(engine.verifyQuestion('What are Boek rushing yards in 2026',{dataset:'games',metric:'count',group_by:'week',team_id:1,season_from:2026,season_to:2026}),/Yardage/);
 assert.match(engine.verifyQuestion('What was Boek win rate in 2026',{dataset:'games',metric:'win_pct',group_by:'none',team_id:1,season_from:null,season_to:null}),/2026/);
 assert.match(engine.verifyQuestion('How many wins did Boek have per week in 2026',{dataset:'games',metric:'count',group_by:'none',team_id:1,season_from:2026,season_to:2026}),/game-by-game/);
}
{
 const front=fs.readFileSync(path.join(__dirname,'..','league-ask-v220.js'),'utf8');
 assert.match(front,/<details class="boekmuse-audit"><summary>Answer details<\/summary>/);
 assert.doesNotMatch(front,/WHAT I CALCULATED|View verified SQL calculation/);
 assert.match(front,/Grouped by:/);
 assert.match(front,/No verified answer available/);
}
console.log('BoekMuse non-QB touchdowns: true counts, per-week rollups, coverage failures, incompatible metric and collapsed calculation detail checks passed.');
