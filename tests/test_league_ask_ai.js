'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const engine=require('../league-ask-ai-v221.js');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'data',n+'.json'),'utf8'));
const games=read('games'),players=read('player_game_log');
const trades=read('trades'),drafts=read('draft_picks'),seasons=read('team_season_master');
const eq=(a,b)=>assert.equal(a,b);
const clean=v=>Number(String(v).replace(/[^0-9.-]/g,''));
function result(plan,data){const r=engine.execute(plan,data);assert.equal(r.ok,true,r.message);return r;}
{
 const r=result({dataset:'games',metric:'win_pct',group_by:'none',team_id:6,max_points:174.999},games);
 const matching=games.filter(g=>g.game_type==='Regular Season').flatMap(g=>[1,2].map(i=>({id:+g['franchise_'+i],points:+g['score_'+i],
  win:+g['score_'+i]>+g['score_'+(3-i)]}))).filter(x=>x.id===6&&x.points<175);
 eq(clean(r.value),Number((100*matching.filter(x=>x.win).length/matching.length).toFixed(2)));
 assert.match(r.note,/wins in \d+ games/);
}
{
 const r=result({dataset:'games',metric:'wins',group_by:'team',opponent_id:6},games);
 eq(r.rows[0].values[0],'CamNol');
 eq(r.rows[0].values[1],'4');
}
{
 const r=result({dataset:'games',metric:'count',group_by:'none',team_id:1,min_points:250},games);
 const count=games.filter(g=>g.game_type==='Regular Season'&&
  ((+g.franchise_1===1&&+g.score_1>=250)||(+g.franchise_2===1&&+g.score_2>=250))).length;
 eq(clean(r.value),count);
}
{
 const r=result({dataset:'games',metric:'count',group_by:'none',team_id:1,compare_team_id:6,
  compare_direction:'higher',result:'loss'},games);
 const by=new Map();
 for(const g of games.filter(g=>g.game_type==='Regular Season'))for(const i of [1,2]){
  const id=+g['franchise_'+i];by.set(g.season+':'+g.week+':'+id,+g['score_'+i]);
 }
 let count=0;
 for(const g of games.filter(g=>g.game_type==='Regular Season'))for(const i of [1,2]){
  if(+g['franchise_'+i]!==1||+g['score_'+i]>=+g['score_'+(3-i)])continue;
  const other=by.get(g.season+':'+g.week+':6');
  if(other!==undefined&&+g['score_'+i]>other)count++;
 }
 eq(clean(r.value),count);
}
{
 const r=result({dataset:'player_starts',metric:'count',group_by:'player',min_points:30},players);
 eq(r.rows[0].values[0],'Josh Allen');
 eq(r.rows[0].values[1],'25');
}
{
 const r=result({dataset:'player_starts',metric:'distinct_teams',group_by:'player',min_points:30},players);
 eq(r.rows[0].values[0],'Jared Goff');
 eq(r.rows[0].values[1],'4');
}
{
 const r=result({dataset:'player_starts',metric:'distinct_teams',group_by:'player',min_points:30,minimum_value:3},players);
 assert.ok(r.rows.length>0);
 for(const row of r.rows)assert.ok(Number(row.values[1])>=3);
}
{
 const r=result({dataset:'trades',metric:'count',group_by:'none',team_id:2},trades);
 eq(clean(r.value),trades.filter(x=>x.franchise_ids.map(Number).includes(2)).length);
 const by=result({dataset:'trades',metric:'count',group_by:'team',team_id:2},trades);
 eq(by.rows.length,1);
 eq(by.rows[0].values[0],'Fru');
}
{
 const r=result({dataset:'drafts',metric:'count',group_by:'team',player_name:'Josh Allen'},drafts);
 eq(r.rows[0].values[0],'Hayden');
}
{
 const a=result({dataset:'games',metric:'avg_points',group_by:'team',season_from:2025,season_to:2025},games);
 const b=result({dataset:'team_seasons',metric:'avg_points',group_by:'team',season_from:2025,season_to:2025},seasons);
 eq(a.rows[0].values[0],b.rows[0].values[0]);
 eq(a.rows[0].values[1],b.rows[0].values[1]);
}
{
 const valid=engine.validatePlan({dataset:'games',metric:'count',group_by:'none',season_from:2025,week_from:10});
 const future=result(valid,games),raw=games.filter(g=>g.game_type==='Regular Season'&&
  (+g.season>2025||(+g.season===2025&&+g.week>=10)));
 eq(clean(future.value),raw.length*2);
}
{
 const rejected=[
  {dataset:'games',metric:'not_a_metric',group_by:'team'},
  {dataset:'player_starts',metric:'win_pct',group_by:'player'},
  {dataset:'games',metric:'distinct_teams',group_by:'team'},
  {dataset:'games',metric:'count',group_by:'none',team_id:99},
  {dataset:'trades',metric:'count',group_by:'player'},
  {dataset:'team_seasons',metric:'win_pct',group_by:'team',game_type:'playoffs'},
  {dataset:'games',metric:'count',group_by:'none',season_from:2025,season_to:2024}
 ];
 for(const plan of rejected)assert.equal(engine.execute(plan,games).ok,false,JSON.stringify(plan));
}
{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const legacy=fs.readFileSync(path.join(root,'league-ask-v220.js'),'utf8');
 eq(html.includes('league-ask-ai-v221.js'),true);
 eq(html.includes('ask-fig-config.js'),true);
 eq(sw.includes('league-ask-ai-v221.js'),true);
 eq(legacy.includes('figAskAi.ask(q)'),true);
 const config=fs.readFileSync(path.join(root,'ask-fig-config.js'),'utf8');
 assert.match(config,/FIG_ASK_WORKER_URL = ''/);
}
async function workerTests(){
 const source=fs.readFileSync(path.join(root,'workers/ask-fig/src/index.js'),'utf8');
 const handler=new Function(source.replace('export default {','return {'))();
 const origin='https://ufboek.github.io';
 const env={AI:{run:async(_,input)=>{
  assert.equal(input.response_format.type,'json_schema');
  return {response:{dataset:'games',metric:'wins',group_by:'team',opponent_id:6,answer:'IGNORE_THIS'}};
 }},RATE:{limit:async()=>({success:true})},GLOBAL_RATE:{limit:async()=>({success:true})}};
 const request=(o,question)=>new Request('https://ask-fig-ai.example.workers.dev/interpret',
  {method:'POST',headers:{origin:o,'content-type':'application/json'},body:JSON.stringify({question})});
 const response=await handler.fetch(request(origin,'Who has the most wins against Hayden?'),env);
 eq(response.status,200);
 const data=await response.json();eq(data.plan.dataset,'games');
 eq(data.plan.answer,undefined);
 eq(response.headers.get('access-control-allow-origin'),origin);
 const forbidden=await handler.fetch(request('https://evil.example','Test query here'),env);
 eq(forbidden.status,403);
 const capped=await handler.fetch(request(origin,'Who has most wins here?'),
  {...env,GLOBAL_RATE:{limit:async()=>({success:false})}});
 eq(capped.status,429);
 const err=await handler.fetch(request(origin,'Who wins?'),{...env,AI:{run:async()=>({response:{dataset:'games',metric:'fake',group_by:'team'}})}});
 eq(err.status,503);
}
workerTests().then(()=>console.log('League Ask AI: query validation, real dataset calculations, Cloudflare CORS and rate-limit checks passed')).catch(err=>{console.error(err);process.exitCode=1;});
