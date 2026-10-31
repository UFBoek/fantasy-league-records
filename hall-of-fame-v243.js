/* FIG Hall of Fame / Charter II — fixed, evidence-backed induction classes.
   Franchises earn legacy points, but are never automatically enshrined. */
(function(){
'use strict';
const CHARTER_YEAR=2026,FOUNDING_END=2025,POSITIONS=['QB','RB','WR','TE'];
const OWNERS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
const PORTRAITS={1:'boek.webp',2:'fru.webp',3:'fromm.webp',4:'sack.webp',5:'leyton.webp',6:'hayden-2026.svg',7:'line.webp',8:'winston.webp',9:'camnol.webp',10:'james.webp'};
/* Curated historical inductees. Future classes require an explicit induction
   decision and evidence review, never a top-N query or an annual quota. */
/* Inaugural induction is an explicit decision, not automatic scoring. */
const ENSHRINED_SEASONS=[{year:2025,franchiseId:6,inductionYear:2026,
 title:'Hayden · 2025',honor:'A season beyond the ordinary',
 case:'A historic regular season followed by the league championship. Hayden crossed 3,000 points, posted seven weekly league-high totals, and finished with an 88.10% all-play win rate — a level of excellence sustained across an entire season.'}];
const INDUCTION_CLASSES=[{year:2026,title:'The Founding Four',period:'2023–2025',entries:[
 {kind:'player',id:'4984',position:'QB',case:'The quarterback standard of the founding era: three consecutive elite seasons, extraordinary consistency and top-of-position production.'},
 {kind:'player',id:'9221',position:'RB',case:'An unmistakable ascent, from an impressive 2023 season to two outstanding years in 2024–2025, including an extraordinary 2025 peak.'},
 {kind:'player',id:'9493',position:'WR',case:'A founding-era difference maker with meaningful production in every completed season and an exceptional 2025 peak.'},
 {kind:'player',id:'8130',position:'TE',case:'A two-season positional emergence culminating in a historic 2025 tight-end season and uncommon separation at the position.'}
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
 const accepted=new Set(years),map=new Map();
 for(const x of d.playerLog||[]){
  const year=value(x.season),position=String(x.position||'').toUpperCase(),id=String(x.player_id||'');
  if(!accepted.has(year)||!POSITIONS.includes(position)||!id)continue;
  let p=map.get(id);
  if(!p){p={id,position,name:String(x.player_name||'Unnamed'),points:0,starts:0,high:0,p20:0,p30:0,yrs:new Set(),teams:new Set(),weeks:[],bySeason:new Map()};map.set(id,p);}
  const pts=value(x.starter_points);
  p.points+=pts;p.starts++;p.high=Math.max(p.high,pts);p.p20+=Number(pts>=20);p.p30+=Number(pts>=30);
  p.yrs.add(year);p.teams.add(value(x.franchise_id));
  p.weeks.push({year,week:value(x.week),team:value(x.franchise_id),pts});
  const s=p.bySeason.get(year)||{year,points:0,starts:0,high:0};s.points+=pts;s.starts++;s.high=Math.max(s.high,pts);p.bySeason.set(year,s);
 }
 const all=[...map.values()].map(p=>({...p,avg:p.starts?p.points/p.starts:0,
   years:[...p.yrs].sort((a,b)=>a-b),teams:[...p.teams],seasons:[...p.bySeason.values()].sort((a,b)=>a.year-b.year),
   weeks:p.weeks.sort((a,b)=>b.pts-a.pts||a.year-b.year||a.week-b.week)}));
 const bestByYear=new Map();
 for(const p of all)for(const s of p.seasons){
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
  const era=cls.year===CHARTER_YEAR?foundingYears:complete.filter(y=>y<cls.year);
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
  return record&&championship?{...e,record,championship,url:'#/hall-of-fame/inductee/season/'+e.franchiseId+'/'+e.year}:null;
 }).filter(Boolean);
 return {complete,foundingYears,classes,inductees,enshrinedSeasons};
}
const personPhoto=id=>'<span class="fig-hof-v2-owner"><img loading="lazy" src="assets/avatars/'+esc(PORTRAITS[id]||'')+'" alt="" onerror="this.remove()"><i>'+esc(name(id)[0])+'</i></span>';
const playerPhoto=p=>'<span class="fig-hof-v2-nfl"><img loading="lazy" referrerpolicy="no-referrer" src="https://sleepercdn.com/content/nfl/players/thumb/'+slug(p.id)+'.jpg" alt="" onerror="this.remove()"><i>'+esc(p.position)+'</i></span>';
const logo=()=>'<span class="fig-hof-seal">FIG <span>HALL OF FAME</span></span>';
const navigation=route=>'<nav class="fig-hof-nav" aria-label="Hall of Fame navigation">'+[
 ['overview','The Hall'],['charter','Induction Philosophy']
 ].map(([id,label])=>'<a href="#/hall-of-fame'+(id==='overview'?'':'/'+id)+'" '+(route===id?'aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav>';
const head=kind=>'<header class="fig-hof-site-head">'+logo()+'<span>EST. 2026 <b>·</b> BUILT FOR THE AGES</span></header>'+navigation(kind);
const heading=(n,t,s)=>'<div class="fig-hof-section-head"><div class="fig-hof-eyebrow">'+n+'</div><h2>'+t+'</h2><p>'+s+'</p></div>';
const metric=(value,label)=>'<div class="fig-hof-number"><strong>'+value+'</strong><span>'+label+'</span></div>';
function hcard(e){
 const p=e.career,peak=p.seasons.filter(x=>x.starts>=5).slice().sort((a,b)=>b.points/b.starts-a.points/a.starts)[0]||p.bestSeason;
 return '<a class="fig-hof-v2-inductee fig-hof-242-card" href="'+e.url+'">'+
 '<div class="fig-hof-v2-inductee-top"><span>FOUNDING CLASS · '+e.inductionYear+'</span><span>'+esc(p.position)+' · LEGEND</span></div>'+
 '<div class="fig-hof-v2-inductee-art fig-hof-242-portrait">'+playerPhoto(p)+'</div>'+
 '<div class="fig-hof-v2-inductee-info"><span class="fig-hof-v2-serial">PERMANENTLY ENSHRINED</span><h3>'+esc(e.name)+'</h3>'+
 '<p>'+esc(e.case)+'</p><div class="fig-hof-v2-cardfoot"><span>'+(
 peak?'SIGNATURE SEASON '+peak.year+' · '+fmt(peak.points/peak.starts,1)+' PTS / FIG START':'INDUCTED 2026')+
 '</span><b>OPEN EXHIBIT ↗</b></div></div></a>';
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
 '<div class="fig-hof-243-season-card-copy"><span class="fig-hof-eyebrow">CLASS OF '+e.inductionYear+' · FIG CHAMPION</span>'+
 '<h3>'+esc(e.title)+'</h3><p>'+esc(e.case)+'</p>'+
 '<div class="fig-hof-243-season-card-metrics"><span><strong>'+fmt(r.points_for,2)+'</strong> REGULAR-SEASON POINTS</span>'+
 '<span><strong>'+fmt(r.all_play_win_pct,2)+'%</strong> ALL-PLAY</span>'+
 '<span><strong>'+fmt(r.weekly_high_scores)+'</strong> LEAGUE-HIGH WEEKS</span></div>'+
 '<b class="fig-hof-243-season-action">VIEW SEASON EXHIBIT ↗</b></div></a></section>';
}
function immortalSeasonPlaque(m,franchiseId,season){
 const e=m.enshrinedSeasons.find(x=>x.franchiseId===Number(franchiseId)&&x.year===Number(season));
 if(!e)return '<section class="fig-hof-content"><a class="fig-hof-v2-back" href="#/hall-of-fame">← RETURN TO THE HALL</a><p>This franchise season is not enshrined.</p></section>';
 const r=e.record,g=e.championship;
 return '<section class="fig-hof-content fig-hof-242-profile fig-hof-243-season-profile">'+
 '<a class="fig-hof-v2-back" href="#/hall-of-fame">← RETURN TO THE HALL</a>'+
 '<div class="fig-hof-243-season-profile-hero"><div class="fig-hof-243-season-profile-mark">H<span>MMXXV</span></div>'+
 '<div><span class="fig-hof-eyebrow">IMMORTAL SEASON · CLASS OF '+e.inductionYear+'</span>'+
 '<h1>'+esc(e.title)+'</h1><p>'+esc(e.case)+'</p>'+
 '<div class="fig-hof-243-season-profile-actions"><a class="fig-hof-gold-btn" href="#/teamseason/'+e.franchiseId+'/'+e.year+'">FULL TEAM SEASON ↗</a>'+
 '<a class="fig-hof-text-btn" href="#/game/'+e.year+'/'+g.week+'/'+g.matchup_id+'">CHAMPIONSHIP BOX SCORE ↗</a></div></div></div>'+
 '<div class="fig-hof-v2-plaque-metrics">'+
 metric(fmt(r.points_for,2),'REGULAR-SEASON POINTS')+
 metric(fmt(r.points_per_game,1),'POINTS PER GAME')+
 metric(fmt(r.all_play_win_pct,2)+'%','ALL-PLAY WIN RATE')+
 metric(fmt(r.weekly_high_scores),'WEEKLY HIGH SCORES')+'</div>'+
 heading('THE CASE FOR ENSHRINEMENT','A season that endured.','A dominant regular-season campaign and a championship finish, preserved together as a single historical accomplishment.')+
 '<div class="fig-hof-v2-standard"><strong>THE SEASON LEGACY</strong><p>'+esc(e.case)+'</p></div>'+
 '<div class="fig-hof-243-season-proof">'+
 '<a href="#/teamseason/'+e.franchiseId+'/'+e.year+'"><span>THE FULL 2025 SEASON</span><strong>EXAMINE THE RECORD ↗</strong></a>'+
 '<a href="#/game/'+e.year+'/'+g.week+'/'+g.matchup_id+'"><span>WEEK '+g.week+' · FIG CHAMPIONSHIP</span><strong>VIEW THE TITLE GAME ↗</strong></a></div></section>';
}
function lobby(m){
 const members=m.inductees;
 return '<section class="fig-hof-hero fig-hof-v2-hero fig-hof-242-hero"><div class="fig-hof-hero-stars" aria-hidden="true">✦ &nbsp; ✦ &nbsp; ✦</div>'+
 '<div class="fig-hof-hero-text"><span class="fig-hof-kicker">THE FIG HALL OF FAME · EST. 2026</span><h1>The<br><em>Immortals.</em></h1></div>'+
 '<div class="fig-hof-hero-emblem"><div class="fig-hof-emblem-halo"></div><div class="fig-hof-v2-crest">✦<span>F · I · G</span><strong>MMXXVI</strong></div></div>'+
 '</section>'+
 '<section class="fig-hof-content fig-hof-242-main">'+
 heading('I / THE FOUNDING CLASS','The Enshrined','Each inductee has his own case for greatness. These four were chosen deliberately, not by a career-average formula or a predetermined scoring threshold.')+
 '<div class="fig-hof-v2-founders fig-hof-242-grid">'+members.map(hcard).join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>PERMANENT CLASS OF 2026 · HISTORICAL PERIOD 2023–2025</span><a href="#/hall-of-fame/charter">HOW WE SELECT THE HALL ↗</a></div>'+
 immortalSeasonCard(m)+
 '<div class="fig-hof-v2-next-class"><span class="fig-hof-eyebrow">III / THE FUTURE OF THE HALL</span><h3>Built for the next twenty years.</h3>'+
 '<p>New classes require explicit historical review. No automatic induction and no annual quota. The Hall will continue to honor exceptional player careers and the rarest individual franchise seasons.</p></div>'+
 '</section>';
}
function hall(m){return lobby(m);}
/* Removed Historic Feats and Legacy Points: old links lead back to the Hall. */
function plaque(m,kind,id,year,d){
 const e=m.inductees.find(x=>x.kind==='player'&&x.id===id);
 if(!e)return'<section class="fig-hof-content"><a href="#/hall-of-fame">← BACK TO THE HALL</a><p>This exhibit is not part of the 2026 founding class.</p></section>';
 const p=e.career,eligible=p.seasons.filter(x=>x.starts>0);
 const ranked=eligible.slice().sort((a,b)=>b.points/b.starts-a.points/a.starts),peak=ranked[0];
 const lines=[
  ['BEST SEASON · '+peak.year,fmt(peak.points/peak.starts,1)+' PTS / START'],
  ['HISTORICAL SEASONS',fmt(eligible.length)],
  ['VERIFIED FIG STARTS',fmt(p.starts)],
  ['STARTER POINTS',fmt(p.points,1)]
 ];
 const performances=p.weeks.slice(0,6).map(w=>{
  const g=(d.games||[]).find(x=>+x.season===w.year&&+x.week===w.week&&
   (value(x.franchise_1)===w.team||value(x.franchise_2)===w.team));
  return '<a href="'+(g?'#/game/'+w.year+'/'+w.week+'/'+g.matchup_id:'#/teamseason/'+w.team+'/'+w.year)+'">'+
   '<b>'+w.year+' · WK '+w.week+'</b><span>'+name(w.team)+'</span><span>'+fmt(w.pts,2)+' POINTS</span><strong>OPEN ↗</strong></a>';
 }).join('');
 const seasonLines=eligible.map(s=>'<div class="fig-hof-242-season-row">'+
 '<div><small>SEASON</small><strong>'+s.year+'</strong></div>'+
 '<div><small>VERIFIED FIG STARTS</small><strong>'+s.starts+'</strong></div>'+
 '<div><small>STARTER PPG</small><strong>'+fmt(s.points/s.starts,1)+'</strong></div>'+
 '<div><small>STARTER POINTS</small><strong>'+fmt(s.points,1)+'</strong></div></div>').join('');
 return '<section class="fig-hof-content fig-hof-242-profile">'+
 '<a class="fig-hof-v2-back" href="#/hall-of-fame">← RETURN TO THE HALL</a>'+
 '<div class="fig-hof-v2-plaque fig-hof-242-plaque"><div class="fig-hof-v2-plaque-art">'+playerPhoto(p)+'</div>'+
 '<div class="fig-hof-v2-plaque-copy"><span class="fig-hof-eyebrow">INAUGURAL INDUCTEE · '+esc(p.position)+' · CLASS OF '+e.inductionYear+'</span>'+
 '<h1>'+esc(p.name)+'</h1><p>'+esc(e.case)+'</p>'+
 '<a class="fig-hof-gold-btn" href="#/player/'+slug(p.id)+'">EXPLORE THE FIG PLAYER ARCHIVE ↗</a></div></div>'+
 '<div class="fig-hof-v2-plaque-metrics">'+lines.map(k=>metric(k[1],k[0])).join('')+'</div>'+
 heading('THE CASE FOR GREATNESS','A Hall-worthy legacy.','The case rests on extraordinary individual seasons, positional dominance and historical impact—not an arbitrary threshold of cumulative points or career PPG.')+
 '<div class="fig-hof-v2-standard"><strong>THE INDUCTION CASE</strong><p>'+esc(e.case)+'</p>'+
 '<p>Each season is evaluated on its own merits. A player cannot lose Hall recognition simply by getting older or by being placed on a fantasy bench.</p></div>'+
 heading('THE SEASONS THAT DEFINED HIM','The career, season by season.','The completed founding era, broken into individual years so a remarkable peak is never diluted by later seasons.')+
 '<div class="fig-hof-242-season-ledger">'+seasonLines+'</div>'+
 heading('THE PERFORMANCES','Signature FIG starts.','Six of the highest verified performances in the historical FIG starting lineup, with original box-score links.')+
 '<div class="fig-hof-v2-receipts fig-hof-242-receipts">'+performances+'</div>'+
 '<p class="fig-hof-242-data-note"><strong>STATISTICAL SCOPE</strong> These verified figures cover FIG starting-lineup appearances in completed 2023–2025 seasons. They do not measure bench performances. Starts and starter PPG illustrate a career; neither determines induction eligibility. Future archival expansion will incorporate rostered bench-game output.</p>'+
 '<div class="fig-hof-242-next"><a href="#/hall-of-fame/inductee/player/'+m.inductees[(m.inductees.indexOf(e)+1)%m.inductees.length].id+'">NEXT EXHIBIT · '+esc(m.inductees[(m.inductees.indexOf(e)+1)%m.inductees.length].name)+' ↗</a></div>'+
 '</section>';
}
function charter(m){
 const rules=[
 ['01','EXCEPTIONAL SEASONS','A candidate is evaluated through individual seasons: elite production at his position, the distance from contemporaries and the significance of his best years. Decline near retirement does not erase earlier greatness.'],
 ['02','FANTASY LINEUPS ARE NOT AN ELIGIBILITY GATE','A deep FIG roster can bench an elite player. Official lineup starts and starter-only PPG do not determine a player’s eligibility. These stats are displayed as verified history while full rostered-game data is being integrated.'],
 ['03','MORE THAN ONE WAY TO BE GREAT','Multiple elite seasons are a powerful case. A genuinely generational single-season peak may also deserve consideration if its historical significance can be independently established.'],
 ['04','A DELIBERATE, PERMANENT DECISION','There is no automatic top-four selection, PPG cutoff, cumulative-points score or mandatory annual class. Each induction is individually reviewed, recorded and permanent.']
 ];
 return '<section class="fig-hof-content fig-hof-242-charter">'+
 heading('THE FIG INDUCTION PHILOSOPHY','Greatness, not arithmetic.','What makes an individual season extraordinary matters more than how many seasons a player managed to accumulate.')+
 '<div class="fig-hof-v2-charter">'+rules.map(([n,t,c])=>'<div class="fig-hof-v2-rule"><span>'+n+'</span><div><h3>'+t+'</h3><p>'+c+'</p></div></div>').join('')+'</div>'+
 '</section>';
}
const footer=()=>'<footer class="fig-hof-footer"><div>'+logo()+'<p>THE STANDARD ENDURES.<br>THE RECORD REMEMBERS.</p></div><div>'+
 '<a href="#/hall-of-fame/hall">THE ENSHRINED ↗</a><a href="#/hall-of-fame/charter">THE CHARTER ↗</a>'+
 '<a href="#/more">BACK TO FIG ↗</a></div><span>FROMM IS GARBAGE · THE FIG HISTORICAL INSTITUTION</span></footer>';
async function page(ctx,view,arg,sub,year){
 await ctx.load(['league','games','playerLog','teamSeasonMaster']);
 const m=model(ctx.DATA);
 const isPlayer=(view==='inductee'&&arg==='player')||view==='player';
 const isSeason=view==='inductee'&&arg==='season';
 const id=view==='player'?String(arg||''):String(sub||'');
 const isCharter=view==='charter';
 const content=isPlayer?plaque(m,'player',id,year,ctx.DATA):
  isSeason?immortalSeasonPlaque(m,sub,year):
  isCharter?charter(m):lobby(m);
 ctx.app.innerHTML='<div class="fig-hof fig-hof-v2 fig-hof-242 fig-hof-243" id="figHallOfFame">'+
  head(isCharter?'charter':'overview')+content+footer()+'</div>';
 document.title=isCharter?'Induction Philosophy — FIG Hall of Fame':'The Hall — Fromm is Garbage';
}
window.figHallOfFame=page;
window.figHallOfFameModel={model,verifyPlayer,verifySeason,completedYears,INDUCTION_CLASSES};
})();