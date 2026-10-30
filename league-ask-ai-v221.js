/* Ask FIG AI result engine. Model supplies only a restricted plan; browser computes every number. */
(function(root){
'use strict';
const ALLOWED={
 dataset:['games','player_starts','trades','drafts','team_seasons','player_touchdowns'],
 metric:['count','wins','losses','win_pct','total_points','avg_points','max_points','min_points','total_allowed','avg_allowed','avg_margin','distinct_teams','touchdowns'],
 group_by:['none','team','opponent','player','position','season','week','team_season','game'],
 game_type:['regular','playoffs','all'],result:['any','win','loss','tie'],order:['desc','asc'],
 compare_direction:['none','higher','lower']
};
const TEAMS=['','Boek','Fru','Fromm','Sack','Leyton','Hayden','Line','Winston','CamNol','James'];
const SOURCES={games:'games',player_starts:'player_game_log',trades:'trades',drafts:'draft_picks',team_seasons:'team_season_master',player_touchdowns:'player_weekly_touchdowns'};
const METRIC_NAMES={count:'Count',wins:'Wins',losses:'Losses',win_pct:'Win percentage',
 total_points:'Total points',avg_points:'Points per game',max_points:'Highest score',
 min_points:'Lowest score',total_allowed:'Points allowed',avg_allowed:'Points allowed per game',
 avg_margin:'Average scoring margin',distinct_teams:'Different teams',touchdowns:'Offensive touchdowns'};
const CACHE=new Map(),PLANS=new Map();
const numeric=x=>Number(x)||0;
const fmt=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:2});
const norm=x=>String(x||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
const teamName=id=>TEAMS[Number(id)]||'Unknown team';
const error=message=>({ok:false,message});
const cell=(values,href)=>({values,href:href||''});
const validEnum=(v,key,fallback)=>{
 if(v===undefined||v===null)return fallback;
 if(!ALLOWED[key].includes(v))throw Error('Unrecognized '+key);
 return v;
};
const optionalNumber=(v,key,low,high)=>{
 if(v===undefined||v===null||v==='')return null;
 if(typeof v!=='number'||!Number.isFinite(v)||v<low||v>high)throw Error('Invalid '+key);
 return v;
};
function validatePlan(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid query plan');
 const p={
  dataset:validEnum(raw.dataset,'dataset'),
  metric:validEnum(raw.metric,'metric'),
  group_by:validEnum(raw.group_by,'group_by'),
  game_type:validEnum(raw.game_type,'game_type','regular'),
  result:validEnum(raw.result,'result','any'),
  order:validEnum(raw.order,'order','desc'),
  compare_direction:validEnum(raw.compare_direction,'compare_direction','none'),
  team_id:optionalNumber(raw.team_id,'team_id',1,10),
  opponent_id:optionalNumber(raw.opponent_id,'opponent_id',1,10),
  compare_team_id:optionalNumber(raw.compare_team_id,'compare_team_id',1,10),
  season_from:optionalNumber(raw.season_from,'season_from',2023,2040),
  season_to:optionalNumber(raw.season_to,'season_to',2023,2040),
  week_from:optionalNumber(raw.week_from,'week_from',1,18),
  week_to:optionalNumber(raw.week_to,'week_to',1,18),
  min_points:optionalNumber(raw.min_points,'min_points',-100,1000),
  max_points:optionalNumber(raw.max_points,'max_points',-100,1000),
  min_opponent_points:optionalNumber(raw.min_opponent_points,'min_opponent_points',-100,1000),
  max_opponent_points:optionalNumber(raw.max_opponent_points,'max_opponent_points',-100,1000),
  min_margin:optionalNumber(raw.min_margin,'min_margin',-1000,1000),
  max_margin:optionalNumber(raw.max_margin,'max_margin',-1000,1000),
  minimum_value:optionalNumber(raw.minimum_value,'minimum_value',-100000,100000),
  maximum_value:optionalNumber(raw.maximum_value,'maximum_value',-100000,100000),
  draft_round:optionalNumber(raw.draft_round,'draft_round',1,30),
  player_name:typeof raw.player_name==='string'?raw.player_name.trim().slice(0,100):null,
  position:typeof raw.position==='string'?raw.position.trim().toUpperCase():null,
  rookie_only:raw.rookie_only===true,
  limit:Math.min(30,Math.max(1,Number.isInteger(raw.limit)?raw.limit:10)),
  minimum_games:Math.min(100,Math.max(1,Number.isInteger(raw.minimum_games)?raw.minimum_games:1))
 };
 for(const key of ['team_id','opponent_id','compare_team_id','season_from','season_to','week_from','week_to','draft_round'])
  if(p[key]!==null&&!Number.isInteger(p[key]))throw Error('Invalid '+key);
 if(p.position&&!['QB','RB','WR','TE','K','DEF'].includes(p.position))throw Error('Unknown position');
 if(p.season_from!==null&&p.season_to!==null&&p.season_from>p.season_to)throw Error('Invalid season interval');
 if(p.season_from!==null&&p.season_to!==null&&p.season_from===p.season_to&&p.week_from!==null&&p.week_to!==null&&p.week_from>p.week_to)throw Error('Invalid week interval');
 if(p.min_points!==null&&p.max_points!==null&&p.min_points>p.max_points)throw Error('Invalid points interval');
 if(p.dataset==='player_touchdowns'&&p.metric!=='touchdowns')throw Error('Touchdown archive only supports verified touchdown totals');
 if(p.metric==='touchdowns'&&p.dataset!=='player_touchdowns')throw Error('Touchdown count requires raw player touchdown statistics');
 if(p.dataset==='player_touchdowns'&&!['none','team','season','week','game','player','position'].includes(p.group_by))throw Error('Unavailable touchdown grouping');
 if(p.dataset==='player_touchdowns'&&(p.opponent_id!==null||p.compare_team_id!==null||p.compare_direction!=='none'||p.result!=='any'||p.min_points!==null||p.max_points!==null||p.min_opponent_points!==null||p.max_opponent_points!==null||p.min_margin!==null||p.max_margin!==null))throw Error('Touchdown archive does not support matchup or fantasy-point filters');
 if(p.metric==='distinct_teams'&&!(p.dataset==='player_starts'&&p.group_by==='player'))throw Error('Different-team count requires player starts grouped by player');
 if(p.dataset==='player_starts'&&['wins','losses','win_pct','total_allowed','avg_allowed','avg_margin'].includes(p.metric))throw Error('Player start log cannot verify wins or points allowed');
 if(['trades','drafts'].includes(p.dataset)&&!['count'].includes(p.metric))throw Error('Unsupported transaction metric');
 if(p.dataset==='team_seasons'&&['max_points','min_points','distinct_teams','avg_margin'].includes(p.metric))throw Error('Unavailable season metric');
 if(p.dataset!=='games'&&(p.opponent_id!==null||p.compare_team_id!==null||p.compare_direction!=='none'||p.result!=='any'||p.min_opponent_points!==null||p.max_opponent_points!==null||p.min_margin!==null||p.max_margin!==null))throw Error('These opponent or outcome filters require games');
 if(p.compare_direction!=='none'&&p.compare_team_id===null)throw Error('Select the team to compare');
 if(['trades','drafts'].includes(p.dataset)&&p.game_type!=='regular')throw Error('Transaction records have no game type');
 if(p.dataset!=='drafts'&&(p.rookie_only||p.draft_round!==null))throw Error('Draft-only filter');
 if(p.dataset==='trades'&&(p.player_name||p.position))throw Error('Trade archive does not contain individual player details');
 if(['trades','drafts'].includes(p.dataset)&&(p.min_points!==null||p.max_points!==null))throw Error('Transaction records have no scored points');
 if(p.dataset==='games'&&p.player_name)throw Error('Game summaries do not identify individual players');
 if(p.dataset==='team_seasons'&&p.group_by==='game')throw Error('Team seasons do not list games');
 if(p.dataset==='team_seasons'&&p.game_type!=='regular')throw Error('Season summary only covers regular season');
 if(p.compare_team_id!==null&&p.compare_team_id===p.team_id)throw Error('A team cannot outscore itself');
 if(raw.minimum_games!==undefined&&!Number.isInteger(raw.minimum_games))throw Error('Invalid minimum sample');
 if(raw.limit!==undefined&&!Number.isInteger(raw.limit))throw Error('Invalid result limit');
 if(p.group_by==='player'&&!['player_starts','drafts','player_touchdowns'].includes(p.dataset))throw Error('Player grouping unavailable in this source');
 if(p.group_by==='position'&&!['player_starts','drafts','player_touchdowns'].includes(p.dataset))throw Error('Position grouping unavailable in this source');
 if(p.group_by==='opponent'&&p.dataset!=='games')throw Error('Opponent grouping unavailable in this source');
 if(p.group_by==='game'&&!['games','player_starts'].includes(p.dataset))throw Error('Game-level rows unavailable');
 return p;
}
function transform(data,key){
 if(key==='games'){
  return data.flatMap(g=>[1,2].map(i=>{
   const team=numeric(g['franchise_'+i]),opp=numeric(g['franchise_'+(3-i)]);
   const score=numeric(g['score_'+i]),against=numeric(g['score_'+(3-i)]);
   return {team,opp,points:score,against,margin:score-against,
    wins:score>against?1:0,losses:score<against?1:0,ties:score===against?1:0,
    season:numeric(g.season),week:numeric(g.week),type:g.game_type,
    href:'#/game/'+g.season+'/'+g.week+'/'+g.matchup_id,player:null,position:null,games:1};
  }));
 }
 if(key==='player_starts')return data.map(x=>({team:numeric(x.franchise_id),opp:null,points:numeric(x.starter_points),
   against:0,margin:0,wins:0,losses:0,ties:0,season:numeric(x.season),week:numeric(x.week),type:x.game_type,
   player:String(x.player_name||''),playerId:String(x.player_id||''),position:String(x.position||'').toUpperCase(),
   href:'#/player/'+encodeURIComponent(x.player_id),games:1}));
 if(key==='trades')return data.map(x=>({team:null,teamIds:(x.franchise_ids||[]).map(Number),
   season:numeric(x.season),week:numeric(x.week),points:0,against:0,margin:0,wins:0,losses:0,ties:0,
   type:'Regular Season',player:null,position:null,href:'#/trades',games:1}));
 if(key==='drafts')return data.map(x=>({team:numeric(x.franchise_id),season:numeric(x.draft_season),
   week:0,points:0,against:0,margin:0,wins:0,losses:0,ties:0,type:'Regular Season',
   player:String(x.player_name||''),playerId:String(x.player_id||''),position:String(x.position||'').toUpperCase(),
   rookie:String(x.draft_class||'').toLowerCase()==='rookie',round:numeric(x.round),
   href:x.player_id?'#/player/'+encodeURIComponent(x.player_id):'#/draft',games:1}));
 return data.map(x=>({team:numeric(x.franchise_id),season:numeric(x.season),week:0,points:numeric(x.points_for),
  against:numeric(x.points_against),margin:numeric(x.point_differential),wins:numeric(x.wins),losses:numeric(x.losses),
  ties:numeric(x.ties),type:'Regular Season',player:null,position:null,games:numeric(x.games),
  href:'#/teamseason/'+x.franchise_id+'/'+x.season}));
}
function filterRows(records,p){
 let rows=records;
 const seasons=records.map(x=>x.season).filter(x=>x>2000);
 const newest=Math.max(...seasons);
 // Single "Week 7" question without a specified year means most recently published season.
 const latestWeekOnly=p.week_from!==null&&p.week_to!==null&&p.week_from===p.week_to&&p.season_from===null&&p.season_to===null;
 if(latestWeekOnly)rows=rows.filter(x=>x.season===newest);
 return rows.filter(x=>{
  if(p.team_id!==null&&(p.dataset==='trades'?!x.teamIds.includes(p.team_id):x.team!==p.team_id))return false;
  if(p.opponent_id!==null&&x.opp!==p.opponent_id)return false;
  if(p.season_from!==null&&(x.season<p.season_from||(x.season===p.season_from&&p.week_from!==null&&x.week<p.week_from)))return false;
  if(p.season_to!==null&&(x.season>p.season_to||(x.season===p.season_to&&p.week_to!==null&&x.week>p.week_to)))return false;
  if(p.season_from===null&&p.season_to===null){
   if(p.week_from!==null&&x.week<p.week_from)return false;
   if(p.week_to!==null&&x.week>p.week_to)return false;
  }
  if(p.game_type!=='all'&&(p.dataset==='games'||p.dataset==='player_starts')&&
   String(x.type).toLowerCase()!==(p.game_type==='regular'?'regular season':'playoffs'))return false;
  if(p.result!=='any'&&!(p.result==='win'?x.wins:p.result==='loss'?x.losses:x.ties))return false;
  if(p.min_points!==null&&x.points<p.min_points)return false;
  if(p.max_points!==null&&x.points>p.max_points)return false;
  if(p.min_opponent_points!==null&&x.against<p.min_opponent_points)return false;
  if(p.max_opponent_points!==null&&x.against>p.max_opponent_points)return false;
  if(p.min_margin!==null&&x.margin<p.min_margin)return false;
  if(p.max_margin!==null&&x.margin>p.max_margin)return false;
  if(p.player_name&&norm(x.player)!==norm(p.player_name))return false;
  if(p.position&&p.position!==x.position)return false;
  if(p.draft_round!==null&&x.round!==p.draft_round)return false;
  if(p.rookie_only&&!x.rookie)return false;
  return true;
 });
}
function groupInfo(row,p){
 const by=p.group_by;
 if(by==='team'){return {key:'team:'+row.team,label:teamName(row.team),href:'#/team/'+row.team};}
 if(by==='opponent')return {key:'opp:'+row.opp,label:teamName(row.opp),href:'#/team/'+row.opp};
 if(by==='player')return {key:'player:'+row.playerId,label:row.player,href:row.href};
 if(by==='position')return {key:'pos:'+row.position,label:row.position,href:''};
 if(by==='season')return {key:'season:'+row.season,label:String(row.season),href:''};
 if(by==='week')return {key:'week:'+row.season+':'+row.week,label:row.season+' · W'+row.week,href:''};
 if(by==='team_season')return {key:'ts:'+row.team+':'+row.season,label:teamName(row.team)+' · '+row.season,href:'#/teamseason/'+row.team+'/'+row.season};
 if(by==='game')return {key:'game:'+row.href+':'+row.team+':'+row.playerId,
  label:row.season+' W'+row.week+' · '+(row.player||teamName(row.team)),href:row.href};
 return {key:'all',label:p.team_id?teamName(p.team_id):p.player_name||'League',href:p.team_id?'#/team/'+p.team_id:''};
}
function computeValue(g,p){
 if(p.metric==='count')return g.rows.length;
 if(p.metric==='wins')return g.wins;
 if(p.metric==='losses')return g.losses;
 if(p.metric==='win_pct')return g.games?g.wins/g.games*100:0;
 if(p.metric==='total_points')return g.points;
 if(p.metric==='avg_points')return g.games?g.points/g.games:0;
 if(p.metric==='max_points')return Math.max(...g.rows.map(x=>x.points));
 if(p.metric==='min_points')return Math.min(...g.rows.map(x=>x.points));
 if(p.metric==='total_allowed')return g.against;
 if(p.metric==='avg_allowed')return g.games?g.against/g.games:0;
 if(p.metric==='avg_margin')return g.games?(g.points-g.against)/g.games:0;
 if(p.metric==='distinct_teams')return new Set(g.rows.map(x=>x.team)).size;
 throw Error('Unsupported calculation');
}
// Every touchdown result is audited against a finalized game's COMPLETE starter list.
// A missing starter or weekly provider snapshot blocks the result; missing never means zero.
function executeTouchdowns(p,source){
 if(!source||!Array.isArray(source.records)||!source.coverage||!Array.isArray(source.games))
  return error('Verified NFL touchdown records have not been published yet. No touchdown estimate will be shown.');
 const games=source.games.filter(g=>{
  const y=Number(g.season),w=Number(g.week);
  if(p.game_type==='regular'&&g.game_type!=='Regular Season')return false;
  if(p.game_type==='playoffs'&&g.game_type!=='Playoffs')return false;
  if(p.season_from!==null&&(y<p.season_from||(y===p.season_from&&p.week_from!==null&&w<p.week_from)))return false;
  if(p.season_to!==null&&(y>p.season_to||(y===p.season_to&&p.week_to!==null&&w>p.week_to)))return false;
  if(p.season_from===null&&p.season_to===null){
   if(p.week_from!==null&&w<p.week_from)return false;
   if(p.week_to!==null&&w>p.week_to)return false;
  }
  return true;
 });
 const expected=[];
 for(const g of games)for(const side of [1,2]){
  const team=Number(g['franchise_'+side]);
  if(p.team_id!==null&&team!==p.team_id)continue;
  expected.push({team,season:Number(g.season),week:Number(g.week),type:g.game_type,
   href:'#/game/'+g.season+'/'+g.week+'/'+g.matchup_id});
 }
 if(!expected.length)return error('No finalized games match the requested team and season.');
 const sourceKey=x=>x.season+':'+x.week+':'+x.type+':'+x.team;
 const missing=expected.filter(x=>!Array.isArray(source.coverage[sourceKey(x)]));
 if(missing.length)return error('Touchdown records are incomplete for '+missing.slice(0,4)
  .map(x=>x.season+' Week '+x.week+' ('+teamName(x.team)+')').join(', ')+
  (missing.length>4?' and '+(missing.length-4)+' others':'')+
  '. I will not substitute a game count or treat missing players as zero touchdowns.');
 const groupedByTeamWeek=new Map();
 for(const x of expected)groupedByTeamWeek.set(sourceKey(x),{...x,players:[],ids:source.coverage[sourceKey(x)]});
 for(const player of source.records){
  const key=player.season+':'+player.week+':'+player.game_type+':'+player.franchise_id;
  const group=groupedByTeamWeek.get(key);
  if(group)group.players.push(player);
 }
 for(const group of groupedByTeamWeek.values()){
  const expectedIds=group.ids.map(String);
  if(group.players.length!==expectedIds.length||
   new Set(group.players.map(x=>String(x.player_id))).size!==expectedIds.length||
   group.players.some(x=>!expectedIds.includes(String(x.player_id))||
    !Number.isInteger(x.touchdowns)||x.touchdowns<0||x.touchdowns!==Number(x.rush_td)+Number(x.rec_td)||
    !['RB','WR','TE','FB'].includes(x.position)))
   return error('Source coverage check failed for '+group.season+' Week '+group.week+' ('+
    teamName(group.team)+'). Unable to report verified touchdowns.');
 }
 const groups=new Map(),filtered=[];
 for(const week of groupedByTeamWeek.values()){
  for(const player of week.players){
   if(p.position&&player.position!==p.position)continue;
   if(p.player_name&&norm(player.player_name)!==norm(p.player_name))continue;
   filtered.push({...player,team:week.team,href:week.href});
  }
  // Include 0-TD team-weeks even if a specific position has no starters in a week.
  if(!p.player_name&&['none','team','week','season','game'].includes(p.group_by)){
   const key=p.group_by==='none'?'all':p.group_by==='team'?'t'+week.team:
    p.group_by==='season'?'s'+week.season:
    p.group_by==='week'?'w'+week.season+':'+week.week:
    'g'+week.season+':'+week.week+':'+week.team;
   const label=p.group_by==='none'?(p.team_id?teamName(p.team_id):'League'):
    p.group_by==='team'?teamName(week.team):
    p.group_by==='season'?String(week.season):
    p.group_by==='week'?week.season+' W'+week.week:
    teamName(week.team)+' · '+week.season+' W'+week.week;
   if(!groups.has(key))groups.set(key,{label,href:p.group_by==='team'?'#/team/'+week.team:
    p.group_by==='week'&&p.team_id!==null?week.href:p.group_by==='game'?week.href:'',
    order:week.season*100+week.week,tds:0,starts:0,gameKeys:new Set()});
   groups.get(key).gameKeys.add(sourceKey(week));
  }
 }
 for(const ptd of filtered){
  const week={team:ptd.team,season:Number(ptd.season),week:Number(ptd.week)};
  const key=p.group_by==='none'?'all':p.group_by==='team'?'t'+week.team:
   p.group_by==='season'?'s'+week.season:
   p.group_by==='week'?'w'+week.season+':'+week.week:
   p.group_by==='game'?'g'+week.season+':'+week.week+':'+week.team:
   p.group_by==='position'?'pos'+ptd.position:'player'+ptd.player_id;
  if(!groups.has(key))groups.set(key,{
   label:p.group_by==='player'?ptd.player_name:ptd.position,
   href:p.group_by==='player'?'#/player/'+encodeURIComponent(ptd.player_id):'',
   order:0,tds:0,starts:0,gameKeys:new Set()});
  const group=groups.get(key);
  group.tds+=Number(ptd.touchdowns);
  group.starts++;
 }
 let entries=[...groups.values()].filter(x=>x.gameKeys.size>=p.minimum_games||
  (['player','position'].includes(p.group_by)&&x.starts>=p.minimum_games))
  .filter(x=>(p.minimum_value===null||x.tds>=p.minimum_value)&&(p.maximum_value===null||x.tds<=p.maximum_value));
 if(!entries.length)return error('No verified touchdown records match those filters.');
 if(['week','game','season'].includes(p.group_by))entries.sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label));
 else entries.sort((a,b)=>p.order==='asc'?a.tds-b.tds||a.label.localeCompare(b.label):b.tds-a.tds||a.label.localeCompare(b.label));
 const total=entries.reduce((a,x)=>a+x.tds,0);
 const perWeek=['week','game'].includes(p.group_by),shown=entries.slice(0,p.limit);
 const gameCount=expected.length;
 const label=p.team_id?teamName(p.team_id):'League';
 const scope=p.season_from!==null&&p.season_to!==null&&p.season_from===p.season_to?String(p.season_from):
  p.season_from!==null?String(p.season_from)+' onward':'League history';
 const metricDescription='Started RB/WR/TE/FB rushing + receiving touchdowns; excludes QBs, bench, passing TDs, kickers and defenses';
 return {ok:true,title:label+' · non-QB offensive TDs'+(perWeek?' by '+(p.group_by==='game'?'game':'week'):''),
  value:String(total)+' TDs',context:scope+' · '+gameCount+' finalized team-games · '+metricDescription,
  interpretation:{measure:'Rushing + receiving touchdowns',unit:'TDs',
   group:p.group_by==='week'?'Each week':p.group_by==='game'?'Each team game':
    p.group_by==='player'?'Player':p.group_by==='position'?'Position':
    p.group_by==='team'?'Team':p.group_by==='season'?'Season':'All matching games',
   team:label,scope,method:metricDescription},
  columns:[p.group_by==='week'?'Week':p.group_by==='game'?'Team game':
   p.group_by==='player'?'Player':p.group_by==='team'?'Team':
   p.group_by==='season'?'Season':p.group_by==='position'?'Position':'Result','Offensive TDs','Player starts'],
  rows:shown.map(x=>cell([x.label,x.tds,x.starts],x.href)),
  note:'NFL raw stats: rec_td + rush_td, joined to finalized Sleeper fantasy starters. '+filtered.length+
   ' verified player starts, '+gameCount+' complete team-games. No touchdowns inferred from fantasy points.'};
}

