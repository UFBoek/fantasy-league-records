'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'));
const stats=require('../league-ask-v220.js');
const games=read('games');
const players=read('player_game_log');
const trades=read('trades');
const drafts=read('draft_picks');

{
 const r=stats.statsForGames('What is Boek’s record against Hayden since 2024?',games);
 const matches=games.filter(g=>Number(g.season)>=2024&&g.game_type==='Regular Season'&&
  [Number(g.franchise_1),Number(g.franchise_2)].includes(1)&&
  [Number(g.franchise_1),Number(g.franchise_2)].includes(6));
 const wins=matches.filter(g=>Number(g.winner_franchise_id)===1).length;
 assert.equal(r.ok,true);
 assert.equal(r.title,'Boek vs Hayden');
 assert.equal(r.value,wins+'–'+(matches.length-wins));
 assert.equal(r.rows.length,Math.min(10,matches.length));
}
{
 const r=stats.statsForGames('Who has the most wins against Hayden?',games);
 assert.equal(r.ok,true);
 assert.match(r.title,/against Hayden/);
 const record=new Map();
 for(const g of games.filter(g=>g.game_type==='Regular Season')){
  if(![Number(g.franchise_1),Number(g.franchise_2)].includes(6))continue;
  const winner=Number(g.winner_franchise_id);
  if(winner!==6)record.set(winner,(record.get(winner)||0)+1);
 }
 assert.equal(Number(r.value),Math.max(...record.values()));
 assert.notEqual(r.rows[0].values[0],'Hayden');
}
{
 const r=stats.statsForGames("What is Hayden's record?",games);
 const perf=games.filter(g=>g.game_type==='Regular Season'&&
  [Number(g.franchise_1),Number(g.franchise_2)].includes(6));
 const wins=perf.filter(g=>Number(g.winner_franchise_id)===6).length;
 assert.equal(r.value,wins+'–'+(perf.length-wins));
 assert.equal(r.rows[0].values[0],'Hayden');
}
{
 const r=stats.statsForGames('Who scored the most points in Week 7 of 2026?',games);
 const weekly=games.filter(g=>Number(g.season)===2026&&Number(g.week)===7&&g.game_type==='Regular Season');
 const highest=Math.max(...weekly.flatMap(g=>[Number(g.score_1),Number(g.score_2)]));
 assert.equal(r.value,highest.toLocaleString('en-US',{maximumFractionDigits:2})+' pts');
 assert.equal(r.rows[0].values[1],'2026 W7');
}
{
 const r=stats.statsForPlayers('Which player scored the most points for Winston?',players,games);
 const totals=new Map();
 for(const x of players.filter(x=>Number(x.franchise_id)===8&&x.game_type==='Regular Season')){
  const id=String(x.player_id);totals.set(id,(totals.get(id)||0)+Number(x.starter_points));
 }
 assert.equal(Number(String(r.value).replace(/ pts|,/g,'')),Number(Math.max(...totals.values()).toFixed(2)));
 assert.match(r.title,/Winston/);
}
{
 const r=stats.statsForTrades('How many trades has Fru made?',trades);
 assert.equal(r.value,trades.filter(t=>(t.franchise_ids||[]).map(Number).includes(2)).length);
}
{
 const r=stats.statsForDrafts('Who drafted Josh Allen?',drafts);
 const picks=drafts.filter(x=>x.player_name==='Josh Allen');
 assert.equal(r.value,picks.map(x=>({1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'})[Number(x.franchise_id)]).join(', '));
}
{
 const sc=stats.scope('since Week 10 of 2025',games);
 const perf=(season,week)=>({season,week,game_type:'Regular Season'});
 assert.equal(sc.test(perf(2025,9)),false);
 assert.equal(sc.test(perf(2025,10)),true);
 assert.equal(sc.test(perf(2026,2)),true,'future season weeks are included after the specified starting week');
 assert.equal(sc.test(perf(2024,14)),false);
}
{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(html,/league-ask-v220\.js/);
 assert.match(html,/league-ask-v220\.css/);
 assert.match(app,/figLeagueSearch\.render/);
 assert.match(app,/figLeagueSearch\?\.mountHome/);
 assert.match(sw,/league-ask-v220\.js/);
 assert.match(sw,/league-ask-v220\.css/);
}
console.log('League Ask: record, opponent, scoring, player, trade, draft and route checks passed');
