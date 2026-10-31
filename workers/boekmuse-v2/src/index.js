/* BoekMuse v2 — dynamic read-only SQL on a versioned Cloudflare D1 league mirror.
   AI proposes a SELECT. D1, never the model, calculates every numeric result.
   Sync runs only against public, finalized, published JSON. */
const MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const BASE='https://ufboek.github.io/fantasy-league-records/data/';
const TEAMS='1 Boek; 2 Fru; 3 Fromm; 4 Sack; 5 Leyton; 6 Hayden; 7 Line (Lionel); 8 Winston; 9 CamNol; 10 James';
const SCHEMA= [
 'THESE ARE THE ONLY SQL VIEWS YOU MAY QUERY. Core scoring views contain finalized games; archive views include published live snapshots, model projections and historical reference data:',
 'games(season INTEGER, week INTEGER, game_type TEXT, team_id INTEGER, opponent_id INTEGER, points REAL, opponent_points REAL, win INTEGER, loss INTEGER, tie INTEGER, margin REAL, game_url TEXT). One row PER TEAM PER GAME, not one row per matchup. game_type is "Regular Season" or "Playoffs".',
 'starts(season INTEGER, week INTEGER, game_type TEXT, team_id INTEGER, player_id TEXT, player_name TEXT, position TEXT, fantasy_points REAL, rush_td INTEGER, rec_td INTEGER, td INTEGER, td_verified INTEGER, player_url TEXT). One row per actual STARTED player. QB/non-QB counts by position. TD stats NULL if unavailable.',
 'td_coverage(season INTEGER, week INTEGER, game_type TEXT, team_id INTEGER). One row per team-game for which EVERY started non-QB offensive RB/WR/TE/FB has verified rushing+receiving TD records.',
 'team_seasons(season INTEGER, team_id INTEGER, games INTEGER, wins INTEGER, losses INTEGER, points_for REAL, points_against REAL, points_per_game REAL, all_play_wins INTEGER, all_play_losses INTEGER, all_play_win_pct REAL, regular_finish INTEGER, max_pf REAL). One row per team/season, some seasons still ongoing.',
 'trades(trade_id TEXT, season INTEGER, week INTEGER, total_player_assets INTEGER, total_pick_assets INTEGER, faab_transferred REAL). One row per completed trade.',
 'trade_participants(trade_id TEXT, team_id INTEGER, received_count INTEGER, sent_count INTEGER, players_received INTEGER, players_sent INTEGER, picks_received INTEGER, picks_sent INTEGER). One row per team SIDE of a completed trade.',
 'trade_assets(trade_id TEXT, team_id INTEGER, direction TEXT, asset_name TEXT). One row per asset received or sent, direction "received" or "sent".',
 'draft_picks(season INTEGER, team_id INTEGER, draft_round INTEGER, pick_no INTEGER, player_id TEXT, player_name TEXT, position TEXT, draft_class TEXT). One row per drafted player.',
 'archive_catalog(dataset TEXT, section TEXT, format TEXT, item_count INTEGER, fields TEXT, sample TEXT) and archive_chunks(dataset TEXT, section TEXT, chunk_no INTEGER, format TEXT, payload TEXT) cover ALL other published league data. Use JSON1 json_each/json_extract for arbitrary records. See the live archive catalog below. Historical facts must not be confused with projections, values, injury annotations or incomplete live results.',
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
 'For most/fewest/best/worst rankings, show a sorted leaderboard of relevant managers including all ties for first place; do not apply LIMIT 1 unless the user expressly requests one answer. Returning every tied leader is essential.',
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
 // Upgrade older installations from a global generation to per-table versions.
 // This lets unchanged history tables retain their rows when a live snapshot
 // refreshes, staying inside D1 Free's 100k daily row-write allowance.
 await db.prepare('CREATE TABLE IF NOT EXISTS core_table_meta (name TEXT PRIMARY KEY,generation INTEGER NOT NULL,content_hash TEXT NOT NULL)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS core_schema_settings (name TEXT PRIMARY KEY,version INTEGER NOT NULL)').run();
 const migration=await db.prepare("SELECT version FROM core_schema_settings WHERE name='views'").first();
 if(!migration||migration.version<2){
  for(const [name,columns] of Object.entries(TABLE_COLUMNS)){
   await db.prepare('INSERT OR IGNORE INTO core_table_meta(name,generation,content_hash) VALUES(?,(SELECT generation FROM sync_meta WHERE id=1),\'\')').bind(name).run();
   await db.prepare('DROP VIEW IF EXISTS '+name).run();
   await db.prepare('CREATE VIEW '+name+' AS SELECT '+columns.slice(1).join(',')+
    ' FROM '+name+'_all WHERE generation=(SELECT generation FROM core_table_meta WHERE name=\''+name+'\')').run();
  }
  await db.prepare("INSERT OR REPLACE INTO core_schema_settings(name,version) VALUES('views',2)").run();
 }
}

