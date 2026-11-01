/* FIG Legacy Points 2.0. Season/game 60:40 calibration; verified FIG starts. */
(function(){
'use strict';
const THRESHOLD=350,MIN_STARTS=8,POSITIONS=['QB','RB','WR','TE'];
const SEASONS=[
[30,25,16,15.5,13.5],[50,26.5,18.5,18.5,15],[70,28.5,19.5,19.5,16],
[95,29.5,22.5,21.5,17],[120,32,26,25,18.5],[145,34.5,28,27.5,20.5],
[175,37.5,30,30,22.5],[205,41,33,33,25]
];
const GAMES=[[20,1,2,2,3],[30,3,5,5,10],[40,7,10,10,18],
[50,13,15,15,26],[60,22,25,25,35]];
const WATCH=new Set(('4984 9493 7564 4034 8130 9221 4881 6786 6904 9509 '+
'11604 3294 7547 4046 8150 3163 8183 9226 6801 9758 '+
'8137 9488 6813 6794 11564 11566 6770 8138 11560 11632 '+
'8151 7523 12527 12526 6804 9228').split(' '));
const FOUNDERS=new Set(['4984','9493']);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:1});
const ppgFmt=x=>Number(x).toFixed(2);
function seasonPoints(pos,ppg){const i=POSITIONS.indexOf(pos);if(i<0||!Number.isFinite(ppg))return 0;
let n=0;for(const t of SEASONS)if(ppg+1e-9>=t[i+1])n=t[0];return n;}
function gamePoints(pos,score){const i=POSITIONS.indexOf(pos);if(i<0||!Number.isFinite(score))return {points:0,band:-1};
for(let j=GAMES.length-1;j>=0;j--)if(score>=GAMES[j][0])return {points:GAMES[j][i+1],band:j};return {points:0,band:-1};}
function calculate(d){
 const complete=new Set((d.league||[]).filter(x=>String(x.status).toLowerCase()==='complete').map(x=>+x.season));
 const players=new Map(),seen=new Set();
 for(const x of d.playerLog||[]){
  const id=String(x.player_id||''),pos=String(x.position||''),year=+x.season,
   score=+x.starter_points,key=id+'|'+year+'|'+x.week;
  if(!id||!POSITIONS.includes(pos)||!Number.isFinite(score)||
  !['Regular Season','Playoffs'].includes(x.game_type)||seen.has(key))continue;
  seen.add(key);
  let p=players.get(id);
  if(!p){p={id,name:x.player_name||'Unnamed',position:pos,season:0,games:0,
    bands:[0,0,0,0,0],years:new Map()};players.set(id,p);}
  let s=p.years.get(year);
  if(!s){s={year,starts:0,points:0,season:0,games:0,complete:complete.has(year)};p.years.set(year,s);}
  s.starts++;s.points+=score;
  const g=gamePoints(pos,score);p.games+=g.points;s.games+=g.points;if(g.band>=0)p.bands[g.band]++;
 }
 for(const x of d.playerSeasons||[]){
  if(x.scoring_view!=='All-Time Combined'||!complete.has(+x.season)||
  !(x.season_complete===true||x.season_complete==='true'))continue;
  const p=players.get(String(x.player_id));if(!p||p.position!==x.position)continue;
  const s=p.years.get(+x.season),starts=+x.starts,points=+x.total_points;
  if(!s||starts<MIN_STARTS||s.starts!==starts||Math.abs(s.points-points)>.02)continue;
  s.season=seasonPoints(p.position,points/starts);p.season+=s.season;
 }
 const all=[...players.values()].map(p=>{
  const years=[...p.years.values()].map(s=>({...s,ppg:s.points/s.starts})).sort((a,b)=>b.year-a.year);
  const current=years.find(x=>!x.complete&&x.starts>0),total=+(p.season+p.games).toFixed(1);
  return {...p,years,total,remaining:Math.max(0,+(THRESHOLD-total).toFixed(1)),
   current:current?{...current,pending:current.starts>=4?seasonPoints(p.position,current.ppg):null}:null,
   watched:WATCH.has(p.id),founder:FOUNDERS.has(p.id),eligible:total>=THRESHOLD};
 }).sort((a,b)=>b.total-a.total||b.season-a.season||a.name.localeCompare(b.name));
 all.forEach((p,i)=>p.rank=i+1);
 const season=all.reduce((n,p)=>n+p.season,0),games=all.reduce((n,p)=>n+p.games,0);
 return {all,watch:all.filter(p=>p.watched),season,games,ratio:season/(season+games||1),
  eligible:all.filter(p=>p.eligible),lastYear:Math.max(...complete)};
}
function pointsTable(rows,cls){
 return '<div class="hoflp-scroll"><table class="hoflp-rules-table '+cls+'"><thead><tr><th>LEGACY PTS</th>'+
 POSITIONS.map(p=>'<th>'+p+' PPG</th>').join('')+'</tr></thead><tbody>'+
 rows.map(row=>'<tr><th>'+row[0]+'</th>'+row.slice(1).map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+
 '</tbody></table></div>';
}
function detail(p){
 const seasons=p.years.map(s=>
  '<div class="hoflp-season-card"><div class="hoflp-season-head"><strong>'+s.year+'</strong>'+
  (s.complete?'<span>FINAL</span>':'<span class="hoflp-active">IN PROGRESS</span>')+'</div>'+
  '<div class="hoflp-season-average"><strong>'+ppgFmt(s.ppg)+'</strong><span>PPG · '+s.starts+' STARTS</span></div>'+
  '<div class="hoflp-season-values"><div><small>SEASON POINTS</small><b>'+fmt(s.season)+'</b></div>'+
  '<div><small>GAME POINTS</small><b>'+fmt(s.games)+'</b></div></div></div>').join('');
 const bands=p.bands.map((count,i)=>'<div><small>'+GAMES[i][0]+'+</small><strong>'+count+'</strong></div>').join('');
 return '<details class="hoflp-detail"><summary>POINTS BREAKDOWN</summary>'+
  '<div class="hoflp-detail-body">'+seasons+
  '<div class="hoflp-game-breakdown"><span>GAME SCORING BANDS</span>'+
  '<div class="hoflp-game-counts">'+bands+'</div>'+
  '<p>Counts use the highest scoring band per game. PPG bonuses are awarded only after the season is complete.</p>'+
  '</div></div></details>';
}
function playerRow(p){
 const status=p.founder?'ENSHRINED':p.eligible?'ELIGIBLE':'BUILDING';
 const pending=p.current&&p.current.pending!==null?
 '<b>+'+fmt(p.current.pending)+' PENDING</b><small>'+ppgFmt(p.current.ppg)+' PPG · '+
 p.current.starts+' STARTS</small>':'<small>NOT PROJECTABLE</small>';
 return '<tr><td>'+p.rank+'</td><th scope="row"><div class="hoflp-player">'+
 '<img loading="lazy" alt="" src="https://sleepercdn.com/content/nfl/players/thumb/'+encodeURIComponent(p.id)+
 '.jpg" onerror="this.remove()"><span><a href="#/player/'+encodeURIComponent(p.id)+'">'+esc(p.name)+
 '</a><small>'+esc(p.position)+' · '+status+'</small></span></div>'+detail(p)+'</th>'+
 '<td>'+fmt(p.season)+'</td><td>'+fmt(p.games)+'</td><td class="hoflp-total"><strong>'+fmt(p.total)+
 '</strong><i><b style="width:'+Math.min(100,p.total/THRESHOLD*100).toFixed(2)+'%"></b></i></td>'+
 '<td>'+(p.eligible?'QUALIFIED':fmt(p.remaining)+' LEFT')+'</td><td>'+pending+'</td></tr>';
}
function html(m){
 const st=SEASONS.map(t=>['+'+t[0],...t.slice(1).map(String)]);
 const gm=GAMES.map((t,i)=>[i===4?'60+':t[0]+'-'+(GAMES[i+1][0]-0.01).toFixed(2),
  ...t.slice(1).map(v=>v?'+'+fmt(v):'-')]);
 return '<section class="fig-hof-content fig-hof-248-eligibility hoflp-page">'+
 '<nav class="fig-hof-248-back"><a href="#/hall-of-fame">← RETURN TO THE HALL</a><span>HALL / ELIGIBILITY</span></nav>'+
 '<header class="fig-hof-248-intro"><span class="fig-hof-eyebrow">THE STANDARD OF GREATNESS</span>'+
 '<h1>Legacy <em>Points.</em></h1><p>Every exceptional season builds a career legacy. Every unforgettable individual performance matters. Eligibility earns consideration, never automatic induction.</p></header>'+
 '<div class="hoflp-hero"><div><span class="fig-hof-eyebrow">HALL OF FAME ELIGIBILITY</span>'+
 '<strong>'+THRESHOLD+'</strong><b>CAREER LEGACY POINTS</b>'+
 '<p>One eligibility standard for every position. Josh Allen and Puka Nacua remain permanently enshrined as the founding class.</p></div>'+
 '<div class="hoflp-share"><div><strong>'+(m.ratio*100).toFixed(1)+'%</strong><span>SEASON POINTS</span></div>'+
 '<div><strong>'+((1-m.ratio)*100).toFixed(1)+'%</strong><span>GAME BONUSES</span></div>'+
 '<div class="hoflp-share-bar"><i style="width:'+(m.ratio*100).toFixed(2)+'%"></i></div>'+
 '<p>Actual historical weighting. The Legacy 2.0 scoring bands target a 60% season / 40% game split.</p></div></div>'+
 '<section class="hoflp-rule"><div class="fig-hof-248-section-head"><span class="fig-hof-eyebrow">I / SEASONAL DOMINANCE</span>'+
 '<h2>Great seasons endure.</h2><p>One permanent award per completed season with at least eight official FIG starts. The highest tier reached is awarded using exact unrounded All-Time Combined PPG, including playoffs.</p></div>'+
 pointsTable(st,'hoflp-season-table')+'</section>'+
 '<section class="hoflp-rule"><div class="fig-hof-248-section-head"><span class="fig-hof-eyebrow">II / INDIVIDUAL MILESTONES</span>'+
 '<h2>Defining performances.</h2><p>One bonus per started FIG game, with the highest scoring band only. The first scoring band begins at 20 points for every position.</p></div>'+
 pointsTable(gm,'hoflp-game-table')+'</section>'+
 '<div class="hoflp-principles"><p><b>POSITIONALLY CALIBRATED</b> Earning bands reflect different positional scoring distributions.</p>'+
 '<p><b>PERMANENT ACHIEVEMENTS</b> New seasons never reduce already earned Legacy Points.</p>'+
 '<p><b>VERIFIED FIG STARTS</b> Bench games never qualify. Completed seasons require eight starts.</p></div>'+
 '<section data-hoflp class="hoflp-watch"><header><span class="fig-hof-eyebrow">THE ROAD TO IMMORTALITY</span>'+
 '<h2>Legacy Watch.</h2><p>Commissioner watchlist and complete searchable FIG player leaderboard. '+
 m.eligible.length+' currently points-eligible.</p></header>'+
 '<div class="hoflp-controls"><div class="hoflp-tabs">'+
 '<button type="button" data-hoflp-scope="watch" aria-pressed="true" class="is-active">WATCHLIST ('+m.watch.length+')</button>'+
 '<button type="button" data-hoflp-scope="all" aria-pressed="false">ALL PLAYERS ('+m.all.length+')</button></div>'+
 '<input type="search" data-hoflp-search aria-label="Search player" placeholder="Search players...">'+
 '<select data-hoflp-pos aria-label="Filter position"><option value="ALL">ALL POSITIONS</option>'+
 POSITIONS.map(p=>'<option>'+p+'</option>').join('')+'</select></div>'+
 '<div class="hoflp-scroll" role="region" aria-label="Legacy Points leaderboard" tabindex="0">'+
 '<table class="hoflp-leaderboard"><thead><tr><th>#</th><th>PLAYER</th><th>SEASON</th><th>GAMES</th>'+
 '<th>TOTAL</th><th>TO '+THRESHOLD+'</th><th>2026 PENDING</th></tr></thead><tbody data-hoflp-rows>'+
 m.watch.map(playerRow).join('')+'</tbody></table></div>'+
 '<p class="hoflp-count" data-hoflp-count>SHOWING '+m.watch.length+' WATCHLIST PLAYERS</p>'+
 '<p class="hoflp-note">The watchlist preserves commissioner selections and exclusions. ALL PLAYERS includes everyone, even players removed from the watch. Incomplete 2026 PPG award previews are conditional on maintaining the average and reaching eight starts at season completion. Current game bonuses are earned immediately as verified results publish.</p></section>'+
 '<p class="hoflp-note">SOURCE: FIG STARTED-PLAYER GAME LOG AND ALL-TIME COMBINED SEASON RECORDS. '+
 'COMPLETED-SEASON AWARDS THROUGH '+m.lastYear+'. PPG IS NEVER ROUNDED BEFORE EVALUATION.</p></section>';
}
function activate(app,m){
 const wrap=app.querySelector('[data-hoflp]');if(!wrap)return;
 const input=wrap.querySelector('[data-hoflp-search]'),position=wrap.querySelector('[data-hoflp-pos]'),
  tbody=wrap.querySelector('[data-hoflp-rows]'),label=wrap.querySelector('[data-hoflp-count]');
 let mode='watch';
 function draw(){
  const source=mode==='watch'?m.watch:m.all,term=input.value.trim().toLowerCase(),pos=position.value;
  const found=source.filter(p=>(pos==='ALL'||p.position===pos)&&p.name.toLowerCase().includes(term));
  tbody.innerHTML=found.length?found.map(playerRow).join(''):'<tr><td colspan="7">NO MATCHING PLAYERS</td></tr>';
  label.textContent='SHOWING '+found.length+' OF '+source.length+' '+(mode==='watch'?'WATCHLIST PLAYERS':'PLAYERS');
 }
 for(const b of wrap.querySelectorAll('[data-hoflp-scope]'))b.addEventListener('click',()=>{
  mode=b.getAttribute('data-hoflp-scope');
  for(const btn of wrap.querySelectorAll('[data-hoflp-scope]')){
   const on=btn.getAttribute('data-hoflp-scope')===mode;
   btn.classList.toggle('is-active',on);btn.setAttribute('aria-pressed',String(on));
  }
  draw();
 });
 input.addEventListener('input',draw);position.addEventListener('change',draw);
}
const original=window.figHallOfFame;
window.figHallOfFame=async function(ctx,view,arg,sub,year){
 await original(ctx,view,arg,sub,year);
 if(view!=='eligibility')return;
 const m=calculate(ctx.DATA),old=ctx.app.querySelector('.fig-hof-content');
 if(!old)return;
 old.outerHTML=html(m);activate(ctx.app,m);
 document.title='Legacy Points and Hall Eligibility - Fromm is Garbage';
};
window.figHallLegacy={calculate,seasonPoints,gamePoints,SEASONS,GAMES,THRESHOLD,MIN_STARTS,WATCH};
})();
