/* Single-season record pace projections use only the completed regular-season
   snapshot, never in-progress matchup scores or unfinished historical seasons. */
const FIG_SEASON_WATCH_BOMBS=[['5 BOMBS','b5'],['20 BOMBS','b20'],['30 BOMBS','b30'],['40 BOMBS','b40'],['50 BOMBS','b50']];
const FIG_SEASON_WATCH_STABLE=new Set(['median_score','all_play_win_pct']);
const FIG_SEASON_WATCH_COUNT=new Set(['wins','losses','weekly_high_scores','weekly_top_3_finishes','b5','b20','b30','b40','b50']);
function figSeasonWatchNumber(metric,value,projection=false){
 if(metric==='all_play_win_pct')return Number(value).toFixed(1)+'%';
 if(FIG_SEASON_WATCH_COUNT.has(metric))return projection?String(Math.round(value*10)/10):String(Math.round(value));
 return money(value);
}
function figSeasonWatchLength(year,settings,finished){
 const league=(settings||[]).find(x=>Number(x.season)===year);
 if(league){
  try {
   const s=typeof league.settings_json==='string'?JSON.parse(league.settings_json):league.settings_json;
   const start=Number(s.start_week||1),playoffs=Number(s.playoff_week_start);
   const weeks=playoffs-start;
   if(Number.isInteger(weeks)&&weeks>=8&&weeks<=18)return weeks;
  }catch(error){/* Historical completed seasons provide a fallback. */}
 }
 const totals=(finished||[]).filter(x=>Number(x.games)>0).map(x=>Number(x.games));
 return totals.length?Math.max(...totals):null;
}
function figBuildSingleSeasonWatch(master,records,settings,bombHistory,bombLeaderboard){
 const seasons=master||[];
 const complete=new Set(seasons.filter(x=>x.season_complete===true||String(x.season_complete)==='true').map(x=>String(x.season)));
 const unfinished=seasons.filter(x=>!complete.has(String(x.season))&&!(x.season_complete===true||String(x.season_complete)==='true'));
 const season=unfinished.length?Math.max(...unfinished.map(x=>Number(x.season)).filter(Number.isFinite)):0;
 const current=unfinished.filter(x=>figRecordAllowed(x.franchise_id)&&Number(x.season)===season&&Number(x.games)>0);
 const target=figSeasonWatchLength(season,settings,seasons.filter(x=>complete.has(String(x.season))));
 const games=current.length?Math.max(...current.map(x=>Number(x.games))):0;
 const empty={season,targetGames:target||0,completedGames:games,entries:[]};
 if(!season||!target||!current.length||games>=target)return empty;
 const currentBombs=typeof bombLeaderboard==='function'?bombLeaderboard('Regular Season',season):[];
 const bombById=new Map((currentBombs||[]).map(x=>[Number(x.franchise_id),x]));
 const historic=(records||[]).filter(x=>figRecordAllowed(x.franchise_id)&&complete.has(String(x.season))&&Number(x.value)>0&&
  !['All-Play Wins','Scoring Average'].includes(String(x.record_category||'')))
  .concat((bombHistory||[]).filter(x=>figRecordAllowed(x.franchise_id)&&complete.has(String(x.season))&&Number(x.value)>0));
 const recordsByCategory=new Map();
 for(const x of historic){
  const cat=String(x.record_category||''),value=Number(x.value);
  if(!cat||!Number.isFinite(value))continue;
  const arr=recordsByCategory.get(cat)||[];
  arr.push(x);recordsByCategory.set(cat,arr);
 }
 const candidates=[];
 for(const team of current){
  const teamGames=Number(team.games),id=Number(team.franchise_id);
  if(!Number.isInteger(id)||id<=0||teamGames<=0||teamGames>target)continue;
  const bomb=bombById.get(id)||{};
  const metrics=[
   ['All-Play Win Percentage','all_play_win_pct'],
   ['Losses','losses'],['Max PF','max_pf'],['Median Score','median_score'],
   ['Point Differential','point_differential'],['Points For','points_for'],
   ['Weekly High Scores','weekly_high_scores'],
   ['Weekly Top-3 Finishes','weekly_top_3_finishes'],['Wins','wins'],
   ...FIG_SEASON_WATCH_BOMBS
  ];
  for(const [category,metric] of metrics){
   const history=recordsByCategory.get(category);
   if(!history||!history.length)continue;
   const actual=Number(metric.startsWith('b')?bomb[metric]:team[metric]);
   if(!Number.isFinite(actual)||actual<=0)continue;
   const previous=Math.max(...history.map(x=>Number(x.value)));
   if(!Number.isFinite(previous)||previous<=0)continue;
   const projected=FIG_SEASON_WATCH_STABLE.has(metric)?actual:actual/teamGames*target;
   // An uncompleted season is not an official record even if it already has
   // the best median or winning percentage. It must stay ahead through season end.
   if(projected<=previous+0.000001)continue;
   const former=history.filter(x=>Math.abs(Number(x.value)-previous)<0.000001);
   const holder=[...new Set(former.map(x=>displayOwnerName(x.owner_name,x.franchise_id)+' · '+x.season))].join(' / ');
   candidates.push({teamId:id,team:displayOwnerName(team.owner_name,id),season,category,metric,
    current:actual,projected,record:previous,recordHolder:holder,
    weeksPlayed:teamGames,targetGames:target,percentAbove:(projected-previous)/previous,
    href:'#/singleseasons/'+encodeURIComponent(category)});
  }
 }
 return {season,targetGames:target,completedGames:games,entries:candidates.sort((a,b)=>
  b.percentAbove-a.percentAbove||a.category.localeCompare(b.category)||a.team.localeCompare(b.team))};
}
function figSeasonWatchRow(x){
 return '<a class="fig-watch-row fig-season-watch-row" href="'+esc(x.href)+'">'+
  '<span class="fig-watch-person">'+ownerAvatar(x.teamId,'fig-watch-avatar')+
  '<strong>'+esc(x.team)+'</strong></span>'+
  '<span class="fig-watch-details"><b>'+esc(x.category)+'</b>'+
   '<span>RECORD '+esc(figSeasonWatchNumber(x.metric,x.record))+' · '+esc(x.recordHolder)+'</span>'+
   '<small>CURRENT '+esc(figSeasonWatchNumber(x.metric,x.current))+
     ' · '+esc(x.weeksPlayed)+'/'+esc(x.targetGames)+' completed weeks</small></span>'+
  '<span class="fig-watch-progress"><strong>~'+esc(figSeasonWatchNumber(x.metric,x.projected,true))+
   '</strong><small>PROJECTED FINISH</small></span>'+
  '<span class="fig-watch-status is-break">ON PACE</span>'+
  '<span class="fig-watch-arrow" aria-hidden="true">›</span></a>';
}
function figSingleSeasonWatchSection(watch){
 const id='figSeasonRecordWatch',entries=watch.entries||[];
 const note=watch.season?watch.season+' SEASON · '+watch.completedGames+'/'+watch.targetGames+' WEEKS':'No current season';
 const contents=entries.length
  ?entries.map((x,i)=>'<div class="fig-watch-item"'+(i>=6?' hidden':'')+'>'+figSeasonWatchRow(x)+'</div>').join('')
  :'<div class="fig-watch-empty">No single-season records are currently projected to be broken at this pace.</div>';
 const more=entries.length>6?'<button type="button" class="fig-watch-more" aria-expanded="false">SHOW ALL '+entries.length+' OPPORTUNITIES</button>':'';
 return '<section class="section fig-watch-section fig-season-watch-section" id="'+id+'">'+
  '<div class="section-head"><h2 class="section-title">SINGLE-SEASON RECORD WATCH</h2>'+
  '<div class="section-note">'+esc(note)+'</div></div>'+
  '<div class="fig-watch-panel"><div class="fig-watch-intro"><span>Projected full-season results if teams maintain their completed-game pace. Previous records use finished seasons only.</span>'+
  '<strong>'+entries.length+' ON PACE</strong></div>'+
  '<div class="fig-watch-list">'+contents+'</div>'+more+'</div></section>';
}