function execute(raw,source){
 let p;try{p=validatePlan(raw);}catch(e){return error('The AI request could not be verified: '+e.message);}
 if(p.dataset==='player_touchdowns')return executeTouchdowns(p,source);
 if(!Array.isArray(source))return error('Published archive was not available.');
 const records=transform(source,p.dataset);
 let rows=filterRows(records,p);
 if(p.compare_team_id!==null&&p.compare_direction!=='none'){
  const scores=new Map();
  for(const x of records)if(x.team===p.compare_team_id&&x.season&&x.week&&x.type){
   scores.set(x.season+':'+x.week+':'+x.type,x.points);
  }
  rows=rows.filter(x=>{
   const key=x.season+':'+x.week+':'+x.type;
   if(!scores.has(key))return false;
   const n=scores.get(key);
   return p.compare_direction==='higher'?x.points>n:x.points<n;
  });
 }
 if(p.dataset==='trades'&&p.group_by==='team'){
  rows=rows.flatMap(r=>r.teamIds.filter(id=>p.team_id===null||id===p.team_id).map(id=>({...r,team:id})));
 }
 if(p.dataset==='trades'&&!['team','season','week','none'].includes(p.group_by))return error('Trade archive does not support that grouping.');
 if(!rows.length)return error('No finalized records match those filters.');
 const groups=new Map();
 for(const row of rows){
  const info=groupInfo(row,p);
  if(!groups.has(info.key))groups.set(info.key,{...info,rows:[],points:0,against:0,games:0,wins:0,losses:0});
  const g=groups.get(info.key);g.rows.push(row);g.points+=row.points;g.against+=row.against;
  g.games+=row.games;g.wins+=row.wins;g.losses+=row.losses;
 }
 const ranked=[...groups.values()].filter(g=>g.games>=p.minimum_games).map(g=>({...g,value:computeValue(g,p)}))
  .filter(g=>(p.minimum_value===null||g.value>=p.minimum_value)&&(p.maximum_value===null||g.value<=p.maximum_value));
 if(!ranked.length)return error('No results meet the minimum sample size ('+p.minimum_games+').');
 ranked.sort((a,b)=>p.order==='asc'?a.value-b.value||a.label.localeCompare(b.label):b.value-a.value||a.label.localeCompare(b.label));
 const top=ranked[0],shown=ranked.slice(0,p.limit);
 const isPercent=p.metric==='win_pct',unit=isPercent?'%':['total_points','avg_points','max_points','min_points','total_allowed','avg_allowed','avg_margin'].includes(p.metric)?' pts':'';
 const viewName={none:'Result',team:'Team',opponent:'Opponent',player:'Player',position:'Position',season:'Season',
  week:'Week',team_season:'Team / Season',game:'Game'}[p.group_by];
 const filters=[];
 if(p.team_id)filters.push('Team: '+teamName(p.team_id));
 if(p.opponent_id)filters.push('Against: '+teamName(p.opponent_id));
 if(p.player_name)filters.push('Player: '+p.player_name);
 if(p.position)filters.push(p.position);
 if(p.season_from||p.season_to)filters.push((p.season_from||'Earliest')+'–'+(p.season_to||'latest'));
 if(p.week_from!==null||p.week_to!==null)filters.push('Week '+(p.week_from||'1')+(p.week_to&&p.week_to!==p.week_from?'–'+p.week_to:''));
 if(['games','player_starts'].includes(p.dataset))filters.push(p.game_type==='all'?'Regular + playoffs':p.game_type==='playoffs'?'Playoffs':'Regular season');
 if(p.min_points!==null)filters.push('Score ≥ '+fmt(p.min_points));
 if(p.max_points!==null)filters.push('Score ≤ '+fmt(p.max_points));
 if(p.result!=='any')filters.push('Result: '+p.result);
 if(p.compare_team_id)filters.push('Score '+(p.compare_direction==='higher'?'above ':'below ')+teamName(p.compare_team_id));
 if(p.minimum_games>1)filters.push('Min '+p.minimum_games+' games');
 if(p.minimum_value!==null)filters.push('Result ≥ '+fmt(p.minimum_value));
 if(p.maximum_value!==null)filters.push('Result ≤ '+fmt(p.maximum_value));
 const context=filters.join(' · ')||'All available finalized records';
 return {ok:true,title:top.label+' · '+METRIC_NAMES[p.metric],value:fmt(top.value)+unit,context,
  columns:[viewName,METRIC_NAMES[p.metric],'Sample'],
  rows:shown.map(g=>cell([g.label,fmt(g.value)+(isPercent?'%':''),g.games],g.href)),
  note:'Verified against '+SOURCES[p.dataset]+'.json. '+rows.length+' matching source rows; '+
   (p.group_by==='none'?top.games:ranked.length+' qualifying groups')+
   (p.metric==='win_pct'?' · '+fmt(top.wins)+' wins in '+fmt(top.games)+' games.':'')+
   ' All arithmetic is calculated from published data, not generated by AI.'};
}
function apiRoot(){
 const url=String(root.FIG_ASK_WORKER_URL||'').trim().replace(/\/+$/,'');
 if(!url)return '';
 try{const parsed=new URL(url);return parsed.protocol==='https:'?parsed.origin:'';}catch(_){return '';}
}
function verifyQuestion(question,plan){
 const q=String(question||'').toLowerCase();
 const asksTds=/\b(?:touchdowns?|tds?)\b/.test(q);
 const nonQb=/\b(?:non[\s-]?qbs?|excluding (?:qbs?|quarterbacks?)|without (?:qbs?|quarterbacks?))\b/.test(q);
 if(asksTds&&(!nonQb||plan.dataset!=='player_touchdowns'||plan.metric!=='touchdowns'))
  return 'Touchdowns cannot be counted using game or player-start counts. I only have verified rushing and receiving TDs for started non-QB offensive players. Please specify non-QB TDs.';
 if(!asksTds&&plan.dataset==='player_touchdowns')
  return 'The AI selected touchdowns even though the question did not ask for them. No answer was returned.';
 if(/\b(?:rushing|receiving|passing)\s+yards?\b/.test(q))
  return 'Yardage is not recorded in the published league player-start archive. I cannot use fantasy points as yards.';
 if(/\b(?:interceptions?|sacks?|fumbles?)\b/.test(q)&&plan.metric==='count')
  return 'Raw NFL interceptions, sacks, or fumbles are not verified by this data source. A game count would be misleading.';
 const wantsEvery=/\b(?:every|each|per)\s+(?:single\s+)?(?:game|week)\b|\bby\s+(?:game|week)\b/.test(q);
 if(wantsEvery&&!['week','game'].includes(plan.group_by))
  return 'You requested a game-by-game result, but the AI did not group by game or week. Please retry.';
 const years=[...q.matchAll(/\b(20(?:2[3-9]|3[0-9]))\b/g)].map(m=>Number(m[1]));
 if(years.length===1&&/\b(?:in|during|for|throughout|every game in|each week in)\s+(?:the\s+)?(?:season\s+)?20\d\d\b/.test(q)&&
  (plan.season_from!==years[0]||plan.season_to!==years[0]))
  return 'The AI did not preserve the requested '+years[0]+' season filter. No answer was returned.';
 const names=[['boek',1],['fru',2],['fromm',3],['sack',4],['leyton',5],['hayden',6],['line',7],['winston',8],['camnol',9],['james',10]];
 const seen=names.filter(([n])=>new RegExp('\\b'+n+'\\b').test(q));
 if(seen.length===1&&/\b(?:does|did|has|have|for|from|of)\b/.test(q)&&
  plan.group_by!=='team'&&plan.team_id!==seen[0][1]&&plan.opponent_id!==seen[0][1])
  return 'The AI did not preserve the requested team: '+teamName(seen[0][1])+'. No answer was returned.';
 return '';
}

