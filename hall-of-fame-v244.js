/* FIG Hall of Fame. Curated permanent player inductions and immortal franchise seasons. */
(function(){
'use strict';
const FOUNDING_CLASS_YEAR=2026,FOUNDING_END=2025,POSITIONS=['QB','RB','WR','TE'];
const OWNERS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
const PORTRAITS={1:'boek.webp',2:'fru.webp',3:'fromm.webp',4:'sack.webp',5:'leyton.webp',6:'hayden-2026.svg',7:'line.webp',8:'winston.webp',9:'camnol.webp',10:'james.webp'};
/* Curated historical inductees. Future classes require an explicit induction
   decision and evidence review, never a top-N query or an annual quota. */
/* Inaugural induction is an explicit decision, not automatic scoring. */
const ENSHRINED_SEASONS=[{year:2025,franchiseId:6,inductionYear:2026,
 title:'Hayden · 2025',honor:'A season beyond the ordinary'}];
const INDUCTION_CLASSES=[{year:2026,title:'The Founding Two',period:'2023–2025',entries:[
 {kind:'player',id:'4984',position:'QB',case:'The quarterback standard of FIG. Three consecutive seasons above 30 combined PPG made Allen the defining statistical force of the founding era.'},
 {kind:'player',id:'9493',position:'WR',nickname:'THE LOGO',case:'The Logo. The face of FIG and the player whose image represents the league. An icon of its identity with an elite three-season record and a historic 2025.'}
]}];
const value=x=>Number.isFinite(Number(x))?Number(x):0;
const fmt=(x,p=0)=>value(x).toLocaleString('en-US',{minimumFractionDigits:p,maximumFractionDigits:p});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const slug=v=>encodeURIComponent(String(v||''));
const name=id=>OWNERS[+id]||'Franchise '+id;
function completedYears(d){return [...new Set((d.league||[]).filter(x=>String(x.status).toLowerCase()==='complete').map(x=>value(x.season)).filter(y=>y>=2023))].sort((a,b)=>a-b);}
function finals(d,years){return years.map(y=>(d.games||[]).find(g=>value(g.season)===y&&g.game_type==='Playoffs'&&value(g.playoff_round)===3&&value(g.matchup_id)===1)).filter(Boolean).map(g=>({year:value(g.season),champion:value(g.winner_franchise_id),runner:value(g.winner_franchise_id)===value(g.franchise_1)?value(g.franchise_2):value(g.franchise_1),game:g}));}
function seasonRows(d,years){const set=new Set(years);return(d.teamSeasonMaster||[]).filter(s=>set.has(value(s.season))&&(s.season_complete===true||s.season_complete==='true')).map(s=>({
  year:value(s.season),id:value(s.franchise_id),name:name(s.franchise_id),wins:value(s.wins),losses:value(s.losses),
  ppg:value(s.points_per_game),points:value(s.points_for),allPlay:value(s.all_play_win_pct),highs:value(s.weekly_high_scores),
  finish:value(s.regular_season_finish),games:value(s.games)
}));}
function playerCareers(d,years){
 // All-Time Combined includes verified regular-season and playoff FIG starts.
 // The player archive uses the same combined season scope.
 const accepted=new Set(years),map=new Map();
 for(const x of d.playerLog||[]){
  const year=value(x.season),position=String(x.position||'').toUpperCase(),id=String(x.player_id||'');
  if(!accepted.has(year)||!POSITIONS.includes(position)||!id||
   !['Regular Season','Playoffs'].includes(String(x.game_type||'')))continue;
  let p=map.get(id);
  if(!p){p={id,position,name:String(x.player_name||'Unnamed'),points:0,starts:0,high:0,p20:0,p30:0,yrs:new Set(),teams:new Set(),weeks:[],bySeason:new Map()};map.set(id,p);}
  const pts=value(x.starter_points);
  p.points+=pts;p.starts++;p.high=Math.max(p.high,pts);p.p20+=Number(pts>=20);p.p30+=Number(pts>=30);
  p.yrs.add(year);p.teams.add(value(x.franchise_id));
  p.weeks.push({year,week:value(x.week),team:value(x.franchise_id),pts});
  const s=p.bySeason.get(year)||{year,points:0,starts:0,high:0};s.points+=pts;s.starts++;s.high=Math.max(s.high,pts);p.bySeason.set(year,s);
 }
 const official=new Map((d.playerSeasons||[])
  .filter(x=>x.scoring_view==='All-Time Combined'&&accepted.has(value(x.season)))
  .map(x=>[String(x.player_id)+'|'+value(x.season),x]));
 const all=[...map.values()].map(p=>({...p,avg:p.starts?p.points/p.starts:0,
   years:[...p.yrs].sort((a,b)=>a-b),teams:[...p.teams],seasons:[...p.bySeason.values()].sort((a,b)=>a.year-b.year),
   weeks:p.weeks.sort((a,b)=>b.pts-a.pts||a.year-b.year||a.week-b.week)}));
 const bestByYear=new Map();
 for(const p of all)for(const s of p.seasons){
  // Match the two-decimal All-Time Combined figure from the player archive.
  // Guard against a stale mismatch between the game log and season snapshot.
  const source=official.get(p.id+'|'+s.year);
  s.ppg=source&&value(source.starts)===s.starts&&Math.abs(value(source.total_points)-s.points)<0.02
   ? value(source.average_points):Number((s.points/s.starts).toFixed(2));
  const key=s.year+'|'+p.position,old=bestByYear.get(key);
  if(!old||s.points>old.points)bestByYear.set(key,{id:p.id,points:s.points});
 }
 for(const p of all){
  p.crowns=p.seasons.filter(s=>bestByYear.get(s.year+'|'+p.position)?.id===p.id).map(s=>s.year);
  p.bestSeason=p.seasons.slice().sort((a,b)=>b.points-a.points)[0]||null;
  p.recordSeason=all.filter(q=>q.position===p.position).every(q=>q.id===p.id||q.seasons.every(s=>s.points<=p.bestSeason?.points));
 }
 return {all,byId:new Map(all.map(p=>[p.id,p]))};
}
function verifyPlayer(p){
 // A frozen editorial decision grants induction. The historical log supplies
 // evidence for the plaque but never imposes career PPG or lineup-start gates.
 return {ok:!!p,criteria:'Historical induction: excellence across individual seasons, positional distinction, defining peak and sustained impact. No career PPG, career-total or FIG lineup-start threshold.'};
}
function verifySeason(s,fin){
 const qualifies=!!s&&fin.some(f=>f.year===s.year&&f.champion===s.id)&&s.points>=3000&&s.ppg>=210&&s.allPlay>=85&&s.highs>=6;
 return {ok:qualifies,criteria:'League title · 3,000+ regular-season points · 210+ PPG · 85%+ all-play · six weekly scoring titles'};
}
/* Franchise legacy leaderboards and historic-feat pages were retired.
   The FIG Hall contains only inducted players and their individual exhibits. */
function model(d){
 const complete=completedYears(d),foundingYears=complete.filter(y=>y<=FOUNDING_END);
 const classes=INDUCTION_CLASSES.map(cls=>{
  const era=cls.year===FOUNDING_CLASS_YEAR?foundingYears:complete.filter(y=>y<cls.year);
  const byId=playerCareers(d,era).byId;
  return {...cls,entries:cls.entries.map(e=>{
   const career=byId.get(e.id),proof=verifyPlayer(career);
   return {...e,career,proof,name:career?.name||'Unavailable player',
    url:'#/hall-of-fame/inductee/player/'+slug(e.id)};
  })};
 });
 const inductees=classes.flatMap(c=>c.entries.filter(e=>e.proof.ok).map(e=>({...e,inductionYear:c.year})));
 const enshrinedSeasons=ENSHRINED_SEASONS.map(e=>{
  const record=(d.teamSeasonMaster||[]).find(x=>value(x.season)===e.year&&value(x.franchise_id)===e.franchiseId&&
   (x.season_complete===true||x.season_complete==='true'));
  const championship=(d.games||[]).find(x=>value(x.season)===e.year&&
   x.game_type==='Playoffs'&&value(x.playoff_round)===3&&value(x.matchup_id)===1&&
   value(x.winner_franchise_id)===e.franchiseId);
  return record?{...e,record,championship,playoff:seasonPlayoffResult(d,e.year,e.franchiseId),
   honors:seasonHonors(d,e.year,e.franchiseId),topGames:seasonTopScoringGames(d,e.year,e.franchiseId),
   url:'#/hall-of-fame/inductee/season/'+e.franchiseId+'/'+e.year}:null;
 }).filter(Boolean);
 return {complete,foundingYears,classes,inductees,enshrinedSeasons};
}
const personPhoto=id=>'<span class="fig-hof-v2-owner"><img loading="lazy" src="assets/avatars/'+esc(PORTRAITS[id]||'')+'" alt="" onerror="this.remove()"><i>'+esc(name(id)[0])+'</i></span>';
const playerPhoto=p=>'<span class="fig-hof-v2-nfl"><img loading="lazy" referrerpolicy="no-referrer" src="https://sleepercdn.com/content/nfl/players/thumb/'+slug(p.id)+'.jpg" alt="" onerror="this.remove()"><i>'+esc(p.position)+'</i></span>';
const logo=()=>'<span class="fig-hof-seal">FIG <span>HALL OF FAME</span></span>';
const head=()=>'<header class="fig-hof-site-head">'+logo()+'<span>EST. 2026 <b>·</b> BUILT FOR THE AGES</span></header>';
const heading=(n,t,s)=>'<div class="fig-hof-section-head"><div class="fig-hof-eyebrow">'+n+'</div><h2>'+t+'</h2><p>'+s+'</p></div>';
const metric=(value,label)=>'<div class="fig-hof-number"><strong>'+value+'</strong><span>'+label+'</span></div>';
function hcard(e){
 const p=e.career,peak=p.seasons.filter(x=>x.starts>=5).slice().sort((a,b)=>b.ppg-a.ppg)[0]||p.bestSeason;
 return '<a class="fig-hof-v2-inductee fig-hof-242-card" href="'+e.url+'">'+
 '<div class="fig-hof-v2-inductee-top"><span>FOUNDING CLASS · '+e.inductionYear+'</span><span>'+esc(e.nickname||p.position+' · LEGEND')+'</span></div>'+
 '<div class="fig-hof-v2-inductee-art fig-hof-242-portrait">'+playerPhoto(p)+'</div>'+
 '<div class="fig-hof-v2-inductee-info"><span class="fig-hof-v2-serial">PERMANENTLY ENSHRINED</span><h3>'+esc(e.name)+'</h3>'+
 '<p>'+esc(e.case)+'</p><div class="fig-hof-v2-cardfoot"><span>'+(
 peak?'SIGNATURE SEASON '+peak.year+' · '+fmt(peak.ppg,2)+' COMBINED PPG':'INDUCTED 2026')+
 '</span><b>OPEN EXHIBIT ↗</b></div></div></a>';
}
/* Rank every positive season honor against completed seasons only. */
const HALL_BOMBS=[['20 BOMBS','b20'],['30 BOMBS','b30'],['40 BOMBS','b40'],['50 BOMBS','b50']];
function hallSeasonBombRows(d,complete){
 const board=new Map();
 for(const t of d.teamSeasonMaster||[])if(complete.has(String(t.season)))
  board.set(String(t.season)+'|'+String(t.franchise_id),{season:value(t.season),franchise_id:value(t.franchise_id),b20:0,b30:0,b40:0,b50:0});
 for(const x of d.playerLog||[]){
  if(x.game_type!=='Regular Season'||!complete.has(String(x.season)))continue;
  const row=board.get(String(x.season)+'|'+String(x.franchise_id)),p=Number(x.starter_points);
  if(!row||!Number.isFinite(p))continue;
  if(p>=50)row.b50++;else if(p>=40)row.b40++;else if(p>=30)row.b30++;else if(p>=20)row.b20++;
 }
 const out=[];
 for(const row of board.values())for(const [record_category,metric] of HALL_BOMBS)
  out.push({record_category,metric,season:row.season,franchise_id:row.franchise_id,value:row[metric]});
 return out;
}
function seasonHonors(d,season,franchiseId){
 const complete=new Set((d.teamSeasonMaster||[]).filter(x=>x.season_complete===true||String(x.season_complete).toLowerCase()==='true').map(x=>String(x.season)));
 const raw=[...(d.singleSeasonRecords||[]),...hallSeasonBombRows(d,complete)]
  .filter(x=>complete.has(String(x.season))&&Number.isFinite(Number(x.value))&&value(x.value)>0&&
   !['5 BOMBS'].includes(String(x.record_category))&&
   !/^(100|125|150|180|190)\+ Point Games$/.test(String(x.record_category)));
 const groups=new Map();for(const x of raw){const cat=String(x.record_category||'');if(!cat)continue;if(!groups.has(cat))groups.set(cat,[]);groups.get(cat).push(x);}
 const records=[];
 for(const [category,rows] of groups){
  rows.sort((a,b)=>value(b.value)-value(a.value)||value(b.season)-value(a.season)||value(a.franchise_id)-value(b.franchise_id));
  let last=null,rank=0;
  rows.forEach((r,i)=>{
   const v=value(r.value);if(last===null||Math.abs(last-v)>0.000001)rank=i+1;last=v;
   if(value(r.season)!==season||value(r.franchise_id)!==franchiseId)return;
   records.push({category,rank,metric:String(r.metric||''),value:v,
    tied:rows.some(other=>other!==r&&Math.abs(value(other.value)-v)<0.000001)});
  });
 }
 return {records:records.sort((a,b)=>a.rank-b.rank||a.category.localeCompare(b.category))};
}
function displayRecordValue(r){
 if(r.metric==='all_play_win_pct'||r.metric==='win_pct')return fmt(r.value,2)+'%';
 if(/^(games_\d+|b\d+)$/.test(r.metric)||r.metric==='weekly_high_scores'||r.metric==='weekly_top_3_finishes'||r.metric==='wins'||r.metric==='losses')
  return fmt(r.value);
 return fmt(r.value,2);
}
function seasonHonorsSections(e){
 const cards=e.honors.records.map(r=>{
  const measure=/^games_[0-9]+$/.test(r.metric)?'QUALIFYING GAMES':/^b[0-9]+$/.test(r.metric)?'STARTER PERFORMANCES':
   r.metric==='highest_weekly_score'?'SINGLE-GAME HIGH':r.metric==='points_for'?'REGULAR-SEASON POINTS':'SEASON MARK';
  return '<a class="fig-hof-244-honor fig-hof-244-record" href="#/breakdown/season/'+slug(r.category)+'/'+e.franchiseId+'/'+e.year+'">'+
   '<div class="fig-hof-244-honor-top"><span>'+e.year+' SEASON RECORD</span><b>'+(r.tied?'TIED ':'')+'#'+r.rank+' ALL TIME</b></div>'+
   '<div class="fig-hof-244-honor-main"><h3>'+esc(r.category)+'</h3>'+
   '<div class="fig-hof-244-honor-measure"><strong>'+displayRecordValue(r)+'</strong><span>'+measure+'</span></div></div>'+
   '<div class="fig-hof-244-honor-foot"><span>VIEW HISTORICAL BREAKDOWN</span><span aria-hidden="true">↗</span></div></a>';
 }).join('');
 return heading('III / THE HISTORICAL RECORD','All-time season records.','Every single-season category from this year, including finishes outside the top three, ranked across completed franchise seasons.')+
  '<div class="fig-hof-244-record-grid">'+cards+'</div>';
}
/* Game rankings include completed regular-season and playoff box scores, including active seasons. */
function seasonTopScoringGames(d,year,franchiseId){
 const games=(d.games||[]).filter(g=>g.game_type==='Regular Season'||g.game_type==='Playoffs');
 const scores=[];
 for(const g of games)for(const side of [1,2]){
  const score=Number(g['score_'+side]);
  if(Number.isFinite(score)&&score>0)scores.push({year:value(g.season),week:value(g.week),matchupId:value(g.matchup_id),
   id:value(g['franchise_'+side]),points:score,playoffs:g.game_type==='Playoffs'});
 }
 scores.sort((a,b)=>b.points-a.points||a.year-b.year||a.week-b.week||a.id-b.id);
 let last=null,rank=0;
 return scores.map((g,i)=>{if(last===null||Math.abs(g.points-last)>.000001)rank=i+1;last=g.points;return {...g,rank};})
  .filter(g=>g.rank<=25&&g.year===year&&g.id===franchiseId);
}
function seasonPlayoffResult(d,year,franchiseId){
 const games=(d.games||[]).filter(g=>value(g.season)===year&&g.game_type==='Playoffs'&&
  (value(g.franchise_1)===franchiseId||value(g.franchise_2)===franchiseId))
  .sort((a,b)=>value(a.playoff_round)-value(b.playoff_round)||value(a.week)-value(b.week));
 const last=games[games.length-1];
 if(!last)return {label:'No playoff appearance',summary:'Missed the playoffs',game:null};
 const round=value(last.playoff_round),won=value(last.winner_franchise_id)===franchiseId;
 const label=round===3?(won?'FIG Champion':'FIG Runner-up'):
  round===2?(won?'Won the semifinal':'Semifinalist'):
  round===1?(won?'Won the first round':'First-round playoff finish'):'Playoff participant';
 const summary=round===3?(won?'Won the FIG championship':'Reached the FIG championship'):
  round===2?'Reached the semifinals':round===1?'Reached the first round':'Reached the playoffs';
 return {label,summary,game:last};
}
function notableSeasonRecords(e){return e.honors.records.filter(r=>r.rank<=3&&r.category!=='Losses');}
function topGameSummary(e){
 const games=e.topGames||[];
 if(!games.length)return '';
 return games.length+' top-25 all-time scoring game'+(games.length===1?'':'s')+': '+
  games.map(g=>'Week '+g.week+' ('+fmt(g.points,2)+' pts, #'+g.rank+')').join(', ');
}
function seasonRecap(e){
 return e.playoff.summary+'.'+(e.topGames.length?' '+topGameSummary(e)+'.':'');
}
function seasonNotableTags(e){
 const records=notableSeasonRecords(e);
 return '<div class="fig-hof-247-notable"><span>NOTABLE SINGLE-SEASON RECORDS</span>'+
  '<div class="fig-hof-247-notable-tags">'+records.map(r=>
   '<span>'+esc(r.category)+' <b>'+displayRecordValue(r)+' · '+(r.tied?'T-':'')+'#'+r.rank+'</b></span>').join('')+
  '</div></div>';
}
function immortalSeasonCard(m){
 const e=m.enshrinedSeasons[0];
 if(!e)return '';
 const r=e.record;
 return '<section class="fig-hof-243-season-section" aria-labelledby="hofImmortalSeasonTitle">'+
 '<div class="fig-hof-243-season-heading"><span class="fig-hof-eyebrow">II / IMMORTAL SEASONS</span>'+
 '<h2 id="hofImmortalSeasonTitle">Enshrined Season</h2><p>Some years become a permanent part of FIG history.</p></div>'+
 '<a class="fig-hof-243-season-card" href="'+e.url+'">'+
 '<div class="fig-hof-243-season-card-art" aria-hidden="true">'+
 '<div class="fig-hof-243-season-monogram">H</div><span>IMMORTAL SEASON</span></div>'+
 '<div class="fig-hof-243-season-card-copy"><span class="fig-hof-eyebrow">CLASS OF '+e.inductionYear+' · '+esc(e.playoff.label)+'</span>'+
 '<h3>'+esc(e.title)+'</h3><p>'+esc(seasonRecap(e))+'</p>'+seasonNotableTags(e)+
 '<div class="fig-hof-243-season-card-metrics"><span><strong>'+fmt(r.points_for,2)+'</strong> REGULAR-SEASON POINTS</span>'+
 '<span><strong>'+fmt(r.all_play_win_pct,2)+'%</strong> ALL-PLAY</span>'+
 '<span><strong>'+fmt(r.weekly_high_scores)+'</strong> LEAGUE-HIGH WEEKS</span>'+
 '<span><strong>'+fmt(notableSeasonRecords(e).length)+'</strong> TOP-THREE MARKS</span></div>'+
 '<b class="fig-hof-243-season-action">VIEW SEASON EXHIBIT ↗</b></div></a></section>';
}
function immortalSeasonPlaque(m,franchiseId,season){
 const e=m.enshrinedSeasons.find(x=>x.franchiseId===Number(franchiseId)&&x.year===Number(season));
 if(!e)return '<section class="fig-hof-content"><a class="fig-hof-v2-back" href="#/hall-of-fame">← RETURN TO THE HALL</a><p>This franchise season is not enshrined.</p></section>';
 const r=e.record,g=e.playoff.game;
 const gameHref=g?'#/game/'+e.year+'/'+g.week+'/'+g.matchup_id:null;
 return '<section class="fig-hof-content fig-hof-242-profile fig-hof-243-season-profile">'+
 '<a class="fig-hof-v2-back" href="#/hall-of-fame">← RETURN TO THE HALL</a>'+
 '<div class="fig-hof-243-season-profile-hero"><div class="fig-hof-243-season-profile-mark">'+esc(name(e.franchiseId)[0])+'<span>'+e.year+'</span></div>'+
 '<div><span class="fig-hof-eyebrow">IMMORTAL SEASON · CLASS OF '+e.inductionYear+'</span>'+
 '<h1>'+esc(e.title)+'</h1><p>'+esc(seasonRecap(e))+'</p>'+seasonNotableTags(e)+
 '<div class="fig-hof-243-season-profile-actions"><a class="fig-hof-gold-btn" href="#/teamseason/'+e.franchiseId+'/'+e.year+'">FULL TEAM SEASON ↗</a>'+
 (gameHref?'<a class="fig-hof-text-btn" href="'+gameHref+'">'+esc(e.playoff.label.toUpperCase())+' BOX SCORE ↗</a>':'')+'</div></div></div>'+
 '<div class="fig-hof-v2-plaque-metrics">'+
 metric(fmt(r.points_for,2),'REGULAR-SEASON POINTS')+
 metric(fmt(r.points_per_game,1),'POINTS PER GAME')+
 metric(fmt(r.all_play_win_pct,2)+'%','ALL-PLAY WIN RATE')+
 metric(fmt(r.weekly_high_scores),'WEEKLY HIGH SCORES')+'</div>'+
 '<div class="fig-hof-243-season-proof">'+
 '<a href="#/teamseason/'+e.franchiseId+'/'+e.year+'"><span>THE FULL '+e.year+' SEASON</span><strong>EXAMINE THE RECORD ↗</strong></a>'+
 (gameHref?'<a href="'+gameHref+'"><span>WEEK '+g.week+' · '+esc(e.playoff.label.toUpperCase())+'</span><strong>VIEW PLAYOFF GAME ↗</strong></a>':'')+'</div>'+
 (e.topGames.length?'<div class="fig-hof-247-game-section"><div class="fig-hof-247-game-head"><span class="fig-hof-eyebrow">ALL-TIME WEEKLY SCORING</span><h2>Top-25 scoring games</h2><p>All FIG regular-season and playoff games, including completed weeks of the current season.</p></div><div class="fig-hof-247-game-grid">'+e.topGames.map(x=>
 '<a href="#/game/'+x.year+'/'+x.week+'/'+x.matchupId+'"><span>#'+x.rank+' ALL TIME</span><strong>'+fmt(x.points,2)+'</strong><small>'+x.year+' · WEEK '+x.week+(x.playoffs?' · PLAYOFFS':'')+'</small><b>VIEW BOX SCORE ↗</b></a>').join('')+'</div></div>':'')+
 seasonHonorsSections(e)+'</section>';
}
function lobby(m){
 const members=m.inductees;
 return '<section class="fig-hof-hero fig-hof-v2-hero fig-hof-242-hero"><div class="fig-hof-hero-stars" aria-hidden="true">✦ &nbsp; ✦ &nbsp; ✦</div>'+
 '<div class="fig-hof-hero-text"><span class="fig-hof-kicker">THE FIG HALL OF FAME · EST. 2026</span><h1>The<br><em>Immortals.</em></h1></div>'+
 '<div class="fig-hof-hero-emblem"><div class="fig-hof-emblem-halo"></div><div class="fig-hof-v2-crest">✦<span>F · I · G</span><strong>MMXXVI</strong></div></div>'+
 '</section>'+
 '<section class="fig-hof-content fig-hof-242-main">'+
 heading('I / THE FOUNDING CLASS','The Enshrined','Two names at the beginning of FIG immortality. Josh Allen, the statistical standard. Puka Nacua, The Logo.')+
 '<div class="fig-hof-v2-founders fig-hof-242-grid">'+members.map(hcard).join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>PERMANENT CLASS OF 2026 · HISTORICAL PERIOD 2023–2025</span></div>'+
 immortalSeasonCard(m)+
 '<div class="fig-hof-v2-next-class"><span class="fig-hof-eyebrow">III / THE FUTURE OF THE HALL</span><h3>Built for the next twenty years.</h3>'+
 '<p>The legends of tomorrow will write the next chapter of FIG history.</p></div>'+
 '</section>';
}
function hall(m){return lobby(m);}
/* Removed Historic Feats and Legacy Points: old links lead back to the Hall. */
function plaque(m,kind,id,year,d){
 const e=m.inductees.find(x=>x.kind==='player'&&x.id===id);
 if(!e)return'<section class="fig-hof-content"><a href="#/hall-of-fame">← BACK TO THE HALL</a><p>This exhibit is not part of the 2026 founding class.</p></section>';
 const p=e.career,eligible=p.seasons.filter(x=>x.starts>0);
 const ranked=eligible.slice().sort((a,b)=>b.ppg-a.ppg),peak=ranked[0];
 const lines=[
  ['BEST COMBINED SEASON · '+peak.year,fmt(peak.ppg,2)+' PPG'],
  ['COMBINED CAREER PPG',fmt(p.avg,2)],
  ['VERIFIED FIG STARTS',fmt(p.starts)],
  ['COMBINED STARTER POINTS',fmt(p.points,2)]
 ];
 const performances=p.weeks.slice(0,6).map(w=>{
  const g=(d.games||[]).find(x=>+x.season===w.year&&+x.week===w.week&&
   (value(x.franchise_1)===w.team||value(x.franchise_2)===w.team));
  return '<a href="'+(g?'#/game/'+w.year+'/'+w.week+'/'+g.matchup_id:'#/teamseason/'+w.team+'/'+w.year)+'">'+
   '<b>'+w.year+' · WK '+w.week+'</b><span>'+name(w.team)+'</span><span>'+fmt(w.pts,2)+' POINTS</span><strong>OPEN ↗</strong></a>';
 }).join('');
 const seasonLines=eligible.map(s=>'<div class="fig-hof-242-season-row">'+
 '<div><small>SEASON</small><strong>'+s.year+'</strong></div>'+
 '<div><small>REG + PLAYOFF STARTS</small><strong>'+s.starts+'</strong></div>'+
 '<div><small>COMBINED PPG</small><strong>'+fmt(s.ppg,2)+'</strong></div>'+
 '<div><small>COMBINED POINTS</small><strong>'+fmt(s.points,2)+'</strong></div></div>').join('');
 return '<section class="fig-hof-content fig-hof-242-profile">'+
 '<a class="fig-hof-v2-back" href="#/hall-of-fame">← RETURN TO THE HALL</a>'+
 '<div class="fig-hof-v2-plaque fig-hof-242-plaque"><div class="fig-hof-v2-plaque-art">'+playerPhoto(p)+'</div>'+
 '<div class="fig-hof-v2-plaque-copy"><span class="fig-hof-eyebrow">'+(e.nickname?esc(e.nickname)+' · ':'')+'INAUGURAL INDUCTEE · '+esc(p.position)+' · CLASS OF '+e.inductionYear+'</span>'+
 '<h1>'+esc(p.name)+'</h1><p>'+esc(e.case)+'</p>'+
 '<a class="fig-hof-gold-btn" href="#/player/'+slug(p.id)+'">EXPLORE THE FIG PLAYER ARCHIVE ↗</a></div></div>'+
 '<div class="fig-hof-v2-plaque-metrics">'+lines.map(k=>metric(k[1],k[0])).join('')+'</div>'+
 heading('THE SEASONS THAT DEFINED HIM','The career, season by season.','All-Time Combined scoring for each completed founding season, including regular-season and playoff FIG starts.')+
 '<div class="fig-hof-242-season-ledger">'+seasonLines+'</div>'+
 heading('THE PERFORMANCES','Signature FIG starts.','Six of the highest verified performances in the historical FIG starting lineup, with original box-score links.')+
 '<div class="fig-hof-v2-receipts fig-hof-242-receipts">'+performances+'</div>'+
 '<p class="fig-hof-242-data-note"><strong>STATISTICAL SCOPE · ALL-TIME COMBINED</strong> Every PPG and point total above includes verified regular-season and playoff FIG starting-lineup appearances from completed 2023–2025 seasons. Bench performances are not included. These statistics illustrate a career but do not determine induction eligibility.</p>'+
 '<div class="fig-hof-242-next"><a href="#/hall-of-fame/inductee/player/'+m.inductees[(m.inductees.indexOf(e)+1)%m.inductees.length].id+'">NEXT EXHIBIT · '+esc(m.inductees[(m.inductees.indexOf(e)+1)%m.inductees.length].name)+' ↗</a></div>'+
 '</section>';
}
const footer=()=>'<footer class="fig-hof-footer"><div>'+logo()+'<p>THE STANDARD ENDURES.<br>THE RECORD REMEMBERS.</p></div><div>'+
 '<a href="#/hall-of-fame">THE ENSHRINED ↗</a>'+
 '<a href="#/more">BACK TO FIG ↗</a></div><span>FROMM IS GARBAGE · THE FIG HISTORICAL INSTITUTION</span></footer>';
async function page(ctx,view,arg,sub,year){
 await ctx.load(['league','games','playerLog','playerSeasons','teamSeasonMaster','singleSeasonRecords']);
 const m=model(ctx.DATA);
 const isPlayer=(view==='inductee'&&arg==='player')||view==='player';
 const isSeason=view==='inductee'&&arg==='season';
 const id=view==='player'?String(arg||''):String(sub||'');
 const content=isPlayer?plaque(m,'player',id,year,ctx.DATA):
  isSeason?immortalSeasonPlaque(m,sub,year):lobby(m);
 ctx.app.innerHTML='<div class="fig-hof fig-hof-v2 fig-hof-242 fig-hof-243" id="figHallOfFame">'+
  head()+content+footer()+'</div>';
 document.title='The Hall – Fromm is Garbage';
}
window.figHallOfFame=page;
window.figHallOfFameModel={model,playerCareers,verifyPlayer,verifySeason,completedYears,INDUCTION_CLASSES,seasonHonors,displayRecordValue};
})();