/* BoekMuse v2 — dynamic read-only SQL on a versioned Cloudflare D1 league mirror.
   AI proposes a SELECT. D1, never the model, calculates every numeric result.
   Sync runs only against public, finalized, published JSON. */
const MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const BASE='https://ufboek.github.io/fantasy-league-records/data/';
const TEAMS='1 Boek; 2 Fru; 3 Fromm; 4 Sack; 5 Leyton; 6 Hayden; 7 Line (Lionel); 8 Winston; 9 CamNol; 10 James';
const SCHEMA= [
 'THESE ARE THE ONLY SQL VIEWS YOU MAY QUERY. All rows represent published finalized games:',
 'games(season INTEGER, week INTEGER, game_type TEXT, team_id INTEGER, opponent_id INTEGER, points REAL, opponent_points REAL, win INTEGER, loss INTEGER, tie INTEGER, margin REAL, game_url TEXT). One row PER TEAM PER GAME, not one row per matchup. game_type is "Regular Season" or "Playoffs".',
 'starts(season INTEGER, week INTEGER, game_type TEXT, team_id INTEGER, player_id TEXT, player_name TEXT, position TEXT, fantasy_points REAL, rush_td INTEGER, rec_td INTEGER, td INTEGER, td_verified INTEGER, player_url TEXT). One row per actual STARTED player. QB/non-QB counts by position. TD stats NULL if unavailable.',
 'td_coverage(season INTEGER, week INTEGER, game_type TEXT, team_id INTEGER). One row per team-game for which EVERY started non-QB offensive RB/WR/TE/FB has verified rushing+receiving TD records.',
 'team_seasons(season INTEGER, team_id INTEGER, games INTEGER, wins INTEGER, losses INTEGER, points_for REAL, points_against REAL, points_per_game REAL, all_play_wins INTEGER, all_play_losses INTEGER, all_play_win_pct REAL, regular_finish INTEGER, max_pf REAL). One row per team/season, some seasons still ongoing.',
 'trades(trade_id TEXT, season INTEGER, week INTEGER, total_player_assets INTEGER, total_pick_assets INTEGER, faab_transferred REAL). One row per completed trade.',
 'trade_participants(trade_id TEXT, team_id INTEGER, received_count INTEGER, sent_count INTEGER, players_received INTEGER, players_sent INTEGER, picks_received INTEGER, picks_sent INTEGER). One row per team SIDE of a completed trade.',
 'trade_assets(trade_id TEXT, team_id INTEGER, direction TEXT, asset_name TEXT). One row per asset received or sent, direction "received" or "sent".',
 'draft_picks(season INTEGER, team_id INTEGER, draft_round INTEGER, pick_no INTEGER, player_id TEXT, player_name TEXT, position TEXT, draft_class TEXT). One row per drafted player.',
 'Team identifiers: '+TEAMS+'. Aliases Sak=Sack, Lionel=Line.',
 'Use standard SQLite SQL SELECT, JOIN, CTE, aggregates, CASE, subqueries, window functions; never write to a table.',
 'No ambiguous assumptions: state in "understood" which team, season, scoring metric and grouping were used.',
 'Only request fields that exist in these views. If the requested raw data does not exist, set supported=false and explain missing data; DO NOT substitute another metric (game COUNT is NOT touchdowns).',
 'CRITICAL: team_seasons.points_for and team_seasons.losses are SEASON TOTALS. Questions about weeks/games when a team scored 200+ and lost MUST use games (points>=200 AND loss=1), then COUNT/group by team. Season cumulative points_for>=200 is never equivalent to scoring 200 in one game.',
 'Never select the latest, first or a specific season unless the question explicitly asks for that season or this/latest season. Without a year request, include ALL seasons. The question might ask for the MOST games, not the MOST RECENT games.',
 'Examples: Who had 3 starting WRs with 20+ points in a week? SELECT team_id,season,week,COUNT(*) AS qualifying_wrs FROM starts WHERE position=\'WR\' AND fantasy_points>=20 GROUP BY team_id,season,week HAVING COUNT(*)>=3 ORDER BY qualifying_wrs DESC,season,week.',
 'How many non-QB offensive TDs did Boek starters have each 2026 week? SELECT s.week,SUM(s.td) AS touchdowns,COUNT(*) AS non_qb_starts FROM starts s JOIN td_coverage c ON c.season=s.season AND c.week=s.week AND c.game_type=s.game_type AND c.team_id=s.team_id WHERE s.team_id=1 AND s.season=2026 AND s.game_type=\'Regular Season\' AND s.position IN (\'RB\',\'WR\',\'TE\',\'FB\') GROUP BY s.week ORDER BY s.week.',
 'Use td_coverage JOIN for any non-QB touchdown calculation, AND ensure sum only non-QB RB/WR/TE/FB. Exclude QB passing TDs. TDs for players without verified coverage must NOT be presented as complete.',
'When a user asks for TOTAL touchdowns, include SUM(s.td) AS touchdowns as an explicit numeric result column, even if you also show rushing and receiving breakdowns separately. The total must be visible without mental addition.',
 'Which team has most wins against Hayden? SELECT team_id,COUNT(*) AS wins FROM games WHERE opponent_id=6 AND win=1 AND game_type=\'Regular Season\' GROUP BY team_id ORDER BY wins DESC.',
 'Use a LIMIT of 50 or less, unless the question needs all weeks (max 100 output rows). Use sensible column aliases.',
 'RETURN JSON with supported:boolean, sql:string, title:string, understood:string, reason:string. SQL SELECT only. No markdown fences.'
].join('\n');
const QUERY_SCHEMA={type:'object',properties:{
 supported:{type:'boolean'},sql:{type:'string'},title:{type:'string'},
 understood:{type:'string'},reason:{type:'string'}
},required:['supported','sql','title','understood','reason'],additionalProperties:false};
function reply(data,status=200,origin=''){
 const h={'content-type':'application/json;charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','vary':'Origin'};
 if(origin)h['access-control-allow-origin']=origin;
 return new Response(JSON.stringify(data),{status,headers:h});
}
function originAllowed(req,env){
 const origin=req.headers.get('Origin')||'';
 return (env.ALLOWED_ORIGINS||'https://ufboek.github.io').split(',').map(s=>s.trim()).includes(origin)?origin:'';
}
const TABLE_COLUMNS={
 games:['generation','season','week','game_type','team_id','opponent_id','points','opponent_points','win','loss','tie','margin','game_url'],
 starts:['generation','season','week','game_type','team_id','player_id','player_name','position','fantasy_points','rush_td','rec_td','td','td_verified','player_url'],
 td_coverage:['generation','season','week','game_type','team_id'],
 team_seasons:['generation','season','team_id','games','wins','losses','points_for','points_against','points_per_game','all_play_wins','all_play_losses','all_play_win_pct','regular_finish','max_pf'],
 trades:['generation','trade_id','season','week','total_player_assets','total_pick_assets','faab_transferred'],
 trade_participants:['generation','trade_id','team_id','received_count','sent_count','players_received','players_sent','picks_received','picks_sent'],
 trade_assets:['generation','trade_id','team_id','direction','asset_name'],
 draft_picks:['generation','season','team_id','draft_round','pick_no','player_id','player_name','position','draft_class']
};
const TYPES={
 games:'INTEGER INTEGER INTEGER TEXT INTEGER INTEGER REAL REAL INTEGER INTEGER INTEGER REAL TEXT',
 starts:'INTEGER INTEGER INTEGER TEXT INTEGER TEXT TEXT TEXT REAL INTEGER INTEGER INTEGER INTEGER TEXT',
 td_coverage:'INTEGER INTEGER INTEGER TEXT INTEGER',
 team_seasons:'INTEGER INTEGER INTEGER INTEGER INTEGER INTEGER REAL REAL REAL INTEGER INTEGER REAL INTEGER REAL',
 trades:'INTEGER TEXT INTEGER INTEGER INTEGER INTEGER REAL',
 trade_participants:'INTEGER TEXT INTEGER INTEGER INTEGER INTEGER INTEGER INTEGER INTEGER',
 trade_assets:'INTEGER TEXT INTEGER TEXT TEXT',
 draft_picks:'INTEGER INTEGER INTEGER INTEGER INTEGER TEXT TEXT TEXT TEXT'
};
const PRIMARY_INDEX=[
 'CREATE INDEX IF NOT EXISTS idx_games_season_team ON games_all(generation,team_id,season,week)',
 'CREATE INDEX IF NOT EXISTS idx_games_opp ON games_all(generation,opponent_id,season,week)',
 'CREATE INDEX IF NOT EXISTS idx_starts_week_team ON starts_all(generation,season,week,team_id)',
 'CREATE INDEX IF NOT EXISTS idx_starts_player ON starts_all(generation,player_id,season,week)',
 'CREATE INDEX IF NOT EXISTS idx_starts_pos ON starts_all(generation,position,fantasy_points)',
 'CREATE INDEX IF NOT EXISTS idx_td_coverage ON td_coverage_all(generation,team_id,season,week)',
 'CREATE INDEX IF NOT EXISTS idx_trades_year ON trades_all(generation,season)',
 'CREATE INDEX IF NOT EXISTS idx_trade_people ON trade_participants_all(generation,team_id)',
 'CREATE INDEX IF NOT EXISTS idx_trade_assets ON trade_assets_all(generation,asset_name)',
 'CREATE INDEX IF NOT EXISTS idx_draft_player ON draft_picks_all(generation,player_name)'
];
async function ensureSchema(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS sync_meta (id INTEGER PRIMARY KEY CHECK(id=1), generation INTEGER NOT NULL DEFAULT 0, version TEXT NOT NULL DEFAULT \'\', finished_at TEXT NOT NULL DEFAULT \'\')').run();
 await db.prepare('INSERT OR IGNORE INTO sync_meta(id,generation,version,finished_at) VALUES (1,0,\'\',\'\')').run();
 for(const [name,columns] of Object.entries(TABLE_COLUMNS)){
  const types=TYPES[name].split(' ');
  if(types.length!==columns.length)throw Error('Schema types mismatch for '+name);
  const defs=columns.map((col,i)=>col+' '+types[i]).join(',');
  await db.prepare('CREATE TABLE IF NOT EXISTS '+name+'_all ('+defs+')').run();
  await db.prepare('CREATE VIEW IF NOT EXISTS '+name+' AS SELECT '+columns.slice(1).join(',')+
   ' FROM '+name+'_all WHERE generation=(SELECT generation FROM sync_meta WHERE id=1)').run();
 }
 for(const sql of PRIMARY_INDEX)await db.prepare(sql).run();
}
const GET_KEYS=['refresh_manifest','games','player_game_log','player_weekly_touchdowns',
 'team_season_master','trades','trade_sides','draft_picks'];
