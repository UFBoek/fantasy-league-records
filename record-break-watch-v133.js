/* v139: Regular-season-only six-game record watches (125+/150+ require next-game break), three-game ended-streak watches. Finalized rows only;
   never count a live Sleeper matchup toward an official record. */
function figWatchLatestWeek(games,streaks){
 const items=(games||[]).map(x=>({season:Number(x.season)||0,week:Number(x.week)||0}))
  .concat((streaks||[]).map(x=>({season:Number(x.end_season)||0,week:Number(x.end_week)||0})));
 items.sort((a,b)=>b.season-a.season||b.week-a.week);
 return items[0]&&items[0].season?'Through '+items[0].season+' W'+items[0].week:'Completed games only';
}
// Reasonable weekly NET GAIN against the current leader, not theoretical maxima.
// Keep these deliberately conservative; rare 250+ point weeks and 50-bombs
// do not get counted as something a team is expected to repeat six times.
const FIG_WATCH_RECORD_GAMES=6;
const FIG_WATCH_STREAK_GAMES=3;
function figWatchRate(metric){
 if(/^games_\d+$/.test(metric)){
  const threshold=Number(metric.match(/\d+/)[0]);
  return threshold>=275?1/6:threshold>=250?1/3:threshold>=225?1/2:1;
 }
 return ({b5:3,b20:2,b30:1,b40:1/2,b50:1/3,
  all_play_wins:4,total_points:60,point_differential:65})[metric]||0;
}
// 125+ and 150+ career-game totals only qualify when a new outright leader
// could emerge on the very next completed regular-season game.
function figWatchHorizon(metric){return metric==='games_125'||metric==='games_150'?1:FIG_WATCH_RECORD_GAMES;}
function figWatchCap(metric){return figWatchHorizon(metric)*figWatchRate(metric);}
function figWatchGameEstimate(metric,required){
 const rate=figWatchRate(metric);
 return rate>0?Math.ceil((required-1e-8)/rate):Infinity;
}
function figWatchRequirement(metric,needed){
 if(metric==='total_points')return 'Outscore the leader by '+money(needed)+' pts';
 if(metric==='point_differential')return 'Gain '+money(needed)+' more point differential than the leader';
 if(metric==='all_play_wins')return 'Gain '+needed+' more all-play win'+(needed===1?'':'s')+' than the leader';
 if(/^games_\d+$/.test(metric)){
  const threshold=metric.match(/\d+/)[0];
  return 'Get '+needed+' more '+threshold+'+ point game'+(needed===1?'':'s')+' than the leader';
 }
 const labels={b5:'5-bomb',b20:'20-bomb',b30:'30-bomb',b40:'40-bomb',b50:'50-bomb'};
 return 'Get '+needed+' more '+(labels[metric]||metric)+' start'+(needed===1?'':'s')+' than the leader';
}
function figBuildTeamRecordWatch(){
 const entries=[];
 for(const view of ['Regular Season']){
  const groups=new Map();
  for(const x of cleanTeamRecordRows(view)){
   if(!Number.isFinite(Number(x.value))||Number(x.value)<=0||!Number.isInteger(Number(x.franchise_id)))continue;
   const metric=String(x.metric||'');
   if(!figWatchRate(metric))continue; // Do not predict medians and unsupported statistics.
   if(!groups.has(x.category))groups.set(x.category,[]);
   groups.get(x.category).push(x);
  }
  for(const [category,rows] of groups){
   const leaders=[...rows].sort((a,b)=>Number(b.value)-Number(a.value));
   const best=Number(leaders[0].value);
   const top=leaders.filter(x=>Math.abs(Number(x.value)-best)<0.000001);
   const recordHolder=[...new Set(top.map(x=>displayOwnerName(x.record_holder,x.franchise_id)))].join(' / ');
   const metric=String(leaders[0].metric||''),cap=figWatchCap(metric);
   const increment=['total_points','point_differential'].includes(metric)?0.01:1;
   for(const contender of leaders){
    const current=Number(contender.value),gap=Math.max(0,Math.round((best-current)*100)/100);
    const isLeader=gap<0.000001;
    if(isLeader&&top.length===1)continue; // Ignore routine holder self-extensions.
    const needed=Math.round((gap+increment)*100)/100;
    if(current<=0||needed>cap+0.000001)continue;
    const gamesNeeded=figWatchGameEstimate(metric,needed);
    if(gamesNeeded>figWatchHorizon(metric))continue;
    entries.push({teamId:+contender.franchise_id,team:displayOwnerName(contender.record_holder,contender.franchise_id),
     title:category,scope:'REGULAR SEASON',
     current,record:best,recordHolder,status:'BREAK',needed,metric,gamesNeeded,
     requirement:figWatchRequirement(metric,needed),
     href:'#/record/team/'+encodeURIComponent(category)+'/'+encodeURIComponent(view)});
   }
  }
 }
 return entries.sort((a,b)=>a.gamesNeeded-b.gamesNeeded||
  a.needed-b.needed||a.title.localeCompare(b.title)||a.team.localeCompare(b.team));
}
function figStreakCondition(type){
 if(type==='Winning')return 'Win next game';
 if(type==='Losing')return 'Lose next game';
 if(type==='Weekly High Score')return 'Finish #1 in weekly scoring';
 if(type==='Top-3 Scoring Weeks')return 'Finish top 3 in weekly scoring';
 if(type==='Above Median')return 'Finish above the weekly median';
 if(type==='Below Median')return 'Finish below the weekly median';
 const points=type.match(/^(\d+)\+ Points$/);
 return points?'Score '+points[1]+'+ points':'Extend the streak next game';
}
function figBuildStreakRecordWatch(streaks){
 const career=(streaks||[]).filter(x=>x.streak_mode==='Career Games'&&
  Number(x.length)>=2&&!['100+ Points','180+ Points','190+ Points'].includes(String(x.streak_type)));
 const groups=new Map();
 career.forEach(x=>{
  if(!groups.has(x.streak_type))groups.set(x.streak_type,[]);
  groups.get(x.streak_type).push(x);
 });
 const entries=[];
 for(const [type,rows] of groups){
  // Only ENDED runs are eligible targets. In-progress marks are not records
  // to challenge, and extending an already-surpassed ended mark is not a new break.
  const ended=rows.filter(x=>!(x.active===true||String(x.active).toLowerCase()==='true'));
  if(!ended.length)continue;
  const best=Math.max(...ended.map(x=>Number(x.length)||0));
  const holders=[...new Set(ended.filter(x=>Number(x.length)===best)
   .map(x=>displayOwnerName(x.owner,x.franchise_id)))].join(' / ');
  for(const x of rows){
   if(!(x.active===true||String(x.active).toLowerCase()==='true'))continue;
   const current=Number(x.length),gamesNeeded=best-current+1;
   if(gamesNeeded<1||gamesNeeded>FIG_WATCH_STREAK_GAMES)continue;
   entries.push({teamId:+x.franchise_id,team:displayOwnerName(x.owner,x.franchise_id),title:type,
    scope:'ALL-TIME',current,record:best,recordHolder:holders,status:'BREAK',
    gamesNeeded,next:best+1,requirement:figStreakCondition(type),
    href:'#/breakdown/streak/'+encodeURIComponent(type)+'/'+encodeURIComponent(x.streak_mode)+'/'+x.franchise_id+
     '/'+x.start_season+'/'+x.start_week+'/'+x.end_season+'/'+x.end_week});
  }
 }
 const order=t=>t==='200+ Points'?0:t==='225+ Points'?1:t==='Winning'?2:t==='Top-3 Scoring Weeks'?3:t==='Weekly High Score'?4:5;
 return entries.sort((a,b)=>a.gamesNeeded-b.gamesNeeded||
  order(a.title)-order(b.title)||a.title.localeCompare(b.title)||a.team.localeCompare(b.team));
}
function figWatchRow(x,streak=false){
 const mark=streak?x.current+' / '+x.record:money(x.current)+' / '+money(x.record);
 const target=streak?x.gamesNeeded+' GAME'+(x.gamesNeeded===1?'':'S')+' TO BREAK':
  (figWatchHorizon(x.metric)===1?'NEXT GAME':'');
 const requirement=streak&&x.gamesNeeded>1?
  x.requirement+' for '+x.gamesNeeded+' more consecutive games':x.requirement;
 return '<a class="fig-watch-row" href="'+esc(x.href)+'">'+
  '<span class="fig-watch-person">'+ownerAvatar(x.teamId,'fig-watch-avatar')+
  '<strong>'+esc(x.team)+'</strong></span>'+
  '<span class="fig-watch-details"><b>'+esc(x.title)+'</b>'+
   '<span><i>'+esc(x.scope)+'</i> · '+(streak?'Ended record ':'Record ')+
    esc(streak?x.record+' games':money(x.record))+' · '+esc(x.recordHolder)+'</span>'+
   '<small>'+esc(requirement)+'</small></span>'+
  '<span class="fig-watch-progress"><strong>'+esc(mark)+'</strong>'+(target?'<small>'+esc(target)+'</small>':'')+'</span>'+
  '<span class="fig-watch-status is-break">BREAK</span>'+
  '<span class="fig-watch-arrow" aria-hidden="true">›</span></a>';
}
function figWatchSection(kind,entries,through){
 const isStreak=kind==='streaks',id=isStreak?'figStreakWatch':'figRecordWatch';
 const subtitle=isStreak?'Only ended streak records that could be surpassed within 3 consecutive games.':
  'Regular-season records within 6 games; career 125+/150+ only within 1 game.';
 const list=entries.length?
  entries.map((x,i)=>'<div class="fig-watch-item"'+(i>=6?' hidden':'')+'>'+figWatchRow(x,isStreak)+'</div>').join(''):
  '<div class="fig-watch-empty">No outright record breaks are currently within the '+(isStreak?'3-game':'6-game')+' watch window.</div>';
 const more=entries.length>6?'<button type="button" class="fig-watch-more" data-watch-expand="'+id+'" aria-expanded="false">SHOW ALL '+entries.length+' OPPORTUNITIES</button>':'';
 return '<section class="section fig-watch-section" id="'+id+'"><div class="section-head">'+
  '<h2 class="section-title">RECORD BREAK WATCH</h2><div class="section-note">'+esc(through)+'</div></div>'+
  '<div class="fig-watch-panel"><div class="fig-watch-intro"><span>'+esc(subtitle)+
  '</span><strong>'+entries.length+' WATCH ITEM'+(entries.length===1?'':'S')+'</strong></div>'+
  '<div class="fig-watch-list">'+list+'</div>'+more+'</div></section>';
}
function figWireWatch(id){
 const root=document.getElementById(id);if(!root)return;
 const button=root.querySelector('.fig-watch-more');if(!button)return;
 let expanded=false;
 button.addEventListener('click',()=>{
  expanded=!expanded;
  root.querySelectorAll('.fig-watch-item').forEach((item,i)=>item.hidden=!expanded&&i>=6);
  button.textContent=expanded?'SHOW TOP 6':'SHOW ALL '+root.querySelectorAll('.fig-watch-item').length+' OPPORTUNITIES';
  button.setAttribute('aria-expanded',String(expanded));
 });
}