/* Complete published archive index. JSON chunks preserve every original field,
   including nested source objects. Ordinary SQL remains available in D1 views.
   Hashes prevent unnecessary D1 writes on the free tier. */
const EXTRA_DATASETS=[
 'draft_pick_outcomes_audit','draft_pick_round_reconciliation',
 'dynasty_dominance_projection','dynasty_market_history','dynasty_nfl_history',
 'injury_candidate_leads','injury_candidates','injury_discovery_candidates',
 'injury_events_reviewed','injury_history','playoff_nfl_weekly_scores',
 'playoff_player_scores','player_weekly_touchdowns','published_weekly_scores',
 'rosteraudit_values','trade_lineage','verified_week_cutoffs','waiver_fa',
 'waiver_player_names'
];
const CHUNK_TARGET=44000;
function archiveDatasetNames(manifest){
 return [...new Set([...Object.keys(manifest||{}),...EXTRA_DATASETS])]
  .filter(x=>/^[a-z][a-z0-9_]{1,80}$/.test(x)&&!['manifest','refresh_manifest'].includes(x))
  .sort();
}
// Array rows are packed as JSON arrays; keyed source objects are packed as JSON
// objects so json_each(chunk.payload) gives the original key and value.
function createArchiveChunks(name,data){
 const result=[],catalog=[];
 function addSection(section,entries,format){
  let batch=[],bytes=2,count=0,chunk=0,sample=null,fields=new Set();
  function flush(){
   if(!batch.length)return;
   const payload=format==='array'?'['+batch.join(',')+']':'{'+batch.join(',')+'}';
   result.push([name,section,chunk++,format,payload]);
   batch=[];bytes=2;
  }
  for(const [key,item] of entries){
   if(sample===null)sample=item;
   if(item&&typeof item==='object'&&!Array.isArray(item))
    Object.keys(item).slice(0,45).forEach(k=>fields.add(k));
   const content=format==='array'?JSON.stringify(item):JSON.stringify(String(key))+':'+JSON.stringify(item);
   if(content===undefined)continue;
   if(batch.length&&bytes+content.length+1>CHUNK_TARGET)flush();
   batch.push(content);bytes+=content.length+1;count++;
  }
  flush();
  catalog.push([name,section,format,count,[...fields].join(',').slice(0,850),
   JSON.stringify(sample===null?{}:sample).slice(0,700)]);
 }
 if(Array.isArray(data))addSection('root',data.map((x,i)=>[i,x]),'array');
 else if(data&&typeof data==='object'){
  const metadata={};
  for(const [key,value] of Object.entries(data)){
   if(Array.isArray(value))addSection(key,value.map((x,i)=>[i,x]),'array');
   else if(value&&typeof value==='object')addSection(key,Object.entries(value),'object');
   else metadata[key]=value;
  }
  if(Object.keys(metadata).length)addSection('__meta__',Object.entries(metadata),'object');
 }else addSection('root',[[0,{value:data}]],'array');
 return {chunks:result,catalog};
}
async function ensureArchiveSchema(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS archive_source_meta (dataset TEXT PRIMARY KEY, generation INTEGER NOT NULL, content_hash TEXT NOT NULL, synced_at TEXT NOT NULL, item_count INTEGER NOT NULL, chunk_count INTEGER NOT NULL)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS archive_chunks_all (dataset TEXT NOT NULL, generation INTEGER NOT NULL, section TEXT NOT NULL, chunk_no INTEGER NOT NULL, format TEXT NOT NULL, payload TEXT NOT NULL)').run();
 await db.prepare('CREATE INDEX IF NOT EXISTS idx_archive_chunk ON archive_chunks_all(dataset,generation,section,chunk_no)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS archive_catalog_all (dataset TEXT NOT NULL, generation INTEGER NOT NULL, section TEXT NOT NULL, format TEXT NOT NULL, item_count INTEGER NOT NULL, fields TEXT NOT NULL, sample TEXT NOT NULL)').run();
 await db.prepare('CREATE INDEX IF NOT EXISTS idx_archive_catalog ON archive_catalog_all(dataset,generation,section)').run();
 await db.prepare('CREATE VIEW IF NOT EXISTS archive_chunks AS SELECT c.dataset,c.section,c.chunk_no,c.format,c.payload FROM archive_chunks_all c JOIN archive_source_meta m ON m.dataset=c.dataset AND m.generation=c.generation').run();
 await db.prepare('CREATE VIEW IF NOT EXISTS archive_catalog AS SELECT c.dataset,c.section,c.format,c.item_count,c.fields,c.sample FROM archive_catalog_all c JOIN archive_source_meta m ON m.dataset=c.dataset AND m.generation=c.generation').run();
}
async function contentDigest(raw){
 const bytes=new TextEncoder().encode(raw);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
async function archiveSyncOne(env,name,knownHash){
 const response=await fetch(BASE+name+'.json',{headers:{'cache-control':'no-cache'}});
 if(!response.ok)throw Error('Archive source '+name+' HTTP '+response.status);
 const raw=await response.text(),hash=await contentDigest(raw);
 if(hash===knownHash)return {dataset:name,changed:false};
 const parsed=JSON.parse(raw),prepared=createArchiveChunks(name,parsed),generation=Date.now();
 const db=env.DB;
 for(let i=0;i<prepared.chunks.length;i+=8){
  const group=prepared.chunks.slice(i,i+8);
  await db.batch(group.map(x=>db.prepare(
   'INSERT INTO archive_chunks_all(dataset,section,chunk_no,format,payload,generation) VALUES(?,?,?,?,?,?)'
  ).bind(x[0],x[1],x[2],x[3],x[4],generation)));
 }
 for(let i=0;i<prepared.catalog.length;i+=8){
  const group=prepared.catalog.slice(i,i+8);
  await db.batch(group.map(x=>db.prepare(
   'INSERT INTO archive_catalog_all(dataset,section,format,item_count,fields,sample,generation) VALUES(?,?,?,?,?,?,?)'
  ).bind(x[0],x[1],x[2],x[3],x[4],x[5],generation)));
 }
 const items=prepared.catalog.reduce((sum,x)=>sum+x[3],0);
 // Publish the complete new dataset atomically. Failed partial writes are invisible.
 await db.prepare('INSERT INTO archive_source_meta(dataset,generation,content_hash,synced_at,item_count,chunk_count) VALUES(?,?,?,?,?,?) ON CONFLICT(dataset) DO UPDATE SET generation=excluded.generation,content_hash=excluded.content_hash,synced_at=excluded.synced_at,item_count=excluded.item_count,chunk_count=excluded.chunk_count')
  .bind(name,generation,hash,new Date().toISOString(),items,prepared.chunks.length).run();
 await db.prepare('DELETE FROM archive_chunks_all WHERE dataset=? AND generation!=?').bind(name,generation).run();
 await db.prepare('DELETE FROM archive_catalog_all WHERE dataset=? AND generation!=?').bind(name,generation).run();
 return {dataset:name,changed:true,items,chunks:prepared.chunks.length};
}
async function synchronizeArchive(env,maxSources=20){
 await ensureArchiveSchema(env.DB);
 const manifest=await fetchJson('manifest'),names=archiveDatasetNames(manifest);
 const state=await env.DB.prepare('SELECT dataset,content_hash,synced_at FROM archive_source_meta').all();
 const previous=new Map((state.results||[]).map(r=>[r.dataset,r]));
 // Prioritize never-indexed sources; then rotate old source checks to capture
 // current rosters, valuations, simulations and historical refreshes.
 names.sort((a,b)=>{
  const x=previous.get(a),y=previous.get(b);
  if(!x&&!y)return 0;
  if(!x)return -1;if(!y)return 1;
  return x.synced_at.localeCompare(y.synced_at);
 });
 const results=[];
 for(const name of names.slice(0,maxSources)){
  try{results.push(await archiveSyncOne(env,name,previous.get(name)?.content_hash||''));}
  catch(e){console.error('Archive dataset '+name+':',String(e).slice(0,230));
   results.push({dataset:name,error:String(e).slice(0,180)});}
 }
 return {indexed:previous.size,available:names.length,checked:results};
}
async function archiveStatus(db){
 const manifest=await fetchJson('manifest').catch(()=>({}));
 const total=archiveDatasetNames(manifest).length;
 const row=await db.prepare('SELECT COUNT(*) AS sources,COALESCE(SUM(item_count),0) AS records,COALESCE(SUM(chunk_count),0) AS chunks FROM archive_source_meta').first();
 return {sources:Number(row?.sources||0),total,records:Number(row?.records||0),chunks:Number(row?.chunks||0)};
}
async function archiveSchemaPrompt(db,question){
 const list=await db.prepare('SELECT dataset,section,format,item_count,fields,sample FROM archive_catalog ORDER BY dataset,section').all();
 const rows=list.results||[];
 const all=[...new Set(rows.map(x=>x.dataset))];
 // Give all available source names and their sections. Highlight relevant field
 // definitions to keep inference inside free-tier input budgets.
 const words=question.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>3);
 const hints=[
  ['roster',['roster','bench','lineup','starter','slot','taxi','reserve']],
  ['pick',['pick','draft','rookie']],
  ['trade',['trade','asset','transaction','faab']],
  ['injury',['injury','injured']],
  ['projection',['projection','projected','future','forecast','dominance','challenger','simulation']],
  ['value',['value','dynasty','market','rank']],
  ['all_play',['allplay','all-play','all play','schedule','luck']],
  ['streak',['streak','consecutive']],
  ['record',['record','most','best','highest','worst']],
  ['waiver',['waiver','free agent','add','drop']]
 ];
 const q=question.toLowerCase();
 const matched=new Set(all.filter(name=>words.some(w=>name.includes(w)||w.includes(name))));
 for(const [keyword,triggers] of hints)if(triggers.some(t=>q.includes(t)))
  all.filter(name=>name.includes(keyword)).forEach(name=>matched.add(name));
 let excerpts=rows.map(r=>{
  const detail=matched.has(r.dataset)?' fields='+r.fields.slice(0,450)+
   ' sample='+r.sample.slice(0,270):' fields='+r.fields.slice(0,130);
  return r.dataset+'/'+r.section+' ('+r.format+', '+r.item_count+' entries)'+detail;
 });
 // Avoid cutting source names off: dataset list remains complete even if the
 // per-section field catalog must be summarized.
 if(excerpts.join('\n').length>12500)excerpts=excerpts.map(x=>x.slice(0,170));
 return 'Indexed archive datasets: '+all.join(', ')+
  '\nArchive dataset sections and sample JSON fields:\n'+excerpts.join('\n')+
  '\nTo query a dataset: FROM archive_chunks c JOIN json_each(c.payload) j WHERE c.dataset=\'DATASET\' AND c.section=\'SECTION\'. For array section j.value is original JSON row. For object section j.key is original object key, j.value is its original value. Access fields with json_extract(j.value,\'$.field_name\') and CAST(... AS REAL/INTEGER) when needed. Never assume a field without checking the catalog. Current rosters, values, future projections, injury annotations and live snapshots are NOT necessarily finalized historical outcomes. Missing data must never become zero.';
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
 const meta=await env.DB.prepare('SELECT name,generation,content_hash FROM core_table_meta').all();
 const known=new Map((meta.results||[]).map(x=>[x.name,x]));
 const changed=[];
 for(const [name,items] of Object.entries(rows)){
  // A generation timestamp is not part of a content hash.
  const hash=await contentDigest(JSON.stringify(items.map(row=>row.slice(1))));
  if(hash===known.get(name)?.content_hash)continue;
  await storeRows(env.DB,name,items);
  changed.push({name,hash,count:items.length});
 }
 // No table becomes visible until every changed table was written. D1 batch
 // applies the switch atomically, while old generations remain queryable.
 const switchStatements=changed.map(x=>env.DB.prepare(
  'INSERT INTO core_table_meta(name,generation,content_hash) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET generation=excluded.generation,content_hash=excluded.content_hash'
 ).bind(x.name,generation,x.hash));
 switchStatements.push(env.DB.prepare('UPDATE sync_meta SET generation=?,version=?,finished_at=? WHERE id=1')
  .bind(generation,version,new Date().toISOString()));
 await env.DB.batch(switchStatements);
 for(const {name} of changed)await env.DB.prepare(
  'DELETE FROM '+name+'_all WHERE generation!=?').bind(generation).run();
 return {updated:true,version,changed:changed.map(x=>x.name),
  counts:Object.fromEntries(changed.map(x=>[x.name,x.count]))};
}
function sqlClean(input){
 if(typeof input!=='string'||input.length<10||input.length>4500)throw Error('Invalid SQL length');
 const sql=input.trim();
 const scrub=sql.replace(/'(?:''|[^'])*'/g,"''").replace(/"(?:""|[^"])*"/g,'""');
 if(!/^(SELECT|WITH)\b/i.test(scrub))throw Error('Only SELECT or nonrecursive WITH queries allowed');
 if(/;|--|\/\*|\*\/|#/.test(scrub))throw Error('SQL comments or multiple statements not permitted');
 if(/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|ATTACH|DETACH|REPLACE|VACUUM|REINDEX|ANALYZE|TRIGGER|RECURSIVE|INTO|RETURNING|LOAD_EXTENSION|RANDOMBLOB|ZEROBLOB)\b/i.test(scrub))throw Error('Write, recursive, or unsafe SQL denied');
 if(/\b(sqlite_|sync_meta|archive_source_meta|core_table_meta|core_schema_settings|_all\b)/i.test(scrub))throw Error('Internal tables not available');
 if((scrub.match(/\bJOIN\b/gi)||[]).length>8)throw Error('Too many table joins');
 if(!/\b(games|starts|td_coverage|team_seasons|trades|trade_participants|trade_assets|draft_picks|archive_chunks|archive_catalog)\b/i.test(scrub))
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
 if(/\b(?:most|fewest)\b/.test(q)&&!(/\b(?:top|only|just|single|one)\s*1\b/.test(q))&&
  /\bLIMIT\s+1\b/i.test(sql))
  throw Error('Ranking may have tied leaders. Do not use LIMIT 1; show all equal top-ranking teams.');
  if(!/\b(?:current|this|latest|most recent)\s+season\b/.test(q)&&
  !/\b20(?:2[3-9]|3\d)\b/.test(q)&&
  /\bseason\s*=\s*\(\s*SELECT\s+MAX\s*\(\s*season\s*\)/i.test(sql))
  throw Error('Do not invent a latest-season filter; the user did not specify a season. Include all league years.');

 if(/\b(?:touchdowns?|tds?)\b/.test(q)){
  if(!/\bstarts\b/i.test(sql)||!/\b(?:td|rush_td|rec_td)\b/i.test(sql)||
   !/\btd_coverage\b/i.test(sql))
   throw Error('Touchdown questions require verified player TDs and complete-week coverage, not game counts');
 }
 // Raw NFL yardage is answerable only when an indexed source actually contains it.
 // The planner must never replace unavailable yards with fantasy points.
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

function prompt(question,previous,error,catalog){
 return [
  {role:'system',content:'You are BoekMuse, the SQL planner for a fantasy football database. You must NOT invent results. '+SCHEMA+'\n'+catalog},
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
async function interpret(env,question,previous,error,catalog){
 const output=await env.AI.run(MODEL,{
  messages:prompt(question,previous,error,catalog),response_format:{type:'json_schema',json_schema:QUERY_SCHEMA},
  max_tokens:1150,temperature:0
 });
 return parsePlan(output);
}
function normalizeResult(row){
 const entries=Object.entries(row);
 return Object.fromEntries(entries.map(([k,v])=>[k,typeof v==='number'&&Number.isFinite(v)?
  Math.round(v*10000)/10000:v]));
}
async function runQuery(env,question,previous){
 const catalog=await archiveSchemaPrompt(env.DB,question);
 let lastError='';
 for(let attempt=0;attempt<2;attempt++){
  const plan=await interpret(env,question,previous,lastError,catalog);
  if(!plan.supported)return {ok:false,unsupported:true,message:str(plan.reason||'The required data are not available.')};
  try{
   const sql=sqlClean(plan.sql);
   questionGuard(question,sql);
   const stmt=env.DB.prepare('SELECT * FROM ('+sql+') AS verified_result LIMIT 100');
   const data=await stmt.all();
   const rows=(data.results||[]).map(normalizeResult);
   if(!rows.length)return {ok:false,unsupported:false,message:'No published records matched that query. The AI did not substitute another statistic.',sql};
   return {ok:true,version:'dynamic-sql-v2',title:str(plan.title).slice(0,120),
    understood:str(plan.understood).slice(0,400),sql,source:/\barchive_chunks\b/i.test(sql)?'Cloudflare D1 · published league data (includes live/model snapshots)':'Cloudflare D1 · finalized Sleeper league archive',
    source_type:/\barchive_chunks\b/i.test(sql)?'published_snapshot':'finalized_history',
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
   try{await ensureSchema(env.DB);await ensureArchiveSchema(env.DB);const meta=await env.DB.prepare(
    'SELECT generation,version,finished_at FROM sync_meta WHERE id=1').first();
    const archive=await archiveStatus(env.DB);
    return reply({ok:true,ready:!!meta?.generation,version:meta?.version||null,
     finished_at:meta?.finished_at||null,archive,model:MODEL},200,origin);
   }catch(e){return reply({ok:false,error:'Database unavailable'},503,origin);}
  }
  // One-time initialization trigger; cannot be used to force repeated writes.
  if(url.pathname==='/bootstrap'&&request.method==='GET'){
   await ensureSchema(env.DB);await ensureArchiveSchema(env.DB);
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
  await ensureArchiveSchema(env.DB);
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
  ctx.waitUntil((async()=>{
   // Archive synchronization is independent of core game sync failures.
   try{const x=await synchronize(env);console.log('BoekMuse D1 sync',JSON.stringify(x));}
   catch(e){console.error('BoekMuse D1 sync failed',String(e).slice(0,350));}
   try{const x=await synchronizeArchive(env);console.log('BoekMuse complete archive',JSON.stringify(x));}
   catch(e){console.error('BoekMuse archive sync failed',String(e).slice(0,350));}
  })());
 }
};
