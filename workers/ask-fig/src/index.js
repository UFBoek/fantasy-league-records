/* Ask FIG: Cloudflare Workers AI is only a query interpreter, never a stats calculator. */
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const SCHEMA = {
  type:'object',
  properties:{
    dataset:{type:'string',enum:['games','player_starts','trades','drafts','team_seasons','player_touchdowns','unsupported']},
    metric:{type:'string',enum:['count','wins','losses','win_pct','total_points','avg_points','max_points','min_points','total_allowed','avg_allowed','avg_margin','distinct_teams','touchdowns']},
    group_by:{type:'string',enum:['none','team','opponent','player','position','season','week','team_season','game']},
    team_id:{type:['integer','null']},
    opponent_id:{type:['integer','null']},
    compare_team_id:{type:['integer','null']},
    compare_direction:{type:'string',enum:['none','higher','lower']},
    player_name:{type:['string','null']},
    position:{type:['string','null']},
    season_from:{type:['integer','null']},
    season_to:{type:['integer','null']},
    week_from:{type:['integer','null']},
    week_to:{type:['integer','null']},
    game_type:{type:'string',enum:['regular','playoffs','all']},
    result:{type:'string',enum:['any','win','loss','tie']},
    min_points:{type:['number','null']},
    max_points:{type:['number','null']},
    min_opponent_points:{type:['number','null']},
    max_opponent_points:{type:['number','null']},
    min_margin:{type:['number','null']},
    max_margin:{type:['number','null']},
    minimum_value:{type:['number','null']},
    maximum_value:{type:['number','null']},
    draft_round:{type:['integer','null']},
    rookie_only:{type:'boolean'},
    order:{type:'string',enum:['desc','asc']},
    limit:{type:'integer'},
    minimum_games:{type:'integer'},
    reason:{type:'string'}
  },
  required:['dataset','metric','group_by'],
  additionalProperties:false
};
const SYSTEM = [
'You translate fantasy football league questions into a verified aggregate query plan. Return only JSON matching the schema. NEVER answer a question or invent statistics.',
'Team IDs: 1 Boek, 2 Fru, 3 Fromm, 4 Sack (Sak), 5 Leyton, 6 Hayden, 7 Line (Lionel), 8 Winston, 9 CamNol, 10 James.',
'Published archives: games = one row per team per finalized matchup, player_starts = started fantasy players only (not bench), trades = completed trades, drafts = individual selections, team_seasons = season-level regular season stats.',
'player_touchdowns = verified Sleeper NFL rushing and receiving touchdowns of STARTED RB/WR/TE/FB players, excluding QB, K, DEF and BENCH. Source includes complete-data coverage checks per team-week. The metric is touchdowns, never count.',
'Use player_touchdowns ONLY for non-QB offensive TD requests; metric touchdowns, group_by week for each/every week or game of ONE team, team_id of that team, season_from AND season_to requested calendar season, limit 18. Every week means an explicit week-by-week table.',
'EXACT EXAMPLE: "How many non qb tds does Boek have in every game in 2026": {"dataset":"player_touchdowns","metric":"touchdowns","group_by":"week","team_id":1,"season_from":2026,"season_to":2026,"game_type":"regular","limit":18}. No opponent_id, no count metric. DO NOT output one record per week; add rush_td + rec_td of the starters.',
'Never substitute game count, player start count, or fantasy points for rushing or receiving TDs. For touchdown requests involving ALL players including QBs, bench players or defense, return dataset unsupported and reason state specific missing coverage.',
'For rushing yards, receiving yards, passing yards, fumbles, interceptions, sacks or other raw NFL stats not in published archives, return dataset unsupported with a reason; never replace them with a row count.',
'For unsupported intents add reason (max 180 chars); choose metric count, group_by none but dataset unsupported. Do not pretend this is a valid game count.',
'Metrics: count=number of qualifying rows; wins, losses, win_pct; total_points, avg_points, max_points, min_points; total_allowed, avg_allowed; avg_margin (points scored minus opponent points); distinct_teams counts distinct franchises where the SAME player has qualifying starts.',
'Group: none for a named team total, team for a leaderboard, opponent for a head-to-head opponent breakdown, player for player leaderboards, season or week for time series, team_season for each franchise each year, game for each performance.',
'Use opponent_id for "against Hayden" and team_id for "Hayden" or "for Hayden". When the question says "most wins AGAINST Hayden", group_by team, opponent_id=6, metric wins.',
'For scoring thresholds set min_points or max_points; score must be compared to the team (or started player) record, not opponent. Wins under 175 means max_points=174.999, metric=win_pct.',
'For "since Week 10 of 2025": season_from=2025, week_from=10 and leave season_to null. Week boundaries apply only at the edge season; for "Week 7 of 2026" set season_from=season_to=2026, week_from=week_to=7.',
'For game_type default regular, playoffs only if asked, all only if explicitly all games / including playoffs.',
'For player questions use player_starts and player_name full name when present. For "Who drafted Josh Allen" use drafts, player_name="Josh Allen", group_by=team, metric=count.',
'For "How many trades did Fru make", dataset trades, team_id=2, group_by none, metric count.',
'For player scoring at least 30 for multiple teams: dataset player_starts, min_points=30, metric distinct_teams, group_by player. If asks at least 3 franchises, minimum_value=3 (filter AFTER aggregating).',
'For "minimum 10 occurrences" of an aggregate, set minimum_value=10; for "minimum 10 games" of a sample, set minimum_games=10.',
'For biggest blowouts use games, group_by game, metric avg_margin, result win, sort desc.',
'When a question asks for top N: limit N (max 30). For "minimum 10 games" set minimum_games=10.',
'Season data can group team_season by team or season; choose games unless specifically asking for season-level finishes or all-play (unsupported).',
'If request needs unsupported data/operations (future predictions, all-play, roster slot assignment, trade outcomes over time, streak sequences, championships, complex multi-step joins), choose dataset unsupported, metric count, group_by none and reason briefly explain limitation. Never force a different metric.',
'Never infer a minimum_games, minimum_value, ranking limit, season, or threshold not explicitly present in the actual user question. Example: trade count does NOT need minimum_games, and "highest PPG" does not imply 10 games.',
'IMPORTANT: A manager can outscore another manager in the SAME WEEK without facing that manager. For these questions, use compare_team_id and compare_direction, NOT opponent_id. Only use opponent_id for actual head-to-head contests.',
'EXACT EXAMPLE for "How many times did Boek lose while outscoring Hayden in the same week?": {"dataset":"games","metric":"count","group_by":"none","team_id":1,"result":"loss","compare_team_id":6,"compare_direction":"higher"}. Do NOT use opponent_id. Boek lost to someone else, not Hayden.',
'EXACT EXAMPLE for "What percentage of Hayden games under 175 points were wins?": {"dataset":"games","metric":"win_pct","group_by":"none","team_id":6,"max_points":174.999}. Do NOT set opponent_id, min_points or minimum_games.',
'EXACT EXAMPLE for "Who has the most wins against Hayden?": {"dataset":"games","metric":"wins","group_by":"team","opponent_id":6}. This IS head-to-head.',
'EXACT EXAMPLE for "How many trades has Fru made?": {"dataset":"trades","metric":"count","group_by":"none","team_id":2}. Do not invent a sample threshold.',
'Do not fill in guessed years, teams, players or thresholds. Make interpretation a concise neutral description of the calculation.',
'No commentary; JSON object only.'
].join('\n');
// Do not let a small model turn an across-league weekly comparison into a direct matchup.
// This correction only runs for explicit questions naming two managers and comparing scores.
function reconcileQuestion(question, plan){
 const q=question.toLowerCase().replace(/[’']/g,"'");
 const known=[
  [1,/\bboek\b/],[2,/\bfru\b/],[3,/\bfromm\b/],[4,/\b(?:sack|sak)\b/],
  [5,/\bleyton\b/],[6,/\bhayden\b/],[7,/\b(?:line|lionel)\b/],[8,/\bwinston\b/],
  [9,/\b(?:camnol|cam nol)\b/],[10,/\bjames\b/]
 ];
 const matches=known.flatMap(([id,re])=>{const m=re.exec(q);return m?[{id,index:m.index}]:[]}).sort((a,b)=>a.index-b.index);
 if(plan.dataset==='games'&&matches.length===1&&plan.opponent_id===matches[0].id&&
  !/\b(against|versus|head.to.head|vs\.?)\b/.test(q)){
  plan.team_id=matches[0].id;
  plan.opponent_id=null;
 }
 if(plan.dataset==='games'&&matches.length===2&&
  /\b(outscor(?:e|es|ed|ing)|more points than|fewer points than|higher score than|lower score than)\b/.test(q)&&
  !/\b(versus|vs\.?|head.to.head)\b/.test(q)){
  plan.team_id=matches[0].id;
  plan.compare_team_id=matches[1].id;
  plan.compare_direction=/\b(fewer points|lower score|outscored by|less than)\b/.test(q)?'lower':'higher';
  plan.opponent_id=null;
  if(plan.metric==='count')plan.group_by='none';
 }
 if(!/\b(?:minimum|at least|at minimum|with|over)\s*\d+\s*(?:games|starts|appearances)\b/.test(q))delete plan.minimum_games;
 // A requested score BELOW a threshold is an upper bound, never a lower bound.
 const under=q.match(/\b(?:under|below|less than)\s*(\d{2,3})(?:\s*(?:points|pts))?\b/);
 if(under&&['games','player_starts'].includes(plan.dataset)){
  plan.max_points=Number(under[1])-0.001;
  plan.min_points=null;
 }
 // A raw touchdown request cannot be interpreted as a count of games/starts.
 if(/\b(?:touchdowns?|tds?)\b/.test(q)){
  if(/\b(?:non[\s-]?qbs?|excluding (?:qbs?|quarterbacks?)|without (?:qbs?|quarterbacks?))\b/.test(q)){
   plan.dataset='player_touchdowns';plan.metric='touchdowns';plan.position=null;
   plan.game_type=/\bplayoffs?\b/.test(q)?'playoffs':'regular';
   if(matches.length===1)plan.team_id=matches[0].id;
   if(/\b(?:every|each|per)\s+(?:single\s+)?(?:game|week)\b|\bby\s+(?:game|week)\b/.test(q)){
    plan.group_by='week';plan.limit=18;
   }
   const oneYear=q.match(/\b(?:in|during|for)\s+(?:the\s+)?(?:season\s+)?(20(?:2[3-9]|3\d))\b/);
   if(oneYear){plan.season_from=Number(oneYear[1]);plan.season_to=Number(oneYear[1]);}
   plan.opponent_id=null;plan.compare_team_id=null;plan.compare_direction='none';plan.result='any';
   plan.min_points=null;plan.max_points=null;plan.min_margin=null;plan.max_margin=null;
  }else{
   return {dataset:'unsupported',metric:'count',group_by:'none',
    reason:'Only started non-QB offensive rushing + receiving touchdowns are verified. Please specify non-QB TDs.'};
  }
 }
 if(/\b(?:rushing|receiving|passing)\s+yards?\b|\b(?:interceptions?|fumbles?|sacks?)\b/.test(q))
  return {dataset:'unsupported',metric:'count',group_by:'none',
   reason:'Raw NFL yardage, interceptions, sacks or fumbles are not published in the verified BoekMuse archive.'};
 return plan;
}

function json(body,status,origin){
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'Origin','x-content-type-options':'nosniff'};
 if(origin)headers['access-control-allow-origin']=origin;
 return new Response(JSON.stringify(body),{status,headers});
}
function permittedOrigin(origin,env){
 const allowed=String(env.ALLOWED_ORIGINS||'https://ufboek.github.io').split(',').map(x=>x.trim()).filter(Boolean);
 return allowed.includes(origin) ? origin : '';
}
function parseModel(output){
 let value=output?.response;
 if(value===undefined)value=output?.choices?.[0]?.message?.content;
 if(typeof value==='string'){
  const text=value.trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
  value=JSON.parse(text);
 }
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid AI output');
 if(!SCHEMA.properties.dataset.enum.includes(value.dataset)||!SCHEMA.properties.metric.enum.includes(value.metric)||!SCHEMA.properties.group_by.enum.includes(value.group_by))throw Error('Invalid AI plan');
 // Never allow model-supplied code or arbitrary fields into the browser.
 const plan={};for(const key of Object.keys(SCHEMA.properties))if(Object.prototype.hasOwnProperty.call(value,key))plan[key]=value[key];
 return plan;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  const allowed=permittedOrigin(origin,env);
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,service:'ask-fig-interpreter'},200,allowed);
  if(url.pathname!=='/interpret')return json({error:'Not found'},404,allowed);
  if(!allowed)return json({error:'Origin not permitted'},403,'');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':allowed,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'600','vary':'Origin'}});
  if(request.method!=='POST')return json({error:'POST required'},405,allowed);
  if(!/^application\/json\b/i.test(request.headers.get('content-type')||''))return json({error:'JSON required'},415,allowed);
  if(Number(request.headers.get('content-length')||0)>1500)return json({error:'Request too large'},413,allowed);
  let data;try{data=await request.json();}catch(_){return json({error:'Invalid JSON'},400,allowed);}
  const question=data?.question;
  if(typeof question!=='string'||question.trim().length<4||question.length>220)return json({error:'Question must be 4–220 characters'},400,allowed);
  if(!env.AI||!env.RATE||!env.GLOBAL_RATE)return json({error:'Service not configured'},503,allowed);
  // Low per-IP limit + shared global throttle protect the free daily neuron allowance.
  // These are approximate point-of-presence limits; the Cloudflare free allocation itself is the spending cap.
  const clientKey=request.headers.get('cf-connecting-ip')||'unknown';
  const [perClient,global]=await Promise.all([env.RATE.limit({key:'client:'+clientKey}),env.GLOBAL_RATE.limit({key:'global'})]);
  if(!perClient.success||!global.success)return json({error:'Search limit reached. Try again shortly.'},429,allowed);
  try{
   const output=await env.AI.run(MODEL,{
    messages:[{role:'system',content:SYSTEM},{role:'user',content:question.trim()}],
    response_format:{type:'json_schema',json_schema:SCHEMA},
    max_tokens:270,
    temperature:0
   });
   const plan=reconcileQuestion(question,parseModel(output));
   return json({ok:true,plan},200,allowed);
  }catch(error){
   console.warn('Ask FIG inference failed',String(error?.message||error).slice(0,200));
   return json({error:'Free AI interpreter temporarily unavailable'},503,allowed);
  }
 }
};
