/* FIG league-stat search. Read-only against published, finalized JSON. */
(function(root){
'use strict';
const OWNERS=[
[1,'Boek',['boek','jackboek1']],[2,'Fru',['fru','mattboek21']],
[3,'Fromm',['fromm','eph99']],[4,'Sack',['sack','sak','jdub95']],
[5,'Leyton',['leyton','lbracke']],[6,'Hayden',['hayden','haydenm']],
[7,'Line',['line','lionel','lionelcoll']],[8,'Winston',['winston','wincollins2']],
[9,'CamNol',['camnol','cam nol','nolanfm13']],[10,'James',['james','jamest33']]
];
const EXAMPLES=[
'Which teams had 3 starting WRs score 20+ points in the same week?',
'How many times did Boek outscore Hayden in the same week but lose?',
'How many non-QB touchdowns did Boek starters score each week in 2026?',
'What are the 10 biggest blowouts ever?',
'How many trades has Fru made?',
'Who has the most 200 point weeks?',
'Who drafted Josh Allen?',
'Who scored the most points in Week 7 of 2026?'
];
const files={games:'games',players:'player_game_log',trades:'trades',drafts:'draft_picks'},cache={};
const n=x=>Number(x)||0,fmt=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:2});
const clean=x=>String(x==null?'':x).toLowerCase().replace(/([a-z])['’]s\b/g,'$1').replace(/[’']/g,'').replace(/[^a-z0-9+.\s-]/g,' ').replace(/\s+/g,' ').trim();
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=id=>(OWNERS.find(o=>o[0]===n(id))||[0,'Unknown'])[1];
const teamHref=id=>'#/team/'+n(id),gameHref=g=>'#/game/'+g.season+'/'+g.week+'/'+g.matchup_id;
const playerHref=id=>'#/player/'+encodeURIComponent(id);
function teamsIn(q){
 const s=' '+clean(q)+' ',hits=[];
 for(const [id,display,aliases] of OWNERS){
  let index=Infinity;
  for(const a of aliases){const i=s.indexOf(' '+a+' ');if(i>=0)index=Math.min(i,index);}
  if(index!==Infinity)hits.push({id,name:display,index});
 }
 return hits.sort((a,b)=>a.index-b.index);
}
function scope(q,games){
 const s=clean(q),years=[...s.matchAll(/\b20[2-3][0-9]\b/g)].map(m=>n(m[0]));
 let from=null,to=null,wmin=null,wmax=null;
 if(years.length>1){from=Math.min(...years);to=Math.max(...years);}
 else if(years.length){if(/\b(since|after|from)\b/.test(s))from=years[0];
 else if(/\b(before|until|through)\b/.test(s))to=years[0];else from=to=years[0];}
 const w=s.match(/\b(?:week|wk)\s*(\d{1,2})/);
 if(w){
  const week=n(w[1]);
  if(/\b(since|from|after)\s+(?:week|wk)/.test(s))wmin=week;
  else if(/\b(before|until|through)\s+(?:week|wk)/.test(s))wmax=week;
  else wmin=wmax=week;
  if(!years.length){const all=games.map(g=>n(g.season));from=to=Math.max(...all);}
 }
 const combined=/\b(including playoffs|combined|all games|regular and playoff)\b/.test(s);
 const playoffs=/\b(playoff|playoffs|postseason)\b/.test(s);
 const type=combined?'All games':playoffs?'Playoffs':'Regular Season';
 return {type,from,to,desc:(from===to&&from!==null?from:from&&to?from+'–'+to:from?'Since '+from:to?'Through '+to:'All seasons')+
  (wmin!==null&&wmin===wmax?' · Week '+wmin:wmin!==null?' · Since Week '+wmin:wmax!==null?' · Through Week '+wmax:'')+' · '+type,
  test:g=>(from===null||n(g.season)>=from)&&(to===null||n(g.season)<=to)&&
   (wmin===null||((from!==null&&to!==from)?(n(g.season)>from||n(g.week)>=wmin):n(g.week)>=wmin))&&
   (wmax===null||((to!==null&&from!==to)?(n(g.season)<to||n(g.week)<=wmax):n(g.week)<=wmax))&&
   (combined||String(g.game_type).toLowerCase()===(playoffs?'playoffs':'regular season'))};
}
function limit(q){const m=clean(q).match(/\btop\s+(\d{1,2})\b|\b(\d{1,2})\s+(?:biggest|highest|lowest|best|worst)/);return Math.min(30,Math.max(1,n(m&&(m[1]||m[2]))||10));}
function success(title,value,context,columns,rows,note=''){return {ok:true,title,value,context,columns,rows,note};}
const resultRow=(values,href)=>({values,href:href||''});
async function load(key){
 if(!cache[key])cache[key]=fetch('data/'+files[key]+'.json').then(r=>{
  if(!r.ok)throw Error('Could not load '+key);return r.json();
 }).catch(e=>{delete cache[key];throw e;});
 return cache[key];
}
function statsForGames(q,games){
 const s=clean(q),sc=scope(q,games),teamList=teamsIn(q),all=games.filter(sc.test);
 const perf=[];
 for(const g of all)for(const side of [1,2]){
  const team=n(g['franchise_'+side]),opp=n(g['franchise_'+(3-side)]);
  const points=n(g['score_'+side]),against=n(g['score_'+(3-side)]);
  perf.push({team,opp,points,against,win:points>against,loss:points<against,tie:points===against,g});
 }
 const first=teamList[0]?.id;
 if(/\b(championship|championships|titles|rings)\b/.test(s)){
  const finals=games.filter(g=>g.game_type==='Playoffs'&&n(g.playoff_round)===3&&n(g.matchup_id)===1&&
   (sc.from===null||n(g.season)>=sc.from)&&(sc.to===null||n(g.season)<=sc.to));
  const counts=OWNERS.map(o=>({id:o[0],total:finals.filter(g=>n(g.winner_franchise_id)===o[0]).length}));
  counts.sort((a,b)=>b.total-a.total||a.id-b.id);
  const selection=first?counts.filter(x=>x.id===first):counts;
  return success(first?name(first)+' championships':'Most league championships',selection[0]?.total||0,
    'Completed championship games · '+(sc.from||'All seasons'),['Team','Titles'],
    selection.map(x=>resultRow([name(x.id),x.total],teamHref(x.id))));
 }
 if(teamList.length>=2){
  const second=teamList[1].id,matchups=all.filter(g=>[n(g.franchise_1),n(g.franchise_2)].includes(first)&&
   [n(g.franchise_1),n(g.franchise_2)].includes(second));
  if(!matchups.length)return {ok:false,message:'No finalized matchups match those teams and dates.'};
  if(matchups.length===1&&/\b(score|result|what happened|final score|week)\b/.test(s)&&!/\brecord\b/.test(s)){
   const g=matchups[0];return success(name(g.franchise_1)+' vs '+name(g.franchise_2),
    fmt(g.score_1)+' – '+fmt(g.score_2),g.season+' · Week '+g.week+' · '+g.game_type,
    ['Team','Score'],[resultRow([name(g.franchise_1),fmt(g.score_1)],teamHref(g.franchise_1)),resultRow([name(g.franchise_2),fmt(g.score_2)],teamHref(g.franchise_2))]);
  }
  const wins=matchups.filter(g=>n(g.winner_franchise_id)===first).length;
  const ties=matchups.filter(g=>n(g.score_1)===n(g.score_2)).length;
  const losses=matchups.length-wins-ties;
  return success(name(first)+' vs '+name(second),wins+'–'+losses+(ties?'–'+ties:''),
   sc.desc+' · '+matchups.length+' games',['Week','Team 1','Team 2'],
   matchups.slice().reverse().slice(0,limit(q)).map(g=>resultRow([g.season+' W'+g.week,name(g.franchise_1)+' '+fmt(g.score_1),name(g.franchise_2)+' '+fmt(g.score_2)],gameHref(g))),
   'The record is from '+name(first)+'’s perspective.');
 }
 if(first&&/\bagainst\b/.test(s)&&/\b(most|best|highest|fewest|least|wins|losses|points|ppg|average|record)\b/.test(s)){
  const vs=perf.filter(x=>x.opp===first);
  const sums=OWNERS.filter(x=>x[0]!==first).map(o=>{
   const matches=vs.filter(x=>x.team===o[0]);return {id:o[0],games:matches.length,wins:matches.filter(x=>x.win).length,
    points:matches.reduce((a,x)=>a+x.points,0)};
  }).filter(x=>x.games);
  const ppg=/\b(ppg|average|per game)\b/.test(s),points=/\b(points|point|scored|score|ppg)\b/.test(s);
  const measure=x=>points?(ppg?x.points/x.games:x.points):x.wins;
  const low=/\b(fewest|least|lowest)\b/.test(s);
  sums.sort((a,b)=>(low?1:-1)*(measure(a)-measure(b))||a.id-b.id);
  const title=(points?(ppg?'PPG':'Points scored'):'Wins')+' against '+name(first);
  return success(title,sums.length?fmt(measure(sums[0])):0,sc.desc,
   ['Team',points?(ppg?'PPG':'Points'):'Wins','Games'],sums.map(x=>resultRow([name(x.id),fmt(measure(x)),x.games],teamHref(x.id))));
 }
 const relevant=first?perf.filter(x=>x.team===first):perf;
 if(!relevant.length)return {ok:false,message:'No finalized games match those filters.'};
 const blowout=/\b(blowout|blowouts|biggest win|largest win|margin|closest game|closest matchup)\b/.test(s);
 if(blowout){
  const close=/\b(closest|smallest|narrowest)\b/.test(s);
  const games2=all.filter(g=>!first||n(g.franchise_1)===first||n(g.franchise_2)===first)
   .sort((a,b)=>close?n(a.margin)-n(b.margin):n(b.margin)-n(a.margin));
  const best=games2[0];if(!best)return {ok:false,message:'No matching games.'};
  return success(close?'Closest matchups':'Biggest blowouts',fmt(best.margin)+' pts',sc.desc,
   ['Week','Team 1','Team 2','Margin'],games2.slice(0,limit(q)).map(g=>
    resultRow([g.season+' W'+g.week,name(g.franchise_1)+' '+fmt(g.score_1),name(g.franchise_2)+' '+fmt(g.score_2),fmt(g.margin)],gameHref(g))));
 }
 const threshold=s.match(/\b(\d{2,3})\s*\+?\s*(?:point|pt)/);
 if(threshold&&/\b(week|weeks|game|games|times|scor)\b/.test(s)){
  const target=n(threshold[1]),filtered=relevant.filter(x=>x.points>=target);
  if(first)return success(name(first)+' '+target+'+ point games',filtered.length,sc.desc,
   ['Week','Points','Opponent'],filtered.sort((a,b)=>b.points-a.points).slice(0,limit(q)).map(x=>
    resultRow([x.g.season+' W'+x.g.week,fmt(x.points),name(x.opp)],gameHref(x.g))));
  const by=OWNERS.map(o=>({id:o[0],count:filtered.filter(x=>x.team===o[0]).length}))
   .sort((a,b)=>b.count-a.count||a.id-b.id);
  return success(name(by[0].id)+' · Most '+target+'+ point games',by[0].count,sc.desc,['Team','Games'],
   by.map(x=>resultRow([name(x.id),x.count],teamHref(x.id))));
 }
 const avg=/\b(ppg|average|avg|per game)\b/.test(s);
 const weekly=/\b(week|weekly|single|highest scor|lowest scor|one game)\b/.test(s)&&!avg&&
  /\b(score|scored|points|point|week|weekly)\b/.test(s);
 if(weekly&&/\b(highest|lowest|most|least|best|worst|top|score|scored)\b/.test(s)){
  const low=/\b(lowest|least|worst|fewest)\b/.test(s);
  const ordered=relevant.slice().sort((a,b)=>low?a.points-b.points:b.points-a.points);
  return success(name(ordered[0].team)+' · '+(low?'Lowest weekly score':'Highest weekly score'),fmt(ordered[0].points)+' pts',sc.desc,
   ['Team','Week','Score','Opponent'],ordered.slice(0,limit(q)).map(x=>
    resultRow([name(x.team),x.g.season+' W'+x.g.week,fmt(x.points),name(x.opp)],gameHref(x.g))));
 }
 const stat=/\b(losses|loss|lost)\b/.test(s)?'losses':
  /\b(against|allowed|conceded)\b/.test(s)&&/\b(points|point|ppg|score)\b/.test(s)?'against':
  /\b(wins|win|won|record)\b/.test(s)?'wins':'points';
 const groups=OWNERS.map(o=>{
  const a=relevant.filter(x=>x.team===o[0]);
  return {id:o[0],games:a.length,wins:a.filter(x=>x.win).length,losses:a.filter(x=>x.loss).length,
   ties:a.filter(x=>x.tie).length,points:a.reduce((p,x)=>p+x.points,0),against:a.reduce((p,x)=>p+x.against,0)};
 }).filter(x=>x.games);
 const rate=/\b(win percentage|win rate|winning percentage|win pct)\b/.test(s)||(!first&&/\bbest record\b/.test(s));
 if(first&&/\brecord\b/.test(s)&&!rate){
  const x=groups.find(g=>g.id===first);
  if(x)return success(name(first)+' record',x.wins+'–'+x.losses+(x.ties?'–'+x.ties:''),sc.desc,
   ['Team','Wins','Losses','Games'],[resultRow([name(first),x.wins,x.losses,x.games],teamHref(first))]);
 }
 const value=x=>rate?100*x.wins/x.games:stat==='points'?(avg?x.points/x.games:x.points):
  stat==='against'?(avg?x.against/x.games:x.against):x[stat];
 const low=/\b(lowest|fewest|least|worst)\b/.test(s);
 groups.sort((a,b)=>(low?1:-1)*(value(a)-value(b))||a.id-b.id);
 const selected=first?groups.filter(x=>x.id===first):groups;
 if(!selected.length)return {ok:false,message:'No games for that team in the requested period.'};
 const title=rate?'Win percentage':stat==='wins'?'Wins':stat==='losses'?'Losses':
  stat==='against'?(avg?'Points allowed per game':'Points allowed'):avg?'Points per game':'Total points';
 return success((first?name(first):name(selected[0].id))+' · '+title,
  fmt(value(selected[0]))+(rate?'%':stat==='points'||stat==='against'?' pts':''),
  sc.desc,['Team',title,'Record','Games'],selected.map(x=>
   resultRow([name(x.id),fmt(value(x)),x.wins+'–'+x.losses+(x.ties?'–'+x.ties:''),x.games],teamHref(x.id))),
  'Figures come from published, finalized '+sc.type.toLowerCase()+' games.');
}
function statsForPlayers(q,players,games){
 const s=clean(q),sc=scope(q,games);
 let tm=teamsIn(q)[0];
 const names=new Map();
 for(const x of players)if(x.player_name)names.set(String(x.player_id),x.player_name);
 const mentioned=[...names].filter(pair=>(' '+s+' ').includes(' '+clean(pair[1])+' ')).sort((a,b)=>b[1].length-a[1].length)[0];
 if(mentioned&&tm&&(' '+clean(mentioned[1])+' ').includes(' '+clean(tm.name)+' ')&&
  !new RegExp('(?:for|on|by) '+clean(tm.name)+'(?: |$)').test(s))tm=null;
 const position=/\b(qb|quarterback)\b/.test(s)?'QB':/\b(wr|wide receiver)\b/.test(s)?'WR':
  /\b(rb|running back)\b/.test(s)?'RB':/\b(te|tight end)\b/.test(s)?'TE':null;
 const eligible=players.filter(x=>sc.test(x)&&(!tm||n(x.franchise_id)===tm.id)&&
  (!mentioned||String(x.player_id)===mentioned[0])&&(!position||x.position===position));
 if(!eligible.length)return {ok:false,message:'No player starts match the requested team, player, and date.'};
 const starts=/\b(start|starts|started)\b/.test(s)&&!/\b(point|score|scored)\b/.test(s);
 const average=/\b(ppg|average|avg|per game|per start)\b/.test(s);
 const single=/\b(single|weekly|week|one game|best game)\b/.test(s)&&!average&&!starts;
 const groups=new Map();
 for(const x of eligible){
  const id=String(x.player_id);
  if(!groups.has(id))groups.set(id,{id,player:x.player_name,pos:x.position,points:0,games:0,high:-Infinity});
  const item=groups.get(id);item.points+=n(x.starter_points);item.games++;item.high=Math.max(item.high,n(x.starter_points));
 }
 const score=x=>starts?x.games:average?x.points/x.games:single?x.high:x.points;
 const ranked=[...groups.values()].sort((a,b)=>score(b)-score(a)||a.player.localeCompare(b.player));
 const target=ranked[0],selection=mentioned?ranked:ranked.slice(0,limit(q));
 return success(target.player+' · '+(tm?.name||'League')+' '+(starts?'starts':average?'PPG':single?'weekly high':'points'),
  fmt(score(target))+(starts?' starts':' pts'),sc.desc+' · started fantasy players only',
  ['Player','Pos',starts?'Starts':average?'PPG':single?'Best':'Points','Starts'],
  selection.map(x=>resultRow([x.player,x.pos,fmt(score(x)),x.games],playerHref(x.id))),
  'Includes only points from starting lineups, not bench production.');
}
function statsForTrades(q,trades){
 const teams=teamsIn(q),years=[...clean(q).matchAll(/\b20[2-3][0-9]\b/g)].map(m=>n(m[0]));
 const subset=trades.filter(x=>(!years.length||years.includes(n(x.season)))&&
  teams.every(t=>(x.franchise_ids||[]).map(Number).includes(t.id)));
 if(teams.length)return success(teams.map(t=>t.name).join(' & ')+' trades',subset.length,
  years.join(', ')||'All seasons',['Week','Players','Picks'],subset.slice(0,limit(q)).map(x=>
   resultRow([x.season+' W'+x.week,x.total_player_assets,x.total_pick_assets],'#/trades')),
  'Each archived trade transaction is counted once.');
 const groups=OWNERS.map(o=>({id:o[0],count:subset.filter(t=>(t.franchise_ids||[]).map(Number).includes(o[0])).length}))
  .sort((a,b)=>b.count-a.count||a.id-b.id);
 return success(name(groups[0].id)+' · Most trades',groups[0].count,years.join(', ')||'All seasons',['Team','Trades'],
  groups.map(x=>resultRow([name(x.id),x.count],teamHref(x.id))));
}
function statsForDrafts(q,picks){
 const s=clean(q),tm=teamsIn(q)[0],years=[...s.matchAll(/\b20[2-3][0-9]\b/g)].map(m=>n(m[0]));
 const pos=/\b(qb|quarterback)\b/.test(s)?'QB':/\b(wr|wide receiver)\b/.test(s)?'WR':
  /\b(rb|running back)\b/.test(s)?'RB':/\b(te|tight end)\b/.test(s)?'TE':null;
 let rows=picks.filter(x=>(!years.length||years.includes(n(x.draft_season)))&&
  (!tm||n(x.franchise_id)===tm.id)&&(!pos||x.position===pos)&&
  (!/\brookie\b/.test(s)||x.draft_class==='Rookie'));
 const mentioned=[...new Set(rows.map(x=>x.player_name).filter(Boolean))]
  .find(x=>(' '+s+' ').includes(' '+clean(x)+' '));
 if(mentioned){
  rows=rows.filter(x=>x.player_name===mentioned);
  return success('Who drafted '+mentioned+'?',rows.map(x=>name(x.franchise_id)).join(', ')||'Not found',years.join(', ')||'All seasons',
   ['Year','Team','Draft','Pick'],rows.map(x=>resultRow([x.draft_season,name(x.franchise_id),x.draft_class,x.pick_label],'#/draft')));
 }
 if(tm)return success(tm.name+' draft selections',rows.length,years.join(', ')||'All seasons',
  ['Year','Pick','Player','Pos'],rows.slice(0,limit(q)).map(x=>
   resultRow([x.draft_season,x.pick_label,x.player_name,x.position],playerHref(x.player_id))));
 const groups=OWNERS.map(o=>({id:o[0],count:rows.filter(x=>n(x.franchise_id)===o[0]).length}))
  .sort((a,b)=>b.count-a.count||a.id-b.id);
 return success(name(groups[0].id)+' · Most draft selections',groups[0].count,years.join(', ')||'All seasons',
  ['Team','Selections'],groups.map(x=>resultRow([name(x.id),x.count],teamHref(x.id))));
}
async function ask(q){
 // Prefer the genuine, read-only SQL analytics agent. Never silently fall back to a fixed metric.
 if(root.boekmuseDynamic?.ask)return root.boekmuseDynamic.ask(q);
 // The legacy engine remains loadable for historical site tests and compatibility.
 // The free AI layer converts natural language into a validated, deterministic plan.
 // Until the Worker URL is configured, preserve the existing offline keyword search.
 if(root.figAskAi?.ask){const result=await root.figAskAi.ask(q);if(result)return result;}
 const s=clean(q);
 if(s.length<3)return {ok:false,message:'Ask a complete question about league history.'};
 if(/\b(trade|trades|traded)\b/.test(s))return statsForTrades(q,await load('trades'));
 if(/\b(draft|drafted|drafts|drafting)\b/.test(s))return statsForDrafts(q,await load('drafts'));
 if(/\b(superflex|bench|roster value|win probability|projected|future odds|streak|strength of schedule|all.play|rushing yards|receiving yards|touchdowns|passing yards|season total|season record|single.season|per season|each season)\b/.test(s))
  return {ok:false,message:'That question needs a data source this search does not support yet.'};
 const games=await load('games');
 const playerIntent=/\b(player|players|starter|starters|started|starts|qb|rb|wr|te|quarterback|wide receiver|running back|tight end)\b/.test(s);
 if(playerIntent){return statsForPlayers(q,await load('players'),games);}
 if(/\b(point|points|ppg|scored|scoring|score|average)\b/.test(s)){
  const players=await load('players');
  const seen=new Set();
  const hasPlayer=players.some(x=>{const id=String(x.player_id);if(seen.has(id))return false;seen.add(id);
   return x.player_name&&(' '+s+' ').includes(' '+clean(x.player_name)+' ');
  });
  if(hasPlayer)return statsForPlayers(q,players,games);
 }
 if(!/\b(win|wins|won|loss|losses|lost|record|points|point|ppg|score|scored|scoring|games|weeks|blowout|blowouts|championship|championships|titles|average|margin|matchup|matchups)\b/.test(s))
  return {ok:false,message:'This question does not match a supported statistic.'};
 return statsForGames(q,games);
}
const url=q=>'#/boekmuse/'+encodeURIComponent(q);
function form(q,id){
 return '<form class="fig-ask-form"><label class="sr-only" for="'+id+'">Ask a league statistics question</label>'+
 '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'+
 '<circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"></path></svg>'+
 '<input id="'+id+'" type="search" maxlength="220" placeholder="Who has the most wins against Hayden?" value="'+esc(q)+'" required>'+
 '<button type="submit">Search <span aria-hidden="true">→</span></button></form>';
}
function bind(el){el.querySelector('.fig-ask-form')?.addEventListener('submit',e=>{
 e.preventDefault();const q=e.target.querySelector('input').value.trim();if(q)root.location.hash=url(q);
});}
function resultAudit(r){
 if(!r.interpretation)return '';
 const i=r.interpretation;
 return '<div class="boekmuse-audit" role="note"><strong>WHAT I CALCULATED</strong>'+
 '<div><b>Statistic:</b> '+esc(i.measure||'Not specified')+' <span aria-hidden="true">·</span> <b>Grouped by:</b> '+esc(i.group||'Overall')+'</div>'+
 '<div><b>For:</b> '+esc(i.team||'League-wide')+' <span aria-hidden="true">·</span> <b>Scope:</b> '+esc(i.scope||'All published records')+'</div>'+
 '<small>'+esc(i.method||'Calculated from verified league data.')+'</small></div>';
}
function renderResult(r){
 if(!r.ok)return '<div class="fig-ask-error"><h2>No verified answer available</h2><p>'+esc(r.message)+
 '</p><p>Try asking about weekly scores, wins, PPG, matchups, player starts, trades, or drafts.</p></div>';
 const rows=(r.rows||[]).length?'<div class="fig-ask-table-scroll"><table class="fig-ask-table"><thead><tr>'+
 r.columns.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+
 r.rows.map(x=>'<tr>'+x.values.map((v,i)=>'<td>'+(i===0&&x.href?'<a href="'+esc(x.href)+'">'+esc(v)+'</a>':esc(v))+'</td>').join('')+'</tr>').join('')+
 '</tbody></table></div>':'';
 return resultAudit(r)+'<div class="fig-ask-answer"><div class="fig-ask-answer-title">'+esc(r.title)+'</div>'+
 '<div class="fig-ask-answer-value">'+esc(r.value)+'</div><p>'+esc(r.context)+'</p></div>'+rows+
 (r.note?'<p class="fig-ask-note">'+esc(r.note)+'</p>':'')+
 (r.sql?'<details class="boekmuse-query-details"><summary>View verified SQL calculation</summary><pre><code>'+esc(r.sql)+'</code></pre></details>':'');
}
async function render(encoded){
 const app=document.getElementById('app');if(!app)return;
 let q='';try{q=decodeURIComponent(encoded||'');}catch(e){q='';}
 app.innerHTML='<section class="fig-ask-page"><div class="fig-ask-kicker">LEAGUE STAT SEARCH</div><h1>BoekMuse</h1>'+
 '<p>Search verified league statistics. Each answer shows the calculation and source.</p>'+form(q,'fig-ask-input')+
 '<div class="fig-ask-output" aria-live="polite"></div><div class="fig-ask-suggestions"><h2>TRY A QUESTION</h2>'+
 EXAMPLES.map(x=>'<a href="'+url(x)+'">'+esc(x)+' <span aria-hidden="true">↗</span></a>').join('')+
 '</div></section>';
 bind(app);
 if(!q){app.querySelector('input')?.focus();return;}
 const out=app.querySelector('.fig-ask-output');out.innerHTML='<p class="fig-ask-note">Searching finalized league data…</p>';
 try{const result=await ask(q);if(out.isConnected)out.innerHTML=renderResult(result);}
 catch(e){console.error('FIG stats search error',e);if(out.isConnected)out.innerHTML=renderResult({ok:false,message:'League data could not be loaded.'});}
}
if(root.document)root.figLeagueSearch={render,ask,invalidate:()=>{Object.keys(cache).forEach(x=>delete cache[x]);root.figAskAi?.invalidate?.();}};
if(typeof module!=='undefined'&&module.exports)module.exports={statsForGames,statsForPlayers,statsForTrades,statsForDrafts,scope,teamsIn};
})(typeof window==='undefined'?globalThis:window);
