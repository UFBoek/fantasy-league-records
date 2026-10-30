/* FIG Dynasty Dominance — responsive read-only scoring-strength research beta.
 * Never present experimental season rank frequencies as validated probabilities.
 */
(function(){
 'use strict';
 const TEAMS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',
  7:'Line',8:'Winston',9:'CamNol',10:'James'};
 const COLORS={1:'#3879ff',2:'#e0ac53',3:'#8a79ff',4:'#e38a77',
  5:'#4a9c85',6:'#e0ba55',7:'#68b6c3',8:'#bf82d3',9:'#7c9bcf',10:'#db8ba3'};
 const AVATARS={1:'boek.webp',2:'fru.webp',3:'fromm.webp',4:'sack.webp',
  5:'leyton.webp',6:'hayden-2026.svg',7:'line.webp',8:'winston.webp',
  9:'camnol.webp',10:'james.webp'};
 let report=null,selectedYear=2027;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const fmt=(v,d=1)=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
 const sign=v=>(v>0?'+':'')+fmt(v);
 const avatar=id=>'<img loading="lazy" decoding="async" alt="" src="assets/avatars/'+AVATARS[id]+'">';
 const button=(year,active)=>'<button class="dd-year'+(active?' is-active':'')+
  '" type="button" data-dd-year="'+year+'" aria-pressed="'+active+'">'+year+'</button>';
 const ppg=(s,id)=>s.ranking.find(x=>x.id===id);
 function rankYear(year){
  const rows=report.seasons[year].ranking;
  const boek=rows.find(x=>x.id===1);
  const opponents=rows.filter(x=>x.id!==1).slice().sort((x,y)=>y.ppg-x.ppg);
  return {boek,opponents,leader:opponents[0]};
 }
 function observedYear(){
  const book=report.teams.find(x=>x.id===1);
  const opponent=report.teams.filter(t=>t.id!==1)
   .slice().sort((a,b)=>b.current_ppg-a.current_ppg)[0];
  return {book,opponent,gap:book.current_ppg-opponent.current_ppg};
 }
 function ageAndPicks(id){
  const t=report.teams.find(t=>t.id===id);
  const knownThrough=Number(report.assumptions?.known_pick_ownership_through)||2029;
  const confirmed=Object.entries(t.draft_by_year).filter(([year])=>+year<=knownThrough)
    .reduce((sum,[,value])=>sum+(Number(value.known)||0),0);
  return {t,knownThrough,confirmed};
 }
 function lineupChart(selected){
  const years=report.years;
  const selectedTeams=[1,6,9,selected].filter((id,i,all)=>all.indexOf(id)===i);
  const dims={left:46,right:895,top:24,bottom:232};
  const values=years.flatMap(y=>selectedTeams.map(id=>ppg(report.seasons[y],id)?.ppg||0));
  const lo=Math.max(0,Math.floor((Math.min(...values)-15)/20)*20);
  const hi=Math.ceil((Math.max(...values)+15)/20)*20;
  const x=i=>dims.left+(dims.right-dims.left)*i/(years.length-1);
  const y=v=>dims.bottom-(v-lo)*(dims.bottom-dims.top)/Math.max(1,hi-lo);
  const grid=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);
  const axis=grid.map(v=>'<line class="dd-chart-grid" x1="46" y1="'+y(v)+'" x2="895" y2="'+y(v)+'"/>'+
   '<text class="dd-chart-label" x="37" y="'+(y(v)+4)+'" text-anchor="end">'+Math.round(v)+'</text>').join('')+
   years.map((yr,i)=>'<text class="dd-chart-label" x="'+x(i)+'" y="267" text-anchor="middle">'+yr+'</text>').join('');
  const lines=selectedTeams.map(id=>{
   const stroke=COLORS[id],pts=years.map((yr,i)=>x(i)+','+y(ppg(report.seasons[yr],id).ppg)).join(' ');
   const active=id===selected;
   return '<polyline points="'+pts+'" fill="none" stroke="'+stroke+
    '" stroke-width="'+(active?4:2.6)+'" stroke-linejoin="round" stroke-linecap="round"'+
    (active?'':' opacity=".8"')+'/>'+
    years.map((yr,i)=>'<circle cx="'+x(i)+'" cy="'+y(ppg(report.seasons[yr],id).ppg)+
     '" r="'+(active?4.8:3.1)+'" fill="'+stroke+'" stroke="#0e1729" stroke-width="2"/>').join('');
  }).join('');
  return '<div class="dd-chart-head"><span>HOW THE CHALLENGERS CHANGE</span><div class="dd-legend">'+
   selectedTeams.map(id=>'<span><i style="background:'+COLORS[id]+'"></i>'+esc(TEAMS[id])+'</span>').join('')+
   '</div></div><div class="dd-chart"><svg class="dd-chart-svg" viewBox="0 0 940 286" role="img" aria-label="Projected scoring strength from 2027 through 2032 for Boek and leading challengers">'+axis+lines+'</svg></div>';
 }
 function leagueLadder(selected,year){
  const current=rankYear(year);
  const high=current.boek.ppg;
  return '<div class="dd-ladder">'+current.opponents.map((p,i)=>{
   const gap=high-p.ppg,filled=Math.max(3,Math.min(100,100*p.ppg/Math.max(1,high)));
   const active=p.id===selected;
   return '<a class="dd-ladder-row'+(active?' is-selected':'')+'" href="#/dynasty-dominance/'+p.id+'/'+year+'"'+
    (active?' aria-current="page"':'')+'>'+
    '<span class="dd-ladder-rank">'+String(i+1).padStart(2,'0')+'</span>'+
    '<span class="dd-ladder-avatar">'+avatar(p.id)+'</span>'+
    '<span class="dd-ladder-info"><strong>'+esc(TEAMS[p.id])+'</strong>'+
      '<span class="dd-ladder-track" aria-hidden="true"><i style="width:'+filled.toFixed(1)+'%;background:'+COLORS[p.id]+'"></i></span></span>'+
    '<span class="dd-ladder-nums"><strong>'+fmt(p.ppg)+'</strong><small>'+
     (gap>=0?fmt(gap)+' behind':'+'+fmt(-gap)+' ahead')+'</small></span></a>';
  }).join('')+'</div>';
 }
 function futureLeaders(){
  return '<div class="dd-year-table-wrap"><table class="dd-year-table dd-challenger-table">'+
   '<thead><tr><th>SEASON</th><th>CLOSEST CHALLENGER</th><th>CHALLENGER PPG</th><th>BOEK PPG</th><th>BOEK MARGIN</th></tr></thead><tbody>'+
   report.years.map(year=>{
    const r=rankYear(year),gap=r.boek.ppg-r.leader.ppg;
    return '<tr class="'+(year===selectedYear?'is-active':'')+'"><td>'+
     '<button type="button" class="dd-year-row-button" data-dd-year="'+year+'">'+year+'</button></td>'+
     '<td><a class="dd-year-opponent" href="#/dynasty-dominance/'+r.leader.id+'/'+year+'">'+
      '<span class="dd-year-avatar">'+avatar(r.leader.id)+'</span>'+esc(TEAMS[r.leader.id])+'</a></td>'+
     '<td>'+fmt(r.leader.ppg)+'</td><td>'+fmt(r.boek.ppg)+'</td>'+
     '<td class="'+(gap>=0?'dd-pos':'dd-neg')+'">'+(gap>=0?'+'+fmt(gap):'−'+fmt(-gap))+'</td></tr>';
   }).join('')+'</tbody></table></div>';
 }
 function seasonStats(){
  const years=report.years;
  const leaders=years.map(year=>({year,...rankYear(year)}));
  const first=leaders[0],last=leaders[leaders.length-1],gap=last.boek.ppg-last.leader.ppg;
  const counts={};
  leaders.forEach(y=>counts[y.leader.id]=(counts[y.leader.id]||0)+1);
  const recurring=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  return {first,last,recurring,gap};
 }
 function profile(selected){
  const {t,knownThrough,confirmed}=ageAndPicks(selected);
  return '<div class="dd-identity">'+avatar(selected)+'<div><strong>'+esc(t.name)+'</strong>'+
   '<small>'+t.roster_count+' eligible players · '+fmt(t.current_ppg)+' actual PPG in 2026</small></div></div>'+
   '<div class="dd-profile-stats">'+
    '<div><span>TOP-10 VALUE-WEIGHTED AGE</span><b>'+fmt(t.top10_value_weighted_age)+'</b></div>'+
    '<div><span>VERIFIED FUTURE PICKS</span><b>'+fmt(confirmed,0)+'</b></div>'+
    '<div><span>VERIFIED FIRST-ROUND PICKS</span><b>'+fmt(t.known_first_rounders,0)+'</b></div>'+
    '<div><span>'+selectedYear+' RANK VS BOEK</span><b>#'+
      (rankYear(selectedYear).opponents.findIndex(x=>x.id===selected)+1)+'</b></div>'+
   '</div>'+
   '<div class="dd-draft-title">FUTURE PICK INVENTORY <small>VERIFIED THROUGH '+knownThrough+'</small></div>'+
   '<div class="dd-draft-grid">'+[2027,2028,2029,2030].map(year=>{
    const d=t.draft_by_year[year]||{known:0,round1:0,projected_assumed:4};
    const assumed=Number(d.projected_assumed)||0,known=Number(d.known)||0;
    return '<div><span>'+year+'</span><strong>'+fmt(known+assumed,0)+'</strong><small>'+
     (assumed?(known?known+' known · '+assumed+' assumed':'assumed'):(d.round1+' firsts'))+
     '</small></div>';
   }).join('')+'</div>'+
   '<a class="dd-related dd-projection-action" href="#/dynasty-dominance/'+selected+'/'+selectedYear+'/players">VIEW '+selectedYear+' PLAYER PROJECTIONS <span>↗</span></a>'+
   '<a class="dd-related" href="#/team/'+selected+'">VIEW '+esc(TEAMS[selected]).toUpperCase()+' TEAM PAGE <span>↗</span></a>'+
   '<a class="dd-related" href="#/stock-market">DYNASTY STOCK MARKET <span>↗</span></a>';
 }
 function display(focusId){
  const node=document.getElementById('app');
  if(!node||!report)return;
  if(!report.years.includes(selectedYear))selectedYear=report.years[0];
  const current=rankYear(selectedYear),focus=TEAMS[+focusId]&&+focusId!==1?+focusId:null;
  const selected=focus||current.leader.id,selectedScore=ppg(report.seasons[selectedYear],selected);
  const gap=current.boek.ppg-selectedScore.ppg;
  const observed=observedYear(),span=seasonStats();
  const generated=report.generated_at?
   new Date(report.generated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
  const isTop=selected===current.leader.id;
  const title=isTop?'BOEK’S CLOSEST CHALLENGER':'BOEK VS '+esc(TEAMS[selected]).toUpperCase();
  node.innerHTML='<div class="dd-page dd-challenger-page">'+
   '<div class="dd-back"><a href="#/more">← MORE</a><span>FIG ANALYTICS / DYNASTY</span></div>'+
   '<header class="dd-hero"><div class="dd-overline"><span class="dd-pulse"></span> DYNASTY DOMINANCE <span class="dd-tag">EXPERIMENTAL BETA</span></div>'+
    '<h1>WHO CAN <em>CHALLENGE BOEK?</em></h1>'+
    '<p>Ranking the challengers to Boek’s dynasty, season by season.</p>'+
    '<div class="dd-meta"><span>2026 THROUGH WEEK '+report.source_week+'</span><span>UPDATED '+esc(generated)+
     '</span><span>'+fmt(report.runs,0)+' SIMULATIONS</span></div></header>'+
   '<section class="dd-observed" aria-label="Observed current season scoring">'+
    '<div class="dd-observed-label"><span class="dd-overline">2026 · ACTUAL SCORING SO FAR</span>'+
     '<small>THROUGH WEEK '+report.source_week+'</small></div>'+
    '<div class="dd-observed-score">'+
      '<span><b>'+fmt(observed.book.current_ppg)+'</b><small>BOEK PPG</small></span>'+
      '<span class="dd-observed-versus">VS</span>'+
      '<span><b>'+fmt(observed.opponent.current_ppg)+'</b><small>'+esc(TEAMS[observed.opponent.id]).toUpperCase()+' PPG</small></span>'+
      '<strong class="dd-observed-gap">BOEK '+(observed.gap>=0?'+':'−')+fmt(Math.abs(observed.gap))+' PPG</strong>'+
    '</div>'+
    '<p>The current season is measured from completed weeks. Forecast years below use a different model, not observed results.</p>'+
   '</section>'+
   '<div class="dd-warning" role="note"><strong>Model projections · not verified probabilities</strong>'+
    '<span>Future scoring strength is experimental. Historical one-year tests have not consistently beaten a simple baseline.</span></div>'+
   '<div class="dd-year-selector dd-challenger-years" role="group" aria-label="Select projected season">'+
    report.years.map(y=>button(y,y===selectedYear)).join('')+'</div>'+
   '<section class="dd-feature" aria-label="Selected future challenger">'+
    '<div class="dd-feature-head"><span class="dd-overline">'+selectedYear+' · '+title+'</span>'+
     '<span class="dd-feature-badge">MODEL ESTIMATE</span></div>'+
    '<div class="dd-feature-compare"><div class="dd-feature-person">'+
      '<a class="dd-feature-avatar" href="#/dynasty-dominance/1/'+selectedYear+'/players" aria-label="View Boek projected players">'+avatar(1)+'</a><span class="dd-feature-name">BOEK</span>'+
      '<strong>'+fmt(current.boek.ppg)+'</strong><small>PROJECTED PPG</small></div>'+
     '<div class="dd-feature-gap"><span>SCORING DIFFERENCE</span><strong class="'+(gap>=0?'dd-pos':'dd-neg')+'">'+
      (gap>=0?'+':'−')+fmt(Math.abs(gap))+'</strong>'+
      '<small>'+(gap>=0?'Boek projected ahead':'Challenger projected ahead')+'</small></div>'+
     '<div class="dd-feature-person"><span class="dd-feature-avatar">'+avatar(selected)+'</span>'+
      '<span class="dd-feature-name">'+esc(TEAMS[selected]).toUpperCase()+'</span>'+
      '<strong>'+fmt(selectedScore.ppg)+'</strong><small>PROJECTED PPG</small></div></div>'+
    '<div class="dd-feature-foot"><span><a class="dd-profile-quicklink" href="#/dynasty-dominance/'+selected+'/'+selectedYear+'/players">VIEW '+selectedYear+' PLAYERS ↗</a></span>'+
     '</span><label>COMPARE TEAM <select id="ddTeamSelect" aria-label="Compare a challenger">'+
       current.opponents.map(t=>'<option value="'+t.id+'"'+(t.id===selected?' selected':'')+'>'+esc(TEAMS[t.id])+'</option>').join('')+
     '</select></label></div></section>'+
   '<div class="dd-overview"><section class="dd-panel dd-ladder-panel"><div class="dd-panel-heading">'+
     '<div><span class="dd-overline">THREAT RANKING</span><h3>Who is closest in '+selectedYear+'?</h3></div>'+
     '<span class="dd-mini">PROJECTED PPG</span></div>'+
    leagueLadder(selected,selectedYear)+'</section>'+
    '<section class="dd-panel dd-trend-panel"><div class="dd-panel-heading"><div>'+
      '<span class="dd-overline">LONG-TERM OUTLOOK</span><h3>The challengers’ trajectory</h3></div>'+
      '<span class="dd-mini">2027–2032</span></div>'+
      lineupChart(selected)+
      '<div class="dd-insight"><span>EARLY FAVORITE</span><b>'+
         esc(TEAMS[span.first.leader.id])+'</b><small>'+fmt(span.first.leader.ppg)+' PPG in 2027</small></div>'+
      '<div class="dd-insight"><span>2032 CHALLENGER</span><b>'+esc(TEAMS[span.last.leader.id])+
         '</b><small>'+fmt(span.last.leader.ppg)+' model PPG · '+fmt(Math.abs(span.gap))+
         (span.gap>=0?' behind Boek':' ahead of Boek')+'</small></div>'+
     '</section></div>'+
   '<section class="dd-panel dd-compare"><div class="dd-panel-heading"><div>'+
     '<span class="dd-overline">THE SUCCESSION RACE</span><h3>Boek’s top challenger, every year</h3></div>'+
     '<span class="dd-mini">EXPECTED TEAM SCORING</span></div>'+futureLeaders()+
    '<p class="dd-table-note">The top challenger is the non-Boek franchise with the highest projected average PPG, not an estimated championship probability.</p></section>'+
   '<section class="dd-panel dd-roster-profile"><div class="dd-panel-heading"><div>'+
    '<span class="dd-overline">CHALLENGER PROFILE</span><h3>'+esc(TEAMS[selected])+' roster & draft capital</h3></div>'+
    '<a class="dd-link" href="#/team/'+selected+'">TEAM PAGE ↗</a></div>'+
    profile(selected)+'</section>'+
   '<details class="dd-details"><summary>How the challenger model works <span>+</span></summary>'+
    '<div class="dd-details-body"><p>2026 actual points are recorded team scoring through Week '+
      report.source_week+'. Future years are stylized lineup-strength projections and should not be interpreted as directly observed season averages or future championship odds.</p>'+
     '<p>Each season’s closest challenger is ranked by projected mean points, not by a validated probability of finishing first. Modeling assumptions include aging, rookie development, injuries, and future draft capital. Real future trades are not invented, and no manager receives a subjective trading-skill bonus.</p>'+
     '<p>Actual ownership for original picks is sourced through '+
       ageAndPicks(selected).knownThrough+'. Beyond that date, original picks are assumed and can change with real trades. Historical one-year scoring holdouts have not demonstrated reliable long-horizon calibration.</p>'+
     '<a href="#/dynasty">ROSTER VALUES ↗</a></div></details>'+
   '<footer class="dd-foot">FROMM IS GARBAGE <span>•</span> EXPERIMENTAL DYNASTY RESEARCH <span>•</span> '+
     esc(report.model_version)+'</footer></div>';
  node.querySelectorAll('[data-dd-year]').forEach(b=>b.addEventListener('click',()=>{
    const focused=Number((location.hash.match(/^#\/dynasty-dominance\/(\d+)/)||[])[1]);
    selectedYear=Number(b.dataset.ddYear);
    const team=TEAMS[focused]?focused:rankYear(selectedYear).leader.id;
    location.hash='#/dynasty-dominance/'+team+'/'+selectedYear;
    display(team);
  }));
  const picker=node.querySelector('#ddTeamSelect');
  if(picker)picker.addEventListener('change',e=>{
    const id=Number(e.target.value);
    if(TEAMS[id]&&id!==1){
      location.hash='#/dynasty-dominance/'+id+'/'+selectedYear;
      display(id);
    }
  });
 }

 function displayPlayers(id,year){
  const node=document.getElementById('app');
  if(!node||!report)return;
  const season=report.seasons[year];
  const entries=season?.players_by_team?.[id];
  const t=report.teams.find(x=>x.id===id);
  if(!Array.isArray(entries)||!entries.length||!t){
   node.innerHTML='<div class="dd-page"><div class="dd-back"><a href="#/dynasty-dominance/'+id+'/'+year+'">← BACK TO TEAM</a></div>'+
    '<section class="dd-unavailable"><h2>Player projections unavailable</h2>'+
    '<p>The saved forecast does not contain verified player-level simulation results for '+year+'. It will be restored by the next model-data refresh.</p>'+
    '</section></div>';return;
  }
  const projected=entries.slice().sort((a,b)=>b.ppg-a.ppg||a.name.localeCompare(b.name));
  const actual=projected.filter(x=>!x.projected_rookie);
  const future=projected.filter(x=>x.projected_rookie);
  const book=season.ranking.find(x=>x.id===1);
  const team=season.ranking.find(x=>x.id===id);
  const labels=['ALL','QB','RB','WR','TE','TBD'];
  const positionRows=filter=>projected.filter(p=>filter==='ALL'||p.pos===filter);
  const head='<div class="dd-page dd-player-page">'+
   '<div class="dd-back"><a href="#/dynasty-dominance/'+id+'/'+year+'">← '+esc(TEAMS[id]).toUpperCase()+' '+year+' OUTLOOK</a><span>FIG ANALYTICS / PLAYER MODEL</span></div>'+
   '<header class="dd-hero dd-player-hero"><div class="dd-overline">DYNASTY DOMINANCE <span class="dd-tag">EXPERIMENTAL</span></div>'+
   '<h1>'+esc(TEAMS[id]).toUpperCase()+' <em>'+year+' PLAYERS</em></h1>'+
   '<p>Expected fantasy scoring from the same simulations used for the '+year+' team projection.</p></header>'+
   '<div class="dd-player-summary">'+
    '<div><span>TEAM MODEL PPG</span><strong>'+fmt(team.ppg)+'</strong></div>'+
    '<div><span>BOEK MODEL PPG</span><strong>'+fmt(book.ppg)+'</strong></div>'+
    '<div><span>2026 ROSTER PLAYERS</span><strong>'+fmt(actual.length,0)+'</strong></div>'+
    '<div><span>SIMULATED FUTURE PICKS</span><strong>'+fmt(future.length,0)+'</strong></div></div>'+
   '<div class="dd-warning" role="note"><strong>Future player estimates, not market-value forecasts</strong>'+
    '<span>Projected PPG comes from the dynasty scoring simulation. Market values shown are the current RosterAudit values, not estimated '+year+' resale values. Future rookies are unidentified draft slots.</span></div>'+
   '<section class="dd-panel dd-player-panel"><div class="dd-panel-heading"><div>'+
     '<span class="dd-overline">PLAYER OUTLOOK · '+year+'</span><h3>Expected fantasy scoring</h3></div>'+
     '<label class="dd-player-filter-label">POSITION <select id="ddPositionFilter" aria-label="Filter projected players by position">'+
      labels.map(p=>'<option value="'+p+'">'+(p==='ALL'?'All positions':p==='TBD'?'Future picks':p)+'</option>').join('')+
     '</select></label></div>'+
     '<div id="ddPlayerTable"></div>'+
     '<p class="dd-player-note">Scenario 10th–90th percentile ranges show model sensitivity, not validated confidence intervals. Future rookie entries are expected contributions of draft picks, not identified NFL players. Players are assumed to remain on their current dynasty franchise; the model does not simulate later trades.</p>'+
   '</section>'+
   '<div class="dd-player-navigation"><a href="#/dynasty-dominance/'+id+'/'+year+'">← BACK TO '+esc(TEAMS[id]).toUpperCase()+' '+year+'</a>'+
    '<a href="#/team/'+id+'">CURRENT TEAM ROSTER ↗</a></div>'+
   '</div>';
  node.innerHTML=head;
  const table=node.querySelector('#ddPlayerTable');
  const filter=node.querySelector('#ddPositionFilter');
  function draw(filterPos){
   const rows=positionRows(filterPos);
   const body=rows.map((p,i)=>{
    const name=p.projected_rookie?
      '<span class="dd-player-future">'+esc(p.name)+'</span>':
      '<a class="dd-player-anchor" href="#/player/'+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a>';
    const value=p.current_market_value==null?'—':fmt(p.current_market_value,0);
    return '<tr class="'+(p.projected_rookie?'is-projected-pick':'')+'">'+
     '<td class="dd-player-name"><span class="dd-player-rank">'+String(i+1).padStart(2,'0')+'</span>'+name+'</td>'+
     '<td><span class="dd-position">'+esc(p.pos||'TBD')+'</span></td>'+
     '<td>'+fmt(p.age)+'</td>'+
     '<td class="dd-player-ppg">'+fmt(p.ppg)+'</td>'+
     '<td class="dd-player-range">'+fmt(p.p10)+'–'+fmt(p.p90)+'</td>'+
     '<td class="dd-market-2026">'+value+'</td></tr>';
   }).join('');
   table.innerHTML='<div class="dd-player-scroll"><table class="dd-player-table">'+
    '<thead><tr><th>PLAYER / DRAFT SLOT</th><th>POS</th><th>AGE</th><th>'+year+' MODEL PPG</th>'+
     '<th>SCENARIO 10–90%</th><th>CURRENT MARKET VALUE</th></tr></thead>'+
    '<tbody>'+body+'</tbody></table></div>'+
    (!rows.length?'<p class="dd-player-empty">No projected players in this group.</p>':'')+
    '<div class="dd-player-count">'+rows.length+' displayed · '+projected.length+' projected player/draft slots</div>';
  }
  draw('ALL');
  if(filter)filter.addEventListener('change',e=>draw(labels.includes(e.target.value)?e.target.value:'ALL'));
 }

 async function render(id,year,view){
  const selected=TEAMS[+id]?+id:null;
  if([2027,2028,2029,2030,2031,2032].includes(+year))selectedYear=+year;
  if(!report){
   try{
    const response=await fetch('data/dynasty_dominance_projection.json',{cache:'no-store'});
    if(!response.ok)throw Error('Dynasty report is temporarily unavailable');
    const data=await response.json();
    if(data?.status!=='experimental_beta_not_calibrated'||!Array.isArray(data.years)||
       data.years.length!==6||!Array.isArray(data.teams)||data.teams.length!==10)
     throw Error('Dynasty projection data did not pass verification');
    report=data;
   }catch(err){
    const node=document.getElementById('app');
    if(node)node.innerHTML='<div class="dd-page"><div class="dd-back"><a href="#/more">← MORE</a></div>'+
     '<div class="dd-unavailable"><h2>Dynasty projections are unavailable</h2>'+
     '<p>The latest data did not pass validation. Existing FIG records remain available.</p>'+
     '<a href="#/dynasty">VIEW DYNASTY VALUES ↗</a></div></div>';
    console.warn('FIG Dynasty Dominance:',err);return;
   }
  }
  if(view==='players'&&selected){displayPlayers(selected,selectedYear);return;}
  display(selected);
 }
 window.figDynastyDominance=render;
 window.figDynastyDominanceInvalidate=()=>{report=null;};
})();
