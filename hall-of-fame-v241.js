/* FIG Hall of Fame / Charter II — fixed, evidence-backed induction classes.
   Franchises earn legacy points, but are never automatically enshrined. */
(function(){
'use strict';
const CHARTER_YEAR=2026,FOUNDING_END=2025,POSITIONS=['QB','RB','WR','TE'];
const OWNERS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
const PORTRAITS={1:'boek.webp',2:'fru.webp',3:'fromm.webp',4:'sack.webp',5:'leyton.webp',6:'hayden-2026.svg',7:'line.webp',8:'winston.webp',9:'camnol.webp',10:'james.webp'};
/* Curated historical inductees. Future classes require an explicit induction
   decision and evidence review, never a top-N query or an annual quota. */
const INDUCTION_CLASSES=[{year:2026,title:'The Founding Class',period:'2023–2025',entries:[
 {kind:'player',id:'4984',position:'QB',case:'Two seasons atop QB scoring and more than 30 points per FIG start across 45 official appearances.'},
 {kind:'player',id:'4034',position:'RB',case:'Two RB season scoring crowns, including a 2023 campaign more than 50% ahead of the next RB.'},
 {kind:'player',id:'7564',position:'WR',case:'Nearly 1,000 verified starter points and the historic 2024 receiving season.'},
 {kind:'player',id:'8130',position:'TE',case:'The completed-era single-season TE scoring record in 2025 and elite scoring efficiency.'},
 {kind:'season',id:'6:2025',case:'A championship, the first verified 3,000-point regular season and seven weekly scoring titles.'}
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
 if(!p)return{ok:false,reasons:['No archived starts']};
 const base=p.starts>=28&&p.years.length>=2;
 let success=false,criteria='';
 if(p.position==='QB'){success=p.starts>=40&&p.avg>=30&&p.crowns.length>=2;criteria='40+ FIG starts · 30+ PPG · at least two season QB scoring titles';}
 if(p.position==='RB'){success=p.starts>=30&&p.avg>=24&&p.crowns.length>=2;criteria='30+ FIG starts · 24+ PPG · at least two RB season scoring titles';}
 if(p.position==='WR'){success=p.starts>=35&&p.points>=950&&p.p30>=8&&p.crowns.length>=1;criteria='35+ FIG starts · 950+ career points · eight 30+ games · season WR scoring title';}
 if(p.position==='TE'){success=p.starts>=30&&p.avg>=16.5&&p.bestSeason?.points>=280&&p.recordSeason;criteria='30+ FIG starts · 16.5+ PPG · 280+ single-season points · position season record';}
 return{ok:base&&success,criteria};
}
function verifySeason(s,fin){
 const qualifies=!!s&&fin.some(f=>f.year===s.year&&f.champion===s.id)&&s.points>=3000&&s.ppg>=210&&s.allPlay>=85&&s.highs>=6;
 return {ok:qualifies,criteria:'League title · 3,000+ regular-season points · 210+ PPG · 85%+ all-play · six weekly scoring titles'};
}
function legacy(d,years,fin,seasons){
 const streaks=d.websiteStreaks||[],completed=new Set(years);
 const entries=Object.entries(OWNERS).map(([raw,nameText])=>{
  const id=value(raw),member=seasons.filter(s=>s.id===id),honors=[],add=(pts,label,year,href)=>honors.push({pts,label,year,href});
  for(const f of fin){if(f.champion===id)add(200,'FIG championship',f.year,'#/game/'+f.year+'/'+f.game.week+'/'+f.game.matchup_id);
   else if(f.runner===id)add(80,'Championship runner-up',f.year,'#/game/'+f.year+'/'+f.game.week+'/'+f.game.matchup_id);
  }
  for(const s of member){
   if(s.finish===1)add(45,'Regular-season #1 seed',s.year,'#/teamseason/'+id+'/'+s.year);
   const inYear=seasons.filter(x=>x.year===s.year);
   if(inYear.length&&s.points===Math.max(...inYear.map(x=>x.points)))add(45,'Season scoring leader',s.year,'#/teamseason/'+id+'/'+s.year);
   if(inYear.length&&s.allPlay===Math.max(...inYear.map(x=>x.allPlay)))add(45,'Season all-play leader',s.year,'#/teamseason/'+id+'/'+s.year);
   if(s.allPlay>=90)add(80,'90%+ all-play season',s.year,'#/teamseason/'+id+'/'+s.year);
   if(s.points>=3000)add(80,'3,000+ regular-season points',s.year,'#/teamseason/'+id+'/'+s.year);
   if(s.highs>=7)add(55,'Seven or more weekly high scores',s.year,'#/teamseason/'+id+'/'+s.year);
  }
  const eligible=streaks.filter(x=>value(x.franchise_id)===id&&completed.has(value(x.end_season))&&value(x.start_season)<=value(x.end_season)&&x.streak_mode==='Career Games');
  if(eligible.some(x=>x.streak_type==='175+ Points'&&value(x.length)>=16))add(60,'16+ consecutive 175-point games',Math.min(...eligible.filter(x=>x.streak_type==='175+ Points'&&x.length>=16).map(x=>+x.end_season)),'#/streaks');
  if(eligible.some(x=>x.streak_type==='200+ Points'&&value(x.length)>=4))add(45,'Four consecutive 200-point games',Math.min(...eligible.filter(x=>x.streak_type==='200+ Points'&&x.length>=4).map(x=>+x.end_season)),'#/streaks');
  return{id,name:nameText,pts:honors.reduce((a,b)=>a+b.pts,0),titles:fin.filter(x=>x.champion===id).length,
   runnerUps:fin.filter(x=>x.runner===id).length,awards:honors.sort((a,b)=>b.year-a.year||b.pts-a.pts),
   seasons:member,allPlay:member.length?member.reduce((a,b)=>a+b.allPlay,0)/member.length:0};
 });
 return entries.sort((a,b)=>b.pts-a.pts||b.titles-a.titles||a.id-b.id).map((x,i)=>({...x,rank:i+1}));
}
function vault(d,years,fin,seasons){
 const all=seasons,founding=all.filter(s=>s.year<=FOUNDING_END),streaks=d.websiteStreaks||[];
 const records=[];
 const b=founding.find(s=>s.year===2025&&s.id===1);
 if(b&&b.allPlay>=90&&b.games>=14)records.push({key:'allplay',eyebrow:'THE 90% BARRIER',title:'Almost unbeatable.',owner:b.id,year:b.year,metric:fmt(b.allPlay,2)+'%',
  body:'Boek outscored the league in more than nine of every ten regular-season all-play comparisons. A benchmark beyond ordinary championship contention.',href:'#/teamseason/1/2025'});
 const h=founding.find(s=>s.year===2025&&s.id===6);
 if(h&&h.points>=3000&&fin.some(f=>f.year===2025&&f.champion===6))records.push({key:'3k',eyebrow:'THE 3,000-POINT SEASON',title:'The impossible total.',owner:h.id,year:h.year,metric:fmt(h.points,2),
  body:'Hayden crossed 3,000 regular-season points and finished the job with the FIG championship.',href:'#/teamseason/6/2025'});
 if(b&&h&&b.highs>=7&&h.highs>=7)records.push({key:'highs',eyebrow:'THE SEVEN-WEEK STANDARD',title:'A league at their mercy.',owner:null,year:2025,metric:'7 + 7',
  body:'Boek and Hayden each posted the league’s highest weekly score seven times in the same completed season—half the regular-season calendar.',href:'#/records'});
 const streak=streaks.filter(x=>x.streak_mode==='Career Games'&&x.streak_type==='175+ Points'&&value(x.end_season)<=FOUNDING_END&&value(x.length)>=16).sort((a,b)=>b.length-a.length)[0];
 if(streak)records.push({key:'streak',eyebrow:'THE CONSISTENCY MARATHON',title:'Sixteen weeks of fire.',owner:value(streak.franchise_id),year:+streak.end_season,metric:fmt(streak.length)+' STRAIGHT',
  body:name(streak.franchise_id)+' scored at least 175 points in '+fmt(streak.length)+' consecutive FIG games. A sustained threshold, not a lucky afternoon.',href:'#/streaks'});
 return records;
}
function model(d){
 const complete=completedYears(d),foundingYears=complete.filter(y=>y<=FOUNDING_END),historical=finals(d,foundingYears),allFinals=finals(d,complete);
 const completedSeasons=seasonRows(d,complete),p=playerCareers(d,foundingYears);
 const classes=INDUCTION_CLASSES.map(cls=>({...cls,entries:cls.entries.map(e=>{
  if(e.kind==='player'){const career=p.byId.get(e.id),proof=verifyPlayer(career);return{...e,career,proof,name:career?.name||'Unavailable player',url:'#/hall-of-fame/inductee/player/'+slug(e.id)};}
  const [teamId,year]=e.id.split(':').map(Number),season=completedSeasons.find(s=>s.id===teamId&&s.year===year),proof=verifySeason(season,allFinals);
  return{...e,season,proof,name:name(teamId)+' · '+year,url:'#/hall-of-fame/inductee/season/'+teamId+'/'+year};
 })}));
 const inductees=classes.flatMap(c=>c.entries.filter(e=>e.proof.ok).map(e=>({...e,inductionYear:c.year})));
 return{complete,foundingYears,finals:allFinals,seasons:completedSeasons,classes,inductees,
  legacy:legacy(d,complete,allFinals,completedSeasons),
  vault:vault(d,complete,allFinals,completedSeasons),playerMap:p.byId};
}
const personPhoto=id=>'<span class="fig-hof-v2-owner"><img loading="lazy" src="assets/avatars/'+esc(PORTRAITS[id]||'')+'" alt="" onerror="this.remove()"><i>'+esc(name(id)[0])+'</i></span>';
const playerPhoto=p=>'<span class="fig-hof-v2-nfl"><img loading="lazy" referrerpolicy="no-referrer" src="https://sleepercdn.com/content/nfl/players/thumb/'+slug(p.id)+'.jpg" alt="" onerror="this.remove()"><i>'+esc(p.position)+'</i></span>';
const logo=()=>'<span class="fig-hof-seal">FIG <span>HALL OF FAME</span></span>';
const navigation=route=>'<nav class="fig-hof-nav" aria-label="Hall navigation">'+[
 ['overview','The Institution'],['hall','The Hall'],['records','Historic Feats'],['legacy','Legacy Points'],['charter','The Charter']
 ].map(([id,label])=>'<a href="#/hall-of-fame'+(id==='overview'?'':'/'+id)+'" '+(route===id?'aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav>';
const head=kind=>'<header class="fig-hof-site-head">'+logo()+'<span>EST. 2026 <b>·</b> BUILT FOR THE AGES</span></header>'+navigation(kind);
const heading=(n,t,s)=>'<div class="fig-hof-section-head"><div class="fig-hof-eyebrow">'+n+'</div><h2>'+t+'</h2><p>'+s+'</p></div>';
const metric=(value,label)=>'<div class="fig-hof-number"><strong>'+value+'</strong><span>'+label+'</span></div>';
function hcard(e,featured=false){
 const player=e.kind==='player',p=e.career,s=e.season;
 return '<a class="fig-hof-v2-inductee '+(featured?'is-featured':'')+'" href="'+e.url+'">'+
 '<div class="fig-hof-v2-inductee-top"><span>CLASS OF '+e.inductionYear+'</span><span>'+ (player?esc(p.position)+' · PLAYER':'FRANCHISE SEASON')+'</span></div>'+
 '<div class="fig-hof-v2-inductee-art">'+(player?playerPhoto(p):personPhoto(s.id))+'</div>'+
 '<div class="fig-hof-v2-inductee-info"><span class="fig-hof-v2-serial">'+(player?'CAREER ENSHRINEMENT':'HISTORIC SEASON')+'</span><h3>'+esc(e.name)+'</h3>'+
 '<p>'+esc(e.case)+'</p><div class="fig-hof-v2-cardfoot"><span>'+(player?fmt(p.avg,1)+' PPG · '+p.starts+' STARTS':fmt(s.points,1)+' POINTS · CHAMPION')+'</span><b>VIEW PLAQUE ↗</b></div></div></a>';
}
function lobby(m){
 const members=m.inductees;
 return '<section class="fig-hof-hero fig-hof-v2-hero"><div class="fig-hof-hero-stars" aria-hidden="true">✦ &nbsp; ✦ &nbsp; ✦</div>'+
 '<div class="fig-hof-hero-text"><span class="fig-hof-kicker">A PERMANENT RECORD OF EXCELLENCE</span><h1>Greatness<br><em>Is Rare.</em></h1>'+
 '<p>A Hall of Fame for feats that transcend ordinary winning. No annual quota. No automatic induction. Only careers and seasons that change the standard.</p>'+
 '<div class="fig-hof-hero-actions"><a class="fig-hof-gold-btn" href="#/hall-of-fame/hall">ENTER THE HALL <span>↗</span></a>'+
 '<a class="fig-hof-text-btn" href="#/hall-of-fame/charter">THE INDUCTION STANDARD ↗</a></div></div>'+
 '<div class="fig-hof-hero-emblem"><div class="fig-hof-emblem-halo"></div><div class="fig-hof-v2-crest">✦<span>F · I · G</span><strong>MMXXVI</strong></div></div>'+
 '<div class="fig-hof-hero-foot"><span>FOUNDING CLASS · 2026</span><span>ESTABLISHED TO LAST FOR GENERATIONS</span></div></section>'+
 '<div class="fig-hof-stat-bar">'+metric(members.length,'ENSHRINEMENTS')+metric(members.filter(e=>e.kind==='player').length,'PLAYER LEGENDS')+
 metric(members.filter(e=>e.kind==='season').length,'TEAM SEASONS')+metric(m.complete.length,'COMPLETED YEARS')+'</div>'+
 '<section class="fig-hof-content">'+heading('I / THE ENSHRINED','The Founding Five','Four historically extraordinary individual careers. One championship season that rewrote the record. The standard will never be lowered to fill a class.')+
 '<div class="fig-hof-v2-founders">'+members.map((e,i)=>hcard(e,i===0)).join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>2026 INAUGURAL CLASS · VERIFIED 2023–2025</span><a href="#/hall-of-fame/hall">ENTER THE COMPLETE HALL ↗</a></div>'+
 '<section class="fig-hof-v2-feature"><span class="fig-hof-eyebrow">II / HISTORIC ACCOMPLISHMENTS</span><h2>Some records<br><em>change the sport.</em></h2>'+
 '<p>Not every great season belongs in the Hall. But the greatest records, streaks, and achievements deserve a permanent place in FIG history.</p>'+
 '<a class="fig-hof-gold-btn" href="#/hall-of-fame/records">EXPLORE THE FEATS ↗</a>'+
 '<div class="fig-hof-v2-feature-number">90.48<span>%</span></div></section>'+
 '<section class="fig-hof-v2-legacy-preview">'+heading('III / THE FRANCHISE LEDGER','Legacy Is Earned','Managers accumulate points for documented titles, records and exceptional seasons. Legacy points are not Hall of Fame votes.')+
 '<div class="fig-hof-v2-preview-row">'+m.legacy.slice(0,3).map(r=>'<a href="#/hall-of-fame/legacy/'+r.id+'">'+personPhoto(r.id)+'<span><small>ALL-TIME FRANCHISE '+r.rank+'</small><strong>'+esc(r.name)+'</strong></span><b>'+fmt(r.pts)+' <small>PTS</small></b><i>↗</i></a>').join('')+'</div>'+
 '<div class="fig-hof-section-end"><span>OPEN TO ALL FRANCHISES</span><a href="#/hall-of-fame/legacy">VIEW THE LEGACY LEDGER ↗</a></div></section></section>';
}
function hall(m){
 return '<section class="fig-hof-content">'+heading('THE FIG HALL OF FAME','The Enshrined','Induction is a permanent historical honor. Being the best available player in a given year is not enough; eligibility must be demonstrated on several independent measures.')+
 '<div class="fig-hof-v2-factbar"><span>INAUGURAL CLASS OF 2026</span><strong>'+m.inductees.length+' HISTORIC ENSHRINEMENTS</strong><a href="#/hall-of-fame/charter">INDUCTION CHARTER ↗</a></div>'+
 '<div class="fig-hof-v2-founders">'+m.inductees.filter(e=>e.kind==='player').map(hcard).join('')+'</div>'+
 heading('ENSRINED TEAM SEASONS','Immortal Seasons','A full franchise season must clear a championship-and-dominance standard. No top-eight list, no consolation selections.')+
 '<div class="fig-hof-v2-season-honors">'+m.inductees.filter(e=>e.kind==='season').map(hcard).join('')+'</div>'+
 '<div class="fig-hof-v2-next-class"><span class="fig-hof-eyebrow">BEYOND THE FOUNDING CLASS</span><h3>The next class must earn its place.</h3><p>Future classes are added only after a completed season and explicit review. There is no requirement to elect anyone in any year, and the 2026 class remains unchanged forever.</p></div></section>';
}
function recordsPage(m){
 return '<section class="fig-hof-content">'+heading('THE ARCHIVE OF THE EXCEPTIONAL','Historic Feats','An intentionally small selection of feats with exceptional documented difficulty. This is a record gallery, not a Hall of Fame waiting list.')+
 '<div class="fig-hof-v2-record-grid">'+m.vault.map((r,i)=>'<a class="fig-hof-v2-record '+(i===0?'is-prime':'')+'" href="'+r.href+'">'+
 '<div class="fig-hof-v2-record-header"><span>'+esc(r.eyebrow)+'</span><b>'+r.year+'</b></div>'+
 '<div class="fig-hof-v2-record-metric">'+esc(r.metric)+'</div><h3>'+esc(r.title)+'</h3>'+
 '<p>'+esc(r.body)+'</p><div class="fig-hof-v2-record-foot"><span>'+(r.owner?esc(name(r.owner)):'BOEK & HAYDEN')+'</span><b>EXPLORE EVIDENCE ↗</b></div></a>').join('')+'</div>'+
 '<div class="fig-hof-v2-next-class"><span class="fig-hof-eyebrow">A RECORD IS NOT AN INDUCTION</span><h3>Greatness has different forms.</h3><p>An extraordinary streak or season belongs in this gallery without automatically enshrining its manager or every player involved. New feats are added only when they clear a published standard.</p></div></section>';
}
function legacyPage(m,id){
 if(id){const r=m.legacy.find(x=>x.id===+id);if(!r)return'<section class="fig-hof-content">Franchise not found.</section>';
  return '<section class="fig-hof-content">'+
  '<a class="fig-hof-v2-back" href="#/hall-of-fame/legacy">← ALL FRANCHISE LEGACIES</a>'+
  '<div class="fig-hof-v2-legacy-profile">'+personPhoto(r.id)+'<div><span class="fig-hof-eyebrow">LEGACY LEDGER / #'+r.rank+'</span><h1>'+esc(r.name)+'</h1>'+
  '<p>'+r.titles+' titles · '+r.runnerUps+' runner-up finishes · '+r.awards.length+' documented legacy awards</p>'+
  '<a class="fig-hof-gold-btn" href="#/team/'+r.id+'">FULL FRANCHISE ARCHIVE ↗</a></div><div class="fig-hof-v2-legacy-total">'+fmt(r.pts)+'<span>LEGACY POINTS</span></div></div>'+
  heading('THE VERIFIED RECEIPTS','Every Point Earned','Each award is sourced from a completed season, official title game, or verified streak. No predicted results.')+
  '<div class="fig-hof-v2-legacy-awards">'+r.awards.map(a=>'<a href="'+a.href+'"><span>'+a.year+'</span><strong>'+esc(a.label)+'</strong><b>+'+a.pts+'</b><small>VIEW ↗</small></a>').join('')+'</div></section>';
 }
 return '<section class="fig-hof-content">'+heading('LEGACY IS NOT INDUCTION','Franchise Legacy','A living, expanding ledger of historic franchise achievements. Everyone can earn points; nobody enters the Hall just by accumulating enough.')+
 '<div class="fig-hof-v2-ledger-intro"><div class="fig-hof-eyebrow">THE CAREER LEDGER</div><p>200 for a championship · 80 for a runner-up · 45 for regular-season, scoring, or all-play leadership · major bonuses for truly rare season and streak achievements.</p><a href="#/hall-of-fame/charter">READ THE COMPLETE SYSTEM ↗</a></div>'+
 '<div class="fig-hof-v2-legacy-list">'+m.legacy.map(r=>'<a href="#/hall-of-fame/legacy/'+r.id+'"><span class="fig-hof-v2-legacy-rank">'+String(r.rank).padStart(2,'0')+'</span>'+personPhoto(r.id)+
 '<strong>'+esc(r.name)+'</strong><span class="fig-hof-v2-legacy-sub">'+r.titles+' CHAMPIONSHIPS · '+r.awards.length+' AWARDS</span>'+
 '<b>'+fmt(r.pts)+' <small>PTS</small></b><span class="fig-hof-v2-open">↗</span></a>').join('')+'</div>'+
 '<div class="fig-hof-v2-next-class"><span class="fig-hof-eyebrow">BUILT FOR 20+ SEASONS</span><h3>Accolades accumulate. The Hall stays selective.</h3><p>When 2026 and later seasons finalize, the franchise ledger expands automatically. The fixed founding class does not change, and additional Hall elections must be explicitly approved.</p></div></section>';
}
function plaque(m,kind,id,year,d){
 const e=m.inductees.find(x=>x.kind===kind&&(kind==='player'?x.id===id:x.id===id+':'+year));
 if(!e)return'<section class="fig-hof-content"><a href="#/hall-of-fame/hall">← BACK TO THE HALL</a><p>There is no verified induction at this address.</p></section>';
 const p=e.career,s=e.season,player=kind==='player';
 const headliner=player?p.name:e.name;
 const lines=player?[['TOTAL STARTER POINTS',fmt(p.points,1)],['OFFICIAL STARTS',fmt(p.starts)],['POINTS / START',fmt(p.avg,1)],['POSITION SCORING CROWNS',fmt(p.crowns.length)]]:
 [['REGULAR-SEASON POINTS',fmt(s.points,2)],['POINTS / GAME',fmt(s.ppg,1)],['ALL-PLAY WIN RATE',fmt(s.allPlay,2)+'%'],['LEAGUE-HIGH WEEKS',fmt(s.highs)]];
 const bio=player?'The distinguishing case: '+e.case:'A championship year that passed every strict requirement for a team-season induction. '+e.case;
 const topWeeks=player?p.weeks.slice(0,5).map(w=>{
  const g=(d.games||[]).find(x=>+x.season===w.year&&+x.week===w.week&&(value(x.franchise_1)===w.team||value(x.franchise_2)===w.team));
  return '<a href="'+(g?'#/game/'+w.year+'/'+w.week+'/'+g.matchup_id:'#/teamseason/'+w.team+'/'+w.year)+'"><b>'+w.year+' · WK '+w.week+'</b><span>'+name(w.team)+'</span><strong>'+fmt(w.pts,1)+' PTS ↗</strong></a>';
 }).join(''):'<a href="#/teamseason/'+s.id+'/'+s.year+'"><b>'+s.year+'</b><span>OFFICIAL TEAM-SEASON ARCHIVE</span><strong>OPEN HISTORY ↗</strong></a>';
 return '<section class="fig-hof-content">'+
 '<a class="fig-hof-v2-back" href="#/hall-of-fame/hall">← THE ENSHRINED</a>'+
 '<div class="fig-hof-v2-plaque"><div class="fig-hof-v2-plaque-art">'+(player?playerPhoto(p):personPhoto(s.id))+'</div>'+
 '<div class="fig-hof-v2-plaque-copy"><span class="fig-hof-eyebrow">CLASS OF '+e.inductionYear+' · '+(player?p.position+' PLAYER':'TEAM SEASON')+'</span>'+
 '<h1>'+esc(headliner)+'</h1><p>'+esc(bio)+'</p>'+
 '<a class="fig-hof-gold-btn" href="'+(player?'#/player/'+slug(p.id):'#/teamseason/'+s.id+'/'+s.year)+'">OPEN THE FULL ARCHIVE ↗</a></div></div>'+
 '<div class="fig-hof-v2-plaque-metrics">'+lines.map(k=>metric(k[1],k[0])).join('')+'</div>'+
 heading('THE CASE FOR IMMORTALITY','Beyond the Numbers','The candidate cleared multiple independent historical standards, with no automatic selection simply for being first on a leaderboard.')+
 '<div class="fig-hof-v2-standard"><strong>FORMAL QUALIFICATION</strong><p>'+esc(e.proof.criteria)+'</p><p>'+esc(e.case)+'</p></div>'+
 heading('THE ORIGINAL RECEIPTS',player?'Defining Performances':'The Championship Campaign','Open source records and see exactly what made this induction possible.')+
 '<div class="fig-hof-v2-receipts">'+topWeeks+'</div></section>';
}
function charter(m){
 const rules=[
 ['01','PERMANENT CLASSES','The 2026 class is fixed to the completed 2023–2025 seasons. A future class requires an intentional published decision; it is never generated by taking the next four on a leaderboard. No annual quota.'],
 ['02','EXCEPTIONAL CAREERS','A player must have at least 28 FIG starts spanning two completed seasons. In addition, every inductee must meet an independent high-end positional standard across scoring efficiency, position-leading seasons, or unprecedented production.'],
 ['03','QUARTERBACK STANDARD','At least 40 official starts, a 30+ career PPG average, and two position-leading single-season FIG point totals.'],
 ['04','RUNNING BACK STANDARD','At least 30 official starts, a 24+ career PPG average, and two RB season scoring crowns.'],
 ['05','WIDE RECEIVER STANDARD','At least 35 official starts, 950+ starter points, eight games scoring 30+, and at least one WR season scoring title.'],
 ['06','TIGHT END STANDARD','At least 30 official starts, a 16.5+ career PPG average, a 280+ point TE season, and the strongest TE season of the founding period.'],
 ['07','IMMORTAL TEAM SEASONS','To enter the Hall, a franchise season must win the FIG championship, score at least 3,000 regular-season points, average at least 210 PPG, win 85% or more of its all-play decisions, and lead weekly scoring at least six times.'],
 ['08','THE LEGACY POINTS SYSTEM','Franchise points are separate from induction: 200 title, 80 finalist, 45 for each regular-season first seed / scoring leader / all-play leader. Rare feats: 80 for 90%+ all-play, 80 for 3,000+ points, 55 for seven weekly-high scores, 60 for a 16-game 175+ streak, and 45 for a four-game 200+ streak. Each streak milestone is awarded once, not once per overlapping entry.'],
 ['09','HISTORIC FEATS','This gallery exhibits specifically qualified achievements, not the top N results in arbitrary categories. Every exhibit links to its real league record. A record does not itself grant Hall admission.'],
 ['10','NEW ERAS','The frozen founding standards do not automatically elect future inductees. When FIG grows, future classes can adopt published era-adjusted standards to account for league settings and scoring changes; founding honors remain permanent.']
 ];
 return '<section class="fig-hof-content">'+heading('THE FIG INDUCTION CHARTER','Excellence Without Compromise','The Hall must mean more in 2046 than it does today. Here is the complete, auditable standard.')+
 '<div class="fig-hof-v2-charter">'+rules.map(([n,t,c])=>'<div class="fig-hof-v2-rule"><span>'+n+'</span><div><h3>'+t+'</h3><p>'+c+'</p></div></div>').join('')+'</div>'+
 '<div class="fig-hof-v2-next-class"><span class="fig-hof-eyebrow">AN HONOR, NOT A CALCULATION</span><h3>Statistics establish eligibility. History makes the case.</h3><p>The numerical standards are necessary to earn a hearing; the actual induction roster is fixed and approved explicitly. No model, automated point total, or future data refresh can silently elect someone.</p></div></section>';
}
const footer=()=>'<footer class="fig-hof-footer"><div>'+logo()+'<p>THE STANDARD ENDURES.<br>THE RECORD REMEMBERS.</p></div><div>'+
 '<a href="#/hall-of-fame/hall">THE ENSHRINED ↗</a><a href="#/hall-of-fame/charter">THE CHARTER ↗</a>'+
 '<a href="#/more">BACK TO FIG ↗</a></div><span>FROMM IS GARBAGE · THE FIG HISTORICAL INSTITUTION</span></footer>';
async function page(ctx,view,arg,sub,year){
 await ctx.load(['league','games','teamSeasonMaster','playerLog','websiteStreaks']);
 const m=model(ctx.DATA);
 const remaps={franchises:'legacy',franchise:'legacy',players:'hall',player:'inductee',seasons:'records',moments:'records',methodology:'charter'};
 let kind=remaps[view]||view||'overview';
 const supported=['overview','hall','records','legacy','charter','inductee'];
 if(!supported.includes(kind))kind='overview';
 const active=kind==='inductee'?'hall':kind;
 let content;
 if(kind==='overview')content=lobby(m);
 else if(kind==='hall')content=hall(m);
 else if(kind==='records')content=recordsPage(m);
 else if(kind==='legacy')content=legacyPage(m,arg);
 else if(kind==='charter')content=charter(m);
 else if(view==='player')content=plaque(m,'player',String(arg||''),null,ctx.DATA);
 else content=plaque(m,arg==='season'?'season':'player',String(sub||''),year,ctx.DATA);
 ctx.app.innerHTML='<div class="fig-hof fig-hof-v2" id="figHallOfFame">'+head(active)+content+footer()+'</div>';
 document.title='Hall of Fame — Fromm is Garbage';
}
window.figHallOfFame=page;
window.figHallOfFameModel={model,verifyPlayer,verifySeason,completedYears,INDUCTION_CLASSES};
})();