async function queryPlan(question){
 const base=apiRoot();if(!base)return null;
 const key=String(question).trim().toLowerCase();
 if(PLANS.has(key))return PLANS.get(key);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),16000);
 try{
  const response=await fetch(base+'/interpret',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({question}),signal:controller.signal});
  if(!response.ok)throw Error('AI request failed: '+response.status);
  const data=await response.json();
  if(!data?.ok||!data.plan)throw Error('No valid AI plan');
  if(data.plan.dataset==='unsupported')return {unsupported:true,reason:String(data.plan.reason||'This question needs historical data or an operation BoekMuse cannot verify yet.').slice(0,250)};
  const plan=validatePlan(data.plan);
  const mismatch=verifyQuestion(question,plan);
  if(mismatch)return {unsupported:true,reason:mismatch};
  if(plan.dataset==='player_touchdowns'&&/\b(?:every|each|per)\s+(?:single\s+)?(?:game|week)\b/.test(question.toLowerCase()))plan.limit=Math.max(18,plan.limit);
  PLANS.set(key,plan);
  return plan;
 }finally{clearTimeout(timeout);}
}
async function ask(question){
 if(!apiRoot())return null;
 try{
  const plan=await queryPlan(question);
  if(plan?.unsupported)return error(plan.reason);
  if(!plan)return null;
  const source=plan.dataset==='player_touchdowns'
   ? {...await load('player_weekly_touchdowns').catch(()=>({records:[],coverage:{}})),games:await load('games')}
   : await load(SOURCES[plan.dataset]);
  const result=execute(plan,source);
  if(result.ok&&!result.interpretation){
   result.interpretation={measure:METRIC_NAMES[plan.metric]||plan.metric,
    group:{none:'Overall',team:'Team',opponent:'Opponent',player:'Player',position:'Position',season:'Season',week:'Week',game:'Game',team_season:'Team season'}[plan.group_by],
    team:plan.team_id?teamName(plan.team_id):'League-wide',
    scope:result.context,
    method:'Calculated from '+SOURCES[plan.dataset]+'.json; '+(plan.metric==='count'?'counts archive rows, not player statistics':'metric checked against finalized records')};
  }
  return result;
 }catch(e){
  console.warn('FIG AI interpreter unavailable',e);
  return error('AI search is temporarily unavailable or the request could not be verified. Please retry shortly.');
 }
}
function load(name){
 if(!CACHE.has(name))CACHE.set(name,fetch('data/'+name+'.json').then(r=>{
  if(!r.ok)throw Error('Could not load '+name);return r.json();
 }).catch(e=>{CACHE.delete(name);throw e;}));
 return CACHE.get(name);
}
function invalidate(){CACHE.clear();PLANS.clear();}
const api={ask,execute,validatePlan,verifyQuestion,invalidate};
if(root.document)root.figAskAi=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
