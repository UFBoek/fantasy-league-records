/* FIG Hall of Fame — inaugural historical exhibit. All honors are computed
   from completed Sleeper seasons, never AI predictions or live results. */
(function(){
'use strict';
const INDUCTION_YEAR=2026, THROUGH=2025, POSITIONS=['QB','RB','WR','TE'];
const OWNERS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
const PORTRAITS={1:'boek.webp',2:'fru.webp',3:'fromm.webp',4:'sack.webp',5:'leyton.webp',6:'hayden-2026.svg',7:'line.webp',8:'winston.webp',9:'camnol.webp',10:'james.webp'};
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const fmt=(n,d=0)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=v=>encodeURIComponent(String(v||''));
function completedYears(data){
 const years=(data.league||[]).filter(x=>x.status==='complete'&&num(x.season)<=THROUGH).map(x=>num(x.season));
 return [...new Set(years)].sort((a,b)=>a-b);
}
function finalsFor(data,years){
 const games=(data.games||[]);
 return years.map(y=>games.find(g=>num(g.season)===y&&g.game_type==='Playoffs'&&num(g.playoff_round)===3&&num(g.matchup_id)===1))
  .filter(Boolean).map(g=>({season:num(g.season),game:g,champion:num(g.winner_franchise_id),
   runnerUp:num(g.winner_franchise_id)===num(g.franchise_1)?num(g.franchise_2):num(g.franchise_1)}));
}
function franchises(data,years,finals){
 const eligible=new Set(years);
 return Object.keys(OWNERS).map(id=>{
  const fid=num(id),seasons=(data.teamSeasonMaster||[]).filter(s=>num(s.franchise_id)===fid&&eligible.has(num(s.season))&&s.season_complete===true);
  const wins=seasons.reduce((s,r)=>s+num(r.wins),0),losses=seasons.reduce((s,r)=>s+num(r.losses),0);
  const apw=seasons.reduce((s,r)=>s+num(r.all_play_wins),0),apl=seasons.reduce((s,r)=>s+num(r.all_play_losses),0);
  const allPlay=apw+apl?100*apw/(apw+apl):0,winPct=wins+losses?100*wins/(wins+losses):0;
  const titles=finals.filter(f=>f.champion===fid).map(f=>f.season);
  const runnerUps=finals.filter(f=>f.runnerUp===fid).map(f=>f.season);
  const firsts=seasons.filter(s=>num(s.regular_season_finish)===1).map(s=>num(s.season));
  const bestScoring=years.filter(y=>{
   const group=(data.teamSeasonMaster||[]).filter(s=>num(s.season)===y&&s.season_complete===true);
   const top=Math.max(0,...group.map(s=>num(s.points_for)));
   return group.some(s=>num(s.franchise_id)===fid&&num(s.points_for)===top&&top>0);
  });
  const score=titles.length*100+runnerUps.length*48+firsts.length*20+bestScoring.length*14+
   Math.round(Math.max(0,allPlay-50)*1.6);
  return {id:fid,name:OWNERS[fid],seasons,wins,losses,winPct,allPlay,points:seasons.reduce((s,r)=>s+num(r.points_for),0),
   titles,runnerUps,firsts,bestScoring,score};
 }).sort((a,b)=>b.score-a.score||b.allPlay-a.allPlay||a.id-b.id)
 .map((r,i)=>({...r,rank:i+1,inducted:i<3}));
}
function legends(data,years){
 const eligible=new Set(years),map=new Map();
 (data.playerLog||[]).forEach(row=>{
  if(!eligible.has(num(row.season)))return;
  const position=String(row.position||'').toUpperCase(),id=String(row.player_id||'');
  if(!POSITIONS.includes(position)||!id)return;
  let p=map.get(id);
  if(!p){p={id,name:row.player_name||'Unknown',position,starts:0,points:0,best:0,twenties:0,thirties:0,teams:new Set(),seasons:new Set(),weeks:[]};map.set(id,p);}
  const points=num(row.starter_points??row.fantasy_points);
  p.starts++;p.points+=points;p.best=Math.max(p.best,points);
  if(points>=20)p.twenties++;if(points>=30)p.thirties++;
  p.teams.add(num(row.franchise_id));p.seasons.add(num(row.season));
  p.weeks.push({year:num(row.season),week:num(row.week),team:num(row.franchise_id),points});
 });
 const results=[...map.values()].filter(x=>x.starts>=10).map(x=>({
  ...x,avg:x.points/x.starts,teams:[...x.teams].sort((a,b)=>a-b),
  seasons:[...x.seasons].sort((a,b)=>a-b),score:x.points+4*(x.points/x.starts)+10*x.twenties,
  weeks:x.weeks.sort((a,b)=>b.points-a.points||a.year-b.year||a.week-b.week)
 }));
 return POSITIONS.flatMap(pos=>results.filter(x=>x.position===pos)
   .sort((a,b)=>b.score-a.score||b.points-a.points||a.id.localeCompare(b.id))
   .slice(0,3).map((p,i)=>({...p,posRank:i+1})));
}
function seasonLegends(data,years,finals){
 const valid=new Set(years);
 return (data.teamSeasonMaster||[]).filter(r=>valid.has(num(r.season))&&r.season_complete===true)
 .map(r=>({year:num(r.season),id:num(r.franchise_id),name:OWNERS[num(r.franchise_id)]||'Unknown',
  wins:num(r.wins),losses:num(r.losses),points:num(r.points_for),ppg:num(r.points_per_game),
  allPlay:num(r.all_play_win_pct),highs:num(r.weekly_high_scores),
  champion:finals.some(f=>f.season===num(r.season)&&f.champion===num(r.franchise_id))}))
 .sort((a,b)=>b.allPlay-a.allPlay||b.ppg-a.ppg||a.year-b.year||a.id-b.id).slice(0,8);
}
function moments(data,years,finals){
 const y=new Set(years),games=(data.games||[]).filter(g=>y.has(num(g.season))&&num(g.franchise_1)>0&&num(g.franchise_2)>0&&Number.isFinite(Number(g.score_1))&&Number.isFinite(Number(g.score_2)));
 const regular=games.filter(g=>g.game_type==='Regular Season');
 const highScore=[...games].sort((a,b)=>Math.max(num(b.score_1),num(b.score_2))-Math.max(num(a.score_1),num(a.score_2)))[0];
 const closest=[...regular].filter(g=>num(g.margin)>0).sort((a,b)=>num(a.margin)-num(b.margin))[0];
 const highestCombined=[...games].sort((a,b)=>num(b.combined_points)-num(a.combined_points))[0];
 const margin=[...games].sort((a,b)=>num(b.margin)-num(a.margin))[0];
 const extras=[
  {label:'THE SCORING RECORD',sub:'Highest single-team game',game:highScore},
  {label:'THE PHOTO FINISH',sub:'Closest regular-season game',game:closest},
  {label:'THE SHOOTOUT',sub:'Most combined points',game:highestCombined},
  {label:'THE STATEMENT',sub:'Largest winning margin',game:margin}
 ];
 const cards=finals.slice().reverse().map(f=>({label:'CHAMPIONSHIP '+f.season,sub:'The title game',game:f.game,championship:true}));
 for(const x of extras)if(x.game&&!cards.some(z=>z.game.season===x.game.season&&z.game.week===x.game.week&&z.game.matchup_id===x.game.matchup_id))cards.push(x);
 return cards;
}
function model(data){
 const years=completedYears(data),finals=finalsFor(data,years);
 if(!years.length||!finals.length)throw new Error('No completed championship seasons in the published archive.');
 return {years,finals,franchises:franchises(data,years,finals),legends:legends(data,years),
  seasons:seasonLegends(data,years,finals),moments:moments(data,years,finals)};
}
const medallion=()=>'<svg class="fig-hof-crest" viewBox="0 0 184 190" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">'+
 '<path d="M45 148C5 114 21 51 58 26M139 148c40-34 24-97-13-122" stroke="currentColor" stroke-width="2"/>'+
 '<path d="M39 126l-19-9m25-8-23-15m27 0-20-19m28 0-14-21m17 8-5-22m20 14-2-24m73 96 19-9m-25-8 23-15m-27 0 20-19m-28 0 14-21m-17 8 5-22m-20 14 2-24" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'+
 '<path d="m92 27 8.5 17 19 2.8-13.8 13.4 3.3 19-17-9-17 9 3.3-19-13.8-13.4 19-2.8L92 27Z" fill="currentColor"/>'+
 '<path d="M65 86h54v15c0 20-11 30-27 30s-27-10-27-30V86Zm0 8H52v8c0 14 6 18 18 18m49-26h13v8c0 14-6 18-18 18M92 131v15m-24 9h48m-40-9h32" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>'+
 '<path d="M45 166h94" stroke="currentColor" stroke-width="1" opacity=".6"/>'+
 '</svg>';
const ownerImage=(id,cls='')=>'<span class="fig-hof-avatar '+cls+'"><img loading="lazy" decoding="async" src="assets/avatars/'+esc(PORTRAITS[id]||'')+'" alt="" onerror="this.remove()"><span class="fig-hof-avatar-initial">'+esc((OWNERS[id]||'?').slice(0,1))+'</span></span>';
const playerImage=(p,cls='')=>'<span class="fig-hof-player-photo '+cls+'"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="https://sleepercdn.com/content/nfl/players/thumb/'+slug(p.id)+'.jpg" alt="" onerror="this.remove()"><span class="fig-hof-avatar-initial">'+esc(p.position)+'</span></span>';
const logo=()=>'<span class="fig-hof-seal">FIG <span>HALL OF FAME</span></span>';
const nav=(current)=>'<nav class="fig-hof-nav" aria-label="Hall of Fame exhibits">'+[
 ['overview','The Hall'],['franchises','Franchise Legends'],['players','Player Legends'],['seasons','Greatest Seasons'],['moments','Iconic Moments']].map(([id,title])=>
 '<a '+(current===id?'aria-current="page" ':'')+'href="#/hall-of-fame'+(id==='overview'?'':'/'+id)+'">'+title+'</a>').join('')+'</nav>';
const sectionTitle=(eyebrow,title,copy)=>'<header class="fig-hof-section-head"><div class="fig-hof-eyebrow">'+eyebrow+'</div><h2>'+title+'</h2><p>'+copy+'</p></header>';
const header=(view)=>'<header class="fig-hof-site-head">'+logo()+'<span>EST. 2026 <b>·</b> FROMM IS GARBAGE</span></header>'+nav(view);
const number=(label,value)=>'<div class="fig-hof-number"><strong>'+value+'</strong><span>'+label+'</span></div>';
const cardName=(name)=>esc(name);
function franchiseCard(p,featured=false){
 return '<a class="fig-hof-member '+(featured?'is-featured ':'')+(p.inducted?'is-inducted':'')+'" href="#/hall-of-fame/franchise/'+p.id+'">'+
 '<span class="fig-hof-member-kicker">'+(p.inducted?'INAUGURAL INDUCTEE · '+String(p.rank).padStart(2,'0'):'FRANCHISE ARCHIVE · '+String(p.rank).padStart(2,'0'))+'</span>'+
 '<div class="fig-hof-member-portrait">'+ownerImage(p.id)+'</div>'+
 '<div class="fig-hof-member-bottom"><h3>'+cardName(p.name)+'</h3><p>'+ (p.titles.length?p.titles.length+'× FIG CHAMPION':p.runnerUps.length?p.runnerUps.length+'× CHAMPIONSHIP FINALIST':'FRANCHISE LEGACY')+'</p>'+
 '<div class="fig-hof-member-line"><span>'+p.score+' LEGACY PTS</span><span>VIEW PROFILE ↗</span></div></div></a>';
}
function playerCard(p){
 return '<a class="fig-hof-player" href="#/hall-of-fame/player/'+slug(p.id)+'">'+
 '<span class="fig-hof-rank">'+p.position+' / 0'+p.posRank+'</span>'+playerImage(p)+
 '<div class="fig-hof-player-details"><h3>'+esc(p.name)+'</h3><p>'+fmt(p.points,1)+' CAREER STARTER PTS</p>'+
 '<div><span>'+p.starts+' STARTS</span><span>'+fmt(p.avg,1)+' PPG</span></div></div><span class="fig-hof-arrow" aria-hidden="true">↗</span></a>';
}
function gameCard(item){
 const g=item.game,a=num(g.franchise_1),b=num(g.franchise_2);
 return '<a class="fig-hof-game" href="#/game/'+num(g.season)+'/'+num(g.week)+'/'+num(g.matchup_id)+'">'+
 '<div class="fig-hof-game-top"><span>'+esc(item.label)+'</span><span>'+num(g.season)+' · WK '+num(g.week)+'</span></div>'+
 '<div class="fig-hof-game-teams"><div>'+ownerImage(a)+'<strong>'+esc(OWNERS[a]||'Team '+a)+'</strong></div>'+
 '<div class="fig-hof-game-score">'+fmt(g.score_1,2)+'<small>—</small>'+fmt(g.score_2,2)+'</div>'+
 '<div>'+ownerImage(b)+'<strong>'+esc(OWNERS[b]||'Team '+b)+'</strong></div></div>'+
 '<div class="fig-hof-game-foot"><span>'+esc(item.sub)+'</span><b>OPEN BOX SCORE ↗</b></div></a>';
}
function seasonCard(s,i){
 return '<a class="fig-hof-season" href="#/teamseason/'+s.id+'/'+s.year+'">'+
 '<div class="fig-hof-season-num">'+String(i+1).padStart(2,'0')+'</div>'+
 '<div class="fig-hof-season-team">'+ownerImage(s.id)+'<span><small>'+s.year+' SEASON '+(s.champion?'· CHAMPION':'')+'</small><strong>'+esc(s.name)+'</strong></span></div>'+
 '<div class="fig-hof-season-stat"><strong>'+fmt(s.allPlay,1)+'%</strong><small>ALL-PLAY WIN RATE</small></div>'+
 '<div class="fig-hof-season-stat"><strong>'+fmt(s.ppg,1)+'</strong><small>PTS / GAME</small></div>'+
 '<span class="fig-hof-season-arrow">↗</span></a>';
}
function featureHero(m){
 const top=m.franchises[0],current=m.finals.slice(-1)[0];
 return '<section class="fig-hof-hero"><div class="fig-hof-hero-stars" aria-hidden="true">✦ &nbsp; ✦ &nbsp; ✦</div>'+
 '<div class="fig-hof-hero-text"><span class="fig-hof-kicker">THE OFFICIAL FIG HISTORICAL TRIBUTE</span>'+
 '<h1>Immortalize<br><em>Greatness.</em></h1>'+
 '<p>Legends are not made by prediction. They are written into the record. Welcome to the home of the greatest careers, seasons, and moments in Fromm is Garbage history.</p>'+
 '<div class="fig-hof-hero-actions"><a class="fig-hof-gold-btn" href="#/hall-of-fame/franchises">ENTER THE HALL <span>↗</span></a>'+
 '<a class="fig-hof-text-btn" href="#/hall-of-fame/methodology">HOW INDUCTION WORKS ↗</a></div></div>'+
 '<div class="fig-hof-hero-emblem"><div class="fig-hof-emblem-halo"></div>'+medallion()+
 '<div class="fig-hof-emblem-caption"><span>INSTITUTED</span><strong>'+INDUCTION_YEAR+'</strong><span>LEAGUE HERITAGE</span></div></div>'+
 '<div class="fig-hof-hero-foot"><span>INAUGURAL CLASS · '+INDUCTION_YEAR+'</span><span>ARCHIVE '+m.years[0]+' — '+m.years.at(-1)+'</span></div></section>'+
 '<div class="fig-hof-stat-bar">'+number('HISTORICAL SEASONS',m.years.length)+number('INAUGURAL FRANCHISES',3)+
 number('PLAYER LEGENDS',m.legends.length)+number('TITLE GAMES',m.finals.length)+'</div>';
}
function overview(m){
 return featureHero(m)+
 '<section class="fig-hof-content">'+
 sectionTitle('I / THE FOUNDING CLASS','The Enshrined','Three franchises. One inaugural class. Their place in FIG history was earned on the field.')+
 '<div class="fig-hof-member-grid">'+m.franchises.filter(x=>x.inducted).map(p=>franchiseCard(p,true)).join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>CLASS OF 2026 · FRANCHISE WING</span><a href="#/hall-of-fame/franchises">VIEW ALL FRANCHISES ↗</a></div>'+
 '<div class="fig-hof-feature"><div><div class="fig-hof-eyebrow">II / THE CHAMPIONSHIP LINEAGE</div>'+
 '<h2>The title is<br><em>forever.</em></h2><p>Every championship is permanent. Explore the exact box scores of the games that made FIG history.</p>'+
 '<a class="fig-hof-text-btn" href="#/hall-of-fame/moments">WITNESS THE MOMENTS ↗</a></div>'+
 '<div class="fig-hof-title-list">'+m.finals.slice().reverse().map(f=>
 '<a href="#/game/'+f.season+'/'+num(f.game.week)+'/'+num(f.game.matchup_id)+'"><span>'+f.season+'</span>'+ownerImage(f.champion)+'<strong>'+esc(OWNERS[f.champion])+'</strong><small>CHAMPION ↗</small></a>').join('')+'</div></div>'+
 sectionTitle('III / THE PLAYER WING','Names That Endure','The top three verified fantasy starters at each position across the completed 2023–2025 seasons.')+
 '<div class="fig-hof-player-grid">'+m.legends.slice().sort((a,b)=>a.posRank-b.posRank||POSITIONS.indexOf(a.position)-POSITIONS.indexOf(b.position)).slice(0,8).map(playerCard).join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>12 INDUCTEES · 4 POSITIONS</span><a href="#/hall-of-fame/players">EXPLORE THE PLAYER WING ↗</a></div>'+
 sectionTitle('IV / THE RECORD ROOM','Moments of Immortality','Every historic moment links directly to its archived box score.')+
 '<div class="fig-hof-game-grid">'+m.moments.slice(0,2).map(gameCard).join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>ONLY COMPLETED OFFICIAL GAMES</span><a href="#/hall-of-fame/moments">ALL ICONIC MOMENTS ↗</a></div></section>';
}
function franchiseWing(m){
 return '<section class="fig-hof-content">'+sectionTitle('I / FRANCHISE WING','The Immortals','The top three franchises form the inaugural class. Every team remains in the ballot archive, ranked by a published, transparent formula.')+
 '<div class="fig-hof-inscription"><span>CLASS OF '+INDUCTION_YEAR+'</span><strong>THE FOUNDING THREE</strong><span>HISTORY THROUGH '+THROUGH+'</span></div>'+
 '<div class="fig-hof-member-grid">'+m.franchises.filter(x=>x.inducted).map(p=>franchiseCard(p,true)).join('')+'</div>'+
 sectionTitle('THE BALLOT ARCHIVE','Every Legacy','A complete ranking of all ten franchises, including the teams outside the inaugural class.')+
 '<div class="fig-hof-ballot">'+m.franchises.map(p=>'<a href="#/hall-of-fame/franchise/'+p.id+'"><span class="fig-hof-ballot-rank">'+String(p.rank).padStart(2,'0')+'</span>'+ownerImage(p.id)+
 '<strong>'+esc(p.name)+'</strong><span>'+p.titles.length+' TITLES · '+p.runnerUps.length+' RUNNER-UPS</span>'+
 '<b>'+p.score+' PTS</b><small>'+(p.inducted?'ENSHRINED':'ARCHIVE')+'</small><span>↗</span></a>').join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>STANDARDIZED HISTORICAL SCORE</span><a href="#/hall-of-fame/methodology">READ THE CRITERIA ↗</a></div></section>';
}
function playerWing(m,position){
 const category=POSITIONS.includes(position)?position:null;
 return '<section class="fig-hof-content">'+sectionTitle('II / PLAYER WING','Icons of the Game','Twelve starter careers are honored: the top three at QB, RB, WR and TE. These totals represent points actually scored in FIG starting lineups.')+
 '<div class="fig-hof-filter" aria-label="Filter inducted players">'+[['ALL','All positions'],...POSITIONS.map(x=>[x,x])].map(([id,label])=>
 '<a href="#/hall-of-fame/players'+(id==='ALL'?'':'/'+id)+'" '+((category||'ALL')===id?'aria-current="true"':'')+'>'+label+'</a>').join('')+'</div>'+
 '<div class="fig-hof-player-grid">'+m.legends.filter(p=>!category||p.position===category).map(playerCard).join('')+'</div>'+
 '<p class="fig-hof-smallprint">Minimum 10 official FIG starts. Rank within each position: total starter points + 4 × PPG + 10 × 20-point games. Only completed 2023–2025 seasons are included.</p></section>';
}
function seasonsWing(m){
 return '<section class="fig-hof-content">'+sectionTitle('III / SEASON WING','Seasons for the Ages','The highest all-play win percentages of the completed FIG era. Every weekly opponent counts equally, neutralizing schedule differences.')+
 '<div class="fig-hof-season-list">'+m.seasons.map(seasonCard).join('')+'</div>'+
 '<div class="fig-hof-note"><span>WHY ALL-PLAY?</span><p>Each team is compared with every other franchise in every regular-season week. This measures how often a roster outscored the league rather than rewarding a favorable head-to-head schedule.</p></div></section>';
}
function momentsWing(m){
 return '<section class="fig-hof-content">'+sectionTitle('IV / MOMENTS WING','The Games That Made Us','Championship deciders, scoring records, breathtaking finishes, and the definitive statements. All sourced from official archived results.')+
 '<div class="fig-hof-game-grid">'+m.moments.map(gameCard).join('')+'</div>'+
 '<p class="fig-hof-smallprint">Game-record categories are calculated from all completed 2023–2025 official games. If a championship already holds a record, it appears only once.</p></section>';
}
function franchiseDetail(m,id){
 const p=m.franchises.find(x=>x.id===num(id));if(!p)return null;
 const seasonLines=p.seasons.slice().sort((a,b)=>num(b.season)-num(a.season));
 return '<section class="fig-hof-content fig-hof-detail">'+
 '<a class="fig-hof-back" href="#/hall-of-fame/franchises">← BACK TO THE FRANCHISE WING</a>'+
 '<div class="fig-hof-profile-hero"><div class="fig-hof-profile-pic">'+ownerImage(p.id)+'</div>'+
 '<div><span class="fig-hof-kicker">'+(p.inducted?'INAUGURAL CLASS · 2026':'FRANCHISE BALLOT ARCHIVE')+' / RANK '+String(p.rank).padStart(2,'0')+'</span>'+
 '<h1>'+esc(p.name)+'</h1><p>'+p.titles.length+' championship'+(p.titles.length===1?'':'s')+' · '+p.runnerUps.length+' runner-up finish'+(p.runnerUps.length===1?'':'es')+'</p>'+
 '<a class="fig-hof-gold-btn" href="#/team/'+p.id+'">FULL TEAM ARCHIVE ↗</a></div></div>'+
 '<div class="fig-hof-profile-stats">'+number('LEGACY POINTS',p.score)+number('TITLE WINS',p.titles.length)+number('REGULAR-SEASON WINS',p.wins)+number('ALL-PLAY RATE',fmt(p.allPlay,1)+'%')+'</div>'+
 sectionTitle('THE ACHIEVEMENTS','A Record of Greatness','Official completed-season honors, with no forecasted accomplishments.')+
 '<div class="fig-hof-accolades">'+(p.titles.map(y=>'<span>★ '+y+' FIG CHAMPION</span>').concat(p.runnerUps.map(y=>'<span>'+y+' CHAMPIONSHIP FINALIST</span>'),p.firsts.map(y=>'<span>'+y+' REGULAR-SEASON #1</span>'),p.bestScoring.map(y=>'<span>'+y+' SCORING LEADER</span>')).join('')||'<p>No championship or regular-season major honors recorded yet.</p>')+'</div>'+
 sectionTitle('YEAR BY YEAR','The Career Ledger','Open any season to explore its original roster and weekly history.')+
 '<div class="fig-hof-ledger">'+seasonLines.map(x=>'<a href="#/teamseason/'+p.id+'/'+num(x.season)+'"><b>'+num(x.season)+'</b><span>'+num(x.wins)+'–'+num(x.losses)+' REGULAR SEASON</span><span>'+fmt(x.points_per_game,1)+' PPG</span><span>'+fmt(x.all_play_win_pct,1)+'% ALL-PLAY</span><strong>OPEN ↗</strong></a>').join('')+'</div></section>';
}
function playerDetail(m,id){
 const p=m.legends.find(x=>x.id===id);if(!p)return null;
 return '<section class="fig-hof-content fig-hof-detail">'+
 '<a class="fig-hof-back" href="#/hall-of-fame/players">← BACK TO PLAYER LEGENDS</a>'+
 '<div class="fig-hof-profile-hero"><div class="fig-hof-profile-pic is-player">'+playerImage(p)+'</div><div>'+
 '<span class="fig-hof-kicker">'+p.position+' LEGEND · POSITION RANK '+String(p.posRank).padStart(2,'0')+' · CLASS OF 2026</span>'+
 '<h1>'+esc(p.name)+'</h1><p>Scored for '+p.teams.map(id=>esc(OWNERS[id]||'Team '+id)).join(', ')+'</p>'+
 '<a class="fig-hof-gold-btn" href="#/player/'+slug(p.id)+'">FULL PLAYER RECORD ↗</a></div></div>'+
 '<div class="fig-hof-profile-stats">'+number('STARTER POINTS',fmt(p.points,1))+number('STARTS',p.starts)+number('POINTS / START',fmt(p.avg,1))+number('20+ POINT GAMES',p.twenties)+'</div>'+
 sectionTitle('SIGNATURE PERFORMANCES','The Great Games','The five highest-scoring starts from the completed seasons in the Hall of Fame.')+
 '<div class="fig-hof-ledger">'+p.weeks.slice(0,5).map(w=>'<a href="#/teamseason/'+w.team+'/'+w.year+'"><b>'+w.year+' · WK '+w.week+'</b><span>'+esc(OWNERS[w.team]||'TEAM')+'</span><span>'+fmt(w.points,1)+' POINTS</span><strong>SEASON ↗</strong></a>').join('')+'</div></section>';
}
function methodology(m){
 return '<section class="fig-hof-content">'+sectionTitle('THE CHARTER','The Standard of Greatness','A transparent inaugural class, drawn exclusively from three completed years of official FIG league records.')+
 '<div class="fig-hof-rules">'+[
 ['01','AN UNCHANGING FOUNDING CLASS','The 2026 inaugural honors are calculated using completed seasons 2023 through 2025. The founding class is a historical snapshot; future years cannot retroactively alter this class.'],
 ['02','FRANCHISE HONORS','Rank all ten franchises by legacy points: 100 per title, 48 per runner-up, 20 per regular-season first-place finish, 14 per season scoring title, plus 1.6 points for each all-play percentage point above 50, rounded. The top three are inducted.'],
 ['03','PLAYER HONORS','Top three QB, RB, WR and TE careers, each with at least 10 official starts. Score = total starting fantasy points + 4 × average points per start + 10 × number of 20+ point starts. Totals are across franchises.'],
 ['04','SEASON EXHIBITS','Rank complete franchise-seasons by regular-season all-play win percentage; points per game breaks ties. These exhibits honor seasons rather than inducting a new franchise.'],
 ['05','ICONIC MOMENTS','Show the three championship games, highest individual team score, closest regular-season result, highest combined score, and largest victory margin. Duplicate games appear once.'],
 ['06','SOURCE OF TRUTH','Records come from the published FIG Sleeper archive. No AI decides honors or manufactures statistics. Every individual and season links to its original archival detail page.']
 ].map(r=>'<div class="fig-hof-rule"><span>'+r[0]+'</span><div><h3>'+r[1]+'</h3><p>'+r[2]+'</p></div></div>').join('')+'</div>'+
 '<p class="fig-hof-smallprint">The Hall of Fame is a FIG editorial recognition project, not an NFL or Pro Football Hall of Fame affiliation. All statistics reflect this specific fantasy league.</p></section>';
}
function footer(m){
 return '<footer class="fig-hof-footer"><div>'+logo()+'<p>THE PAST IS PERMANENT.<br>THE NEXT LEGEND IS EARNED.</p></div>'+
 '<div><a href="#/hall-of-fame/methodology">INDUCTION CHARTER ↗</a><a href="#/games">GAME ARCHIVE ↗</a><a href="#/more">BACK TO FIG ↗</a></div>'+
 '<span>ARCHIVAL PERIOD '+m.years[0]+'–'+m.years.at(-1)+' · FROMM IS GARBAGE</span></footer>';
}
async function page(ctx,view,sub){
 const {load,DATA,app}=ctx;
 await load(['league','games','teamSeasonMaster','playerLog']);
 const m=model(DATA);
 const kind=['franchises','players','seasons','moments','methodology'].includes(view)?view:'overview';
 const content=view==='franchise'?franchiseDetail(m,sub):view==='player'?playerDetail(m,decodeURIComponent(sub||'')):
 kind==='franchises'?franchiseWing(m):kind==='players'?playerWing(m,sub):kind==='seasons'?seasonsWing(m):
 kind==='moments'?momentsWing(m):kind==='methodology'?methodology(m):overview(m);
 app.innerHTML='<div class="fig-hof" id="figHallOfFame">'+header(view==='franchise'?'franchises':view==='player'?'players':kind)+
 (content||'<section class="fig-hof-content"><p>Exhibit not found. <a href="#/hall-of-fame">Return to the Hall →</a></p></section>')+
 footer(m)+'</div>';
 document.title='Hall of Fame — Fromm is Garbage';
}
window.figHallOfFame=page;
window.figHallOfFameModel={model,franchises,legends,seasonLegends,moments,completedYears,finalsFor};
})();