async function fetchJson(name){
 const res=await fetch(BASE+name+'.json',{headers:{'cache-control':'no-cache'}});
 if(!res.ok)throw Error('Published source '+name+' unavailable: HTTP '+res.status);
 return res.json();
}
function number(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function str(v){return v===undefined||v===null?'':String(v);}
function snapshotRows(data,generation){
 const rows=Object.fromEntries(Object.keys(TABLE_COLUMNS).map(k=>[k,[]]));
 const td=data.player_weekly_touchdowns||{};
 const coverage=td.coverage||{};
 const tdLookup=new Map((td.records||[]).map(x=>[
  [x.season,x.week,x.game_type,x.franchise_id,x.player_id].join(':'),x]));
 for(const g of data.games){
  const season=number(g.season),week=number(g.week),type=str(g.game_type);
  for(const side of [1,2]){
   const team=number(g['franchise_'+side]),opp=number(g['franchise_'+(3-side)]);
   const points=number(g['score_'+side]),against=number(g['score_'+(3-side)]);
   rows.games.push([generation,season,week,type,team,opp,points,against,
    Number(points>against),Number(points<against),Number(points===against),points-against,
    '#/game/'+season+'/'+week+'/'+g.matchup_id]);
  }
 }
 for(const s of data.player_game_log){
  const season=number(s.season),week=number(s.week),type=str(s.game_type),
   team=number(s.franchise_id),id=str(s.player_id),position=str(s.position).toUpperCase();
  const coverageKey=[season,week,type,team].join(':');
  const tdRow=tdLookup.get(coverageKey+':'+id);
  const verified=Boolean(coverage[coverageKey]&&tdRow&&
   ['RB','WR','TE','FB'].includes(position));
  rows.starts.push([generation,season,week,type,team,id,str(s.player_name),position,
   number(s.starter_points),verified?number(tdRow.rush_td):null,
   verified?number(tdRow.rec_td):null,verified?number(tdRow.touchdowns):null,
   Number(verified),'#/player/'+encodeURIComponent(id)]);
 }
 for(const key of Object.keys(coverage)){
  const bits=key.split(':'),season=number(bits[0]),week=number(bits[1]),
   type=bits[2],team=number(bits[3]);
  if(!season||!week||!team)continue;
  rows.td_coverage.push([generation,season,week,type,team]);
 }
 for(const x of data.team_season_master)rows.team_seasons.push([
  generation,number(x.season),number(x.franchise_id),number(x.games),number(x.wins),
  number(x.losses),number(x.points_for),number(x.points_against),number(x.points_per_game),
  number(x.all_play_wins),number(x.all_play_losses),number(x.all_play_win_pct),
  number(x.regular_season_finish),number(x.max_pf)]);
 for(const x of data.trades)rows.trades.push([
  generation,str(x.transaction_id),number(x.season),number(x.week),
  number(x.total_player_assets),number(x.total_pick_assets),number(x.total_faab_transferred)]);
 for(const x of data.trade_sides){
  const id=str(x.transaction_id),team=number(x.franchise_id);
  rows.trade_participants.push([generation,id,team,number(x.received_asset_count),
   number(x.sent_asset_count),number(x.players_received),number(x.players_sent),
   number(x.picks_received),number(x.picks_sent)]);
  for(const [direction,assets] of [['received',x.assets_received],['sent',x.assets_sent]]){
   for(const asset of assets||[])rows.trade_assets.push([generation,id,team,direction,str(asset)]);
  }
 }
 for(const d of data.draft_picks)rows.draft_picks.push([
  generation,number(d.draft_season),number(d.franchise_id),number(d.round),
  number(d.pick_no),str(d.player_id),str(d.player_name),str(d.position),str(d.draft_class)]);
 return rows;
}
async function storeRows(db,table,rows){
 const fields=TABLE_COLUMNS[table];
 const perStatement=Math.max(1,Math.floor(80/fields.length));
 const bound=[];
 for(let i=0;i<rows.length;i+=perStatement){
  const chunk=rows.slice(i,i+perStatement);
  const sql='INSERT INTO '+table+'_all ('+fields.join(',')+') VALUES '+
   chunk.map(()=> '('+fields.map(()=>'?').join(',')+')').join(',');
  bound.push(db.prepare(sql).bind(...chunk.flat()));
 }
 for(let i=0;i<bound.length;i+=12)await db.batch(bound.slice(i,i+12));
}
async function synchronize(env){
 if(!env.DB)throw Error('No D1 binding');
 await ensureSchema(env.DB);
 const manifest=await fetchJson('refresh_manifest');
 const version=str(manifest.updated_at);
 if(!version)throw Error('Published refresh manifest lacks updated_at');
 const last=await env.DB.prepare('SELECT version,generation FROM sync_meta WHERE id=1').first();
 if(last&&last.generation>0&&last.version===version)return {updated:false,version};
 const names=GET_KEYS.filter(n=>n!=='refresh_manifest');
 const payloads=await Promise.all(names.map(fetchJson));
 const data=Object.fromEntries(names.map((n,i)=>[n,payloads[i]]));
 for(const name of ['games','player_game_log','team_season_master','trades','trade_sides','draft_picks']){
  if(!Array.isArray(data[name])||!data[name].length)throw Error('Missing published rows: '+name);
 }
 if(!Array.isArray(data.player_weekly_touchdowns?.records))throw Error('Missing touchdown archive');
 const generation=Date.now();
 const rows=snapshotRows(data,generation);
 for(const [name,items] of Object.entries(rows))await storeRows(env.DB,name,items);
 // Only publish the new generation when ALL inserts have completed.
 await env.DB.prepare('UPDATE sync_meta SET generation=?,version=?,finished_at=? WHERE id=1')
  .bind(generation,version,new Date().toISOString()).run();
 // Old snapshots are cleaned only after the new one is active.
 for(const name of Object.keys(rows))await env.DB.prepare(
  'DELETE FROM '+name+'_all WHERE generation!=?').bind(generation).run();
 return {updated:true,version,counts:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,v.length]))};
}
function sqlClean(input){
 if(typeof input!=='string'||input.length<10||input.length>4500)throw Error('Invalid SQL length');
 const sql=input.trim();
 const scrub=sql.replace(/'(?:''|[^'])*'/g,"''").replace(/"(?:""|[^"])*"/g,'""');
 if(!/^(SELECT|WITH)\b/i.test(scrub))throw Error('Only SELECT or nonrecursive WITH queries allowed');
 if(/;|--|\/\*|\*\/|#/.test(scrub))throw Error('SQL comments or multiple statements not permitted');
 if(/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|ATTACH|DETACH|REPLACE|VACUUM|REINDEX|ANALYZE|TRIGGER|RECURSIVE|INTO|RETURNING|LOAD_EXTENSION|RANDOMBLOB|ZEROBLOB)\b/i.test(scrub))throw Error('Write, recursive, or unsafe SQL denied');
 if(/\b(sqlite_|sync_meta|_all\b)/i.test(scrub))throw Error('Internal tables not available');
 if((scrub.match(/\bJOIN\b/gi)||[]).length>8)throw Error('Too many table joins');
 if(!/\b(games|starts|td_coverage|team_seasons|trades|trade_participants|trade_assets|draft_picks)\b/i.test(scrub))
  throw Error('Query must read published league tables');
 if(/\b(?:SLEEP|BENCH|USER_PASSWORD)\s*\(/i.test(scrub))throw Error('Unknown operation');
 return sql;
}
function questionGuard(question,sql){
 const q=question.toLowerCase();
 // Verify the distinction between weekly game scores and season aggregate totals.
 const weeklySubject=/\b(?:games?|weeks?|matchups?)\b/.test(q);
 const scoringSubject=/\b(?:scor(?:e|ed|ing)|points?|pts|put up)\b/.test(q);
 const threshold=/\b(?:at least|over|more than|under|below|above|fewer than|less than)\s*\d+\s*(?:points?|pts)?\b|\b\d+\+\s*(?:points?|pts)?\b/.test(q);
 if(weeklySubject&&scoringSubject&&threshold){
  if(!/\b(?:games|starts)\b/i.test(sql)||(/\bteam_seasons\b/i.test(sql)&&!/\b(?:games|starts)\b/i.test(sql)))
   throw Error('The question requires individual GAME scores and filters. Season totals are not a substitute; use games.points or starts.fantasy_points.');
  if(/\b(?:most|fewest)\b/.test(q)&&/\b(?:lost|loss|losses|won|win|wins)\b/.test(q)&&
   !/\b(?:COUNT|SUM)\s*\(/i.test(sql))
   throw Error('Counting qualifying games requires COUNT or SUM over individual weekly game rows.');
 }
 if(!/\b(?:current|this|latest|most recent)\s+season\b/.test(q)&&
  !/\b20(?:2[3-9]|3\d)\b/.test(q)&&
  /\bseason\s*=\s*\(\s*SELECT\s+MAX\s*\(\s*season\s*\)/i.test(sql))
  throw Error('Do not invent a latest-season filter; the user did not specify a season. Include all league years.');

 if(/\b(?:touchdowns?|tds?)\b/.test(q)){
  if(!/\bstarts\b/i.test(sql)||!/\b(?:td|rush_td|rec_td)\b/i.test(sql)||
   !/\btd_coverage\b/i.test(sql))
   throw Error('Touchdown questions require verified player TDs and complete-week coverage, not game counts');
 }
 if(/\b(?:rushing|receiving|passing)\s+yards?\b/.test(q))
  throw Error('Raw rushing, receiving and passing yards are not in the indexed archive');
}
// Provenance gate: never claim a complete touchdown total if the published
// starter-to-NFL-stat join lacks even one finalized team-week in the requested scope.
async function checkTdCompleteness(db,question){
 const q=question.toLowerCase();
 if(!/\b(?:touchdowns?|tds?)\b/.test(q))return null;
 const names=[
  [1,/\bboek\b/],[2,/\bfru\b/],[3,/\bfromm\b/],[4,/\b(?:sack|sak)\b/],
  [5,/\bleyton\b/],[6,/\bhayden\b/],[7,/\b(?:line|lionel)\b/],
  [8,/\bwinston\b/],[9,/\bcamnol\b/],[10,/\bjames\b/]
 ];
 const teams=names.filter(([,r])=>r.test(q)).map(([id])=>id);
 const years=[...q.matchAll(/\b20(?:2[3-9]|3\d)\b/g)].map(m=>Number(m[0]));
 const cond=[],args=[];
 if(!/\b(all games|including playoffs|regular and playoffs)\b/.test(q)){
  cond.push('g.game_type=?');args.push(/\bplayoffs?\b/.test(q)?'Playoffs':'Regular Season');
 }
 if(teams.length){
  cond.push('g.team_id IN ('+teams.map(()=>'?').join(',')+')');args.push(...teams);
 }
 if(years.length===1){
  if(/\b(since|after|from)\s+(?:the\s+)?(?:season\s+)?20\d\d/.test(q)){
   cond.push('g.season>=?');args.push(years[0]);
  }else if(/\b(before|until|through)\s+(?:the\s+)?(?:season\s+)?20\d\d/.test(q)){
   cond.push('g.season<=?');args.push(years[0]);
  }else{
   cond.push('g.season=?');args.push(years[0]);
  }
 }else if(years.length===2){
  cond.push('g.season BETWEEN ? AND ?');args.push(Math.min(...years),Math.max(...years));
 }
 const sql='SELECT COUNT(*) AS missing FROM games g LEFT JOIN td_coverage c ON '+
  'g.season=c.season AND g.week=c.week AND g.game_type=c.game_type AND g.team_id=c.team_id WHERE c.team_id IS NULL'+
  (cond.length?' AND '+cond.join(' AND '):'');
 const row=await db.prepare(sql).bind(...args).first();
 if(Number(row?.missing||0)>0){
  return 'The published NFL touchdown archive is missing '+row.missing+
   ' finalized team-week(s) in this requested scope. I cannot give a complete touchdown total. '+
   'Try a specific team and season, or use another statistic.';
 }
 return null;
}

function prompt(question,previous,error){
 return [
  {role:'system',content:'You are BoekMuse, the SQL planner for a fantasy football database. You must NOT invent results. '+SCHEMA},
  ...(previous?[{role:'user',content:'Previous query: '+previous.question+'\nPrevious SQL: '+previous.sql+'\nCurrent follow-up: '+question}]:
   [{role:'user',content:question}]),
  ...(error?[{role:'assistant',content:'The last SQL failed verification.'},
   {role:'user',content:'Correct the SQL without inventing columns or changing the question. Error: '+error}]:[])
 ];
}
function parsePlan(value){
 const output=typeof value?.response==='string'?JSON.parse(value.response):value?.response;
 if(!output||typeof output!=='object'||typeof output.supported!=='boolean')throw Error('AI output invalid');
 return output;
}
async function interpret(env,question,previous,error){
 const output=await env.AI.run(MODEL,{
  messages:prompt(question,previous,error),response_format:{type:'json_schema',json_schema:QUERY_SCHEMA},
  max_tokens:720,temperature:0
 });
 return parsePlan(output);
}
function normalizeResult(row){
 const entries=Object.entries(row);
 return Object.fromEntries(entries.map(([k,v])=>[k,typeof v==='number'&&Number.isFinite(v)?
  Math.round(v*10000)/10000:v]));
}
async function runQuery(env,question,previous){
 let lastError='';
 for(let attempt=0;attempt<2;attempt++){
  const plan=await interpret(env,question,previous,lastError);
  if(!plan.supported)return {ok:false,unsupported:true,message:str(plan.reason||'The required data are not available.')};
  try{
   const sql=sqlClean(plan.sql);
   questionGuard(question,sql);
   const stmt=env.DB.prepare('SELECT * FROM ('+sql+') AS verified_result LIMIT 100');
   const data=await stmt.all();
   const rows=(data.results||[]).map(normalizeResult);
   if(!rows.length)return {ok:false,unsupported:false,message:'No published records matched that query. The AI did not substitute another statistic.',sql};
   return {ok:true,version:'dynamic-sql-v2',title:str(plan.title).slice(0,120),
    understood:str(plan.understood).slice(0,400),sql,source:'Cloudflare D1 · published finalized Sleeper league archive',
    columns:Object.keys(rows[0]),rows,previous:{question,sql}};
  }catch(e){lastError=String(e?.message||e).slice(0,300);}
 }
 return {ok:false,unsupported:false,message:'Could not verify a valid calculation. The AI did not provide a trustworthy query. '+lastError};
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),origin=originAllowed(request,env);
  if(url.pathname==='/health'){
   if(!env.DB)return reply({ok:false,ready:false,error:'Database binding missing'},503,origin);
   try{await ensureSchema(env.DB);const meta=await env.DB.prepare(
    'SELECT generation,version,finished_at FROM sync_meta WHERE id=1').first();
    return reply({ok:true,ready:!!meta?.generation,version:meta?.version||null,
     finished_at:meta?.finished_at||null,model:MODEL},200,origin);
   }catch(e){return reply({ok:false,error:'Database unavailable'},503,origin);}
  }
  // One-time initialization trigger; cannot be used to force repeated writes.
  if(url.pathname==='/bootstrap'&&request.method==='GET'){
   await ensureSchema(env.DB);
   const meta=await env.DB.prepare('SELECT generation FROM sync_meta WHERE id=1').first();
   if(meta?.generation)return reply({ok:true,ready:true,already_initialized:true},200,origin);
   try {
    const synced=await synchronize(env);
    return reply({ok:true,ready:true,initialized:true,synced},200,origin);
   }catch(e){
    console.error('D1 bootstrap:',String(e).slice(0,400));
    return reply({ok:false,ready:false,error:'Bootstrap failed: '+String(e?.message||e).slice(0,250)},503,origin);
   }
  }
  if(url.pathname!=='/query')return reply({ok:false,error:'Not found'},404,origin);
  if(!origin)return reply({ok:false,error:'Origin not permitted'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
   'access-control-allow-origin':origin,'access-control-allow-methods':'POST,OPTIONS',
   'access-control-allow-headers':'content-type','access-control-max-age':'600','vary':'Origin'
  }});
  if(request.method!=='POST'||!/^application\/json\b/i.test(request.headers.get('content-type')||''))
   return reply({ok:false,error:'JSON POST required'},405,origin);
  if(Number(request.headers.get('content-length')||0)>1600)return reply({ok:false,error:'Request too large'},413,origin);
  const body=await request.json().catch(()=>null),question=body?.question;
  if(typeof question!=='string'||question.trim().length<4||question.length>250)
   return reply({ok:false,error:'Question must be 4–250 characters'},400,origin);
  if(!env.DB||!env.AI||!env.RATE||!env.GLOBAL_RATE)
   return reply({ok:false,error:'AI service or database not configured'},503,origin);
  const meta=await env.DB.prepare('SELECT generation,version FROM sync_meta WHERE id=1').first();
  if(!meta?.generation)return reply({ok:false,error:'League SQL index is initializing. Retry after the next refresh.'},503,origin);
  const client=request.headers.get('cf-connecting-ip')||'anonymous';
  const [a,b]=await Promise.all([env.RATE.limit({key:'v2:'+client}),env.GLOBAL_RATE.limit({key:'v2:global'})]);
  if(!a.success||!b.success)return reply({ok:false,error:'Daily free search capacity is protected. Try again shortly.'},429,origin);
  const prev=body?.previous;
  const previous=prev&&typeof prev.question==='string'&&typeof prev.sql==='string'&&
   prev.question.length<250&&prev.sql.length<4500?{question:prev.question,sql:prev.sql}:null;
  try{
   const missing=await checkTdCompleteness(env.DB,question);
   if(missing)return reply({ok:false,unsupported:true,message:missing},200,origin);
   const answer=await runQuery(env,question.trim(),previous);
   return reply(answer,200,origin);
  }catch(e){
   console.error('BoekMuse v2 AI:',String(e?.message||e).slice(0,250));
   return reply({ok:false,error:'Free AI inference unavailable. No estimated answer returned.'},503,origin);
  }
 },
 async scheduled(event,env,ctx){
  ctx.waitUntil(synchronize(env).then(x=>console.log('BoekMuse D1 sync',JSON.stringify(x)))
   .catch(e=>console.error('BoekMuse D1 sync failed',String(e).slice(0,350))));
 }
};
