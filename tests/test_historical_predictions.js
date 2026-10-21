'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const script = fs.readFileSync('historical-predictions-v189.js','utf8');
const fixture = {
  allGames: JSON.parse(fs.readFileSync('data/all_games.json','utf8')),
  weeklyRanks: JSON.parse(fs.readFileSync('data/weekly_scoring_ranks.json','utf8')),
  leagueSettings: JSON.parse(fs.readFileSync('data/league_settings.json','utf8')),
  league: JSON.parse(fs.readFileSync('data/league_history.json','utf8')),
};
const names = {1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
function setup(data,runTimer=false,fetchImpl=null){
  const app={innerHTML:''};
  const elements={};
  const document={
    getElementById(id){return elements[id]||(elements[id]={value:'',innerHTML:'',textContent:'',onchange:null});},
    querySelectorAll(){return [];}
  };
  const context={
    window:{},DATA:data,app,document,location:{hash:'#/historical-predictions'},
    console,Math,Set,Number,String,JSON,Map,Object,Array,
    load:async()=>{},navActive:()=>{},
    displayOwnerName:(_,id)=>names[id],
    ownerAvatar:(id)=>'<img data-id="'+id+'">',
    setTimeout(fn){if(runTimer)fn();},
    fetch:fetchImpl||async()=>{throw new Error('Unexpected live schedule request');}
  };
  vm.runInNewContext(script,context,{filename:'historical-predictions-v189.js'});
  return {view:context.window.figHistoricalPredictions,app,elements};
}
function table(html){
  const match=html.match(/<table class="fig-hist-table">[\s\S]*?<\/table>/);
  assert(match,'Historical odds table missing');
  return match[0];
}
function clone(data){return JSON.parse(JSON.stringify(data));}
(async function(){
  let a=setup(clone(fixture));
  await a.view(2025,7);
  assert(a.app.innerHTML.includes('HISTORICAL PREDICTIONS'));
  assert(a.app.innerHTML.includes('WEEK 7 MATCHUP ODDS'));
  assert(a.app.innerHTML.includes('5 TEAMS'));
  assert(/Boek<\/strong><\/button><\/td><td>6–0<\/td><td>211\.8<\/td>/.test(a.app.innerHTML));
  assert(/Final: 213\.7 – 290\.3/.test(a.app.innerHTML));
  const original=table(a.app.innerHTML);
  let changed=clone(fixture);
  changed.allGames.filter(g=>+g.season===2025 && +g.week>=7).forEach(g=>{
    g.score_1=20;g.score_2=500;g.winner_franchise_id=g.franchise_2;
  });
  changed.weeklyRanks.filter(g=>+g.season===2025 && +g.week>=7).forEach(g=>g.points_for=10000);
  let b=setup(changed);
  await b.view(2025,7);
  assert.strictEqual(table(b.app.innerHTML),original,'Future scores leaked into a historical forecast');
  await a.view(2024,7);
  assert(a.app.innerHTML.includes('6 TEAMS'),'2024 must use six playoff teams');
  await a.view(2023,2);
  assert(a.app.innerHTML.includes('6 TEAMS'),'2023 must use six playoff teams');
  assert(!a.app.innerHTML.includes('<option value="1">PRESEASON</option>'),'2023 preseason should not invent a prior-year PPG');
  await a.view(2025,1);
  assert(a.app.innerHTML.includes('offseason roster changes are not modeled'),'Preseason baseline must be labeled');
  assert(a.app.innerHTML.includes('0–0'),'Preseason standings must start at zero');
  await a.view(2025,15);
  assert(a.app.innerHTML.includes('Playoffs begin in Week 15'),'Week 15 shows bracket-stage odds');
  let chart=setup(clone(fixture),true);
  await chart.view(2025,7);
  assert(chart.elements.figHistoricalTrend.innerHTML.includes('<svg'),'Historical team trend failed to render');
  // The current year must not use unfinished weekly scores.
  const schedule=fixture.allGames.filter(g=>+g.season===2025 && +g.week>=7 && +g.week<=14 && g.game_type==='Regular Season');
  let current=setup(clone(fixture),false,async url=>{
    const w=Number(url.match(/matchups\/(\d+)/)[1]);
    const pairs=schedule.filter(g=>+g.week===w);
    return {ok:true,json:async()=>pairs.flatMap((g,i)=>[
      {roster_id:g.franchise_1,matchup_id:i+1},
      {roster_id:g.franchise_2,matchup_id:i+1}
    ])};
  });
  await current.view(2026,7);
  assert(current.app.innerHTML.includes('5 TEAMS'),'Current year requires five-team playoff format');
  assert(current.app.innerHTML.includes('WEEK 7 MATCHUP ODDS'));
  console.log('Historical predictions tests passed: as-of cutoff, formats, preseason, trend, 2026 schedule.');
})().catch(error=>{console.error(error);process.exitCode=1;});