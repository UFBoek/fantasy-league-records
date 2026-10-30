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
 function linePlot(years,selected){
  const dims={left:40,right:900,top:22,bottom:247};
  const plotted=[1,6,selected].filter((id,i,arr)=>arr.indexOf(id)===i);
  const values=years.flatMap(y=>plotted.map(id=>ppg(report.seasons[y],id)?.ppg||0));
  const lo=Math.max(0,Math.floor((Math.min(...values)-15)/20)*20);
  const hi=Math.ceil((Math.max(...values)+15)/20)*20;
  const x=i=>dims.left+(dims.right-dims.left)*i/(years.length-1);
  const y=v=>dims.bottom-(v-lo)*(dims.bottom-dims.top)/Math.max(1,hi-lo);
  const ticks=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);
  return '<svg class="dd-chart-svg" viewBox="0 0 940 290" role="img" aria-label="Experimental PPG trajectories for Boek, Hayden and the selected franchise from 2027 to 2032">'+
   ticks.map(v=>'<line class="dd-chart-grid" x1="40" y1="'+y(v)+'" x2="900" y2="'+y(v)+'"/>'+
    '<text class="dd-chart-label" x="32" y="'+(y(v)+4)+'" text-anchor="end">'+Math.round(v)+'</text>').join('')+
   years.map((yr,i)=>'<text class="dd-chart-label" x="'+x(i)+'" y="272" text-anchor="middle">'+yr+'</text>').join('')+
   plotted.map(id=>{
    const stroke=COLORS[id],pts=years.map((yr,i)=>x(i)+','+y(ppg(report.seasons[yr],id).ppg)).join(' ');
    return '<polyline points="'+pts+'" fill="none" stroke="'+stroke+
     '" stroke-width="'+(id===selected?4:2.7)+'" stroke-linejoin="round" stroke-linecap="round"/>'+
     years.map((yr,i)=>'<circle cx="'+x(i)+'" cy="'+y(ppg(report.seasons[yr],id).ppg)+
      '" r="'+(id===selected?5:3)+'" fill="'+stroke+'" stroke="#0d1425" stroke-width="2"/>').join('');
   }).join('')+
   '</svg>';
 }
 function teamList(selected){
  const vals=[...report.teams].sort((a,b)=>ppg(report.seasons[selectedYear],b.id).ppg-ppg(report.seasons[selectedYear],a.id).ppg);
  return '<div class="dd-team-list">'+vals.map((t,i)=>'<a href="#/dynasty-dominance/'+t.id+
   '" class="dd-team-row'+(t.id===selected?' is-selected':'')+'"'+
   (t.id===selected?' aria-current="page"':'')+'>'+
   '<span class="dd-team-rank">'+String(i+1).padStart(2,'0')+'</span>'+
   '<span class="dd-team-avatar">'+avatar(t.id)+'</span>'+
   '<span class="dd-team-label"><strong>'+esc(t.name)+'</strong><small>'+fmt(t.current_ppg)+' current PPG</small></span>'+
   '<span class="dd-team-score"><strong>'+fmt(ppg(report.seasons[selectedYear],t.id).ppg)+'</strong><small>model PPG</small></span></a>').join('')+'</div>';
 }
 function summaryItem(label,value,detail){
  return '<div class="dd-metric"><span>'+esc(label)+'</span><strong>'+value+
   '</strong><small>'+esc(detail||'')+'</small></div>';
 }
 function gapRows(selected){
  const comparisons=report.years.map(year=>{
   const entry=report.seasons[year],book=ppg(entry,1).ppg,team=ppg(entry,selected).ppg;
   const challenger=entry.ranking.filter(x=>x.id!==1).sort((a,b)=>b.ppg-a.ppg)[0];
   return {year,book,team,bookGap:book-team,bestOther:challenger.ppg};
  });
  return '<div class="dd-year-table-wrap"><table class="dd-year-table"><thead><tr><th>YEAR</th><th>BOEK</th><th>'+esc(TEAMS[selected]).toUpperCase()+'</th><th>GAP TO BOEK</th><th>TOP CHALLENGER</th></tr></thead><tbody>'+
   comparisons.map(r=>'<tr class="'+(r.year===selectedYear?'is-active':'')+'">'+
    '<td><button type="button" class="dd-year-row-button" data-dd-year="'+r.year+'">'+r.year+'</button></td>'+
    '<td>'+fmt(r.book)+'</td><td>'+fmt(r.team)+'</td><td class="'+(r.bookGap>=0?'dd-pos':'dd-neg')+'">'+
    (selected===1?'—':sign(r.bookGap))+'</td><td>'+fmt(r.bestOther)+'</td></tr>').join('')+
   '</tbody></table></div>';
 }
 function display(selected){
  const node=document.getElementById('app');
  if(!node||!report)return;
  if(!report.years.includes(selectedYear))selectedYear=report.years[0];
  const t=report.teams.find(x=>x.id===selected),yr=report.seasons[selectedYear],peak=ppg(yr,selected);
  const book=ppg(yr,1),hayden=ppg(yr,6);
  const highest=yr.ranking[0],bookTop=yr.ranking.filter(x=>x.id!==1)[0];
  const future=report.years.map(year=>({year,p:ppg(report.seasons[year],selected).ppg}));
  const peakYear=[...future].sort((a,b)=>b.p-a.p)[0];
  const knownThrough=Number(report.assumptions?.known_pick_ownership_through)||2029;
  const known2027to30=Object.entries(t.draft_by_year).filter(([year])=>+year<=knownThrough)
    .reduce((sum,[,r])=>sum+r.known,0);
  const generated=report.generated_at?
   new Date(report.generated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
  const sep=' · ';
  node.innerHTML='<div class="dd-page">'+
   '<div class="dd-back"><a href="#/more">← MORE</a><span>FIG ANALYTICS / RESEARCH</span></div>'+
   '<header class="dd-hero"><div class="dd-overline"><span class="dd-pulse"></span> MODEL LAB <span class="dd-tag">BETA</span></div>'+
    '<h1>DYNASTY <em>DOMINANCE</em></h1>'+
    '<p>Projected scoring strength across the next six seasons.</p>'+
    '<div class="dd-meta"><span>2026 THROUGH WEEK '+report.source_week+'</span><span>UPDATED '+esc(generated)+'</span><span>'+fmt(report.runs,0)+' SIMULATIONS</span></div>'+
   '</header>'+
   '<div class="dd-warning" role="note"><strong>Experimental projections</strong><span>Long-term accuracy has not been validated. These are model scenarios, not championship probabilities or guaranteed future scoring.</span></div>'+
   '<section class="dd-main">'+
    '<div class="dd-main-top"><div><span class="dd-overline">SCORING OUTLOOK</span><h2>'+esc(TEAMS[selected])+' <span>through 2032</span></h2></div>'+
      '<div class="dd-view-team"><span>FRANCHISE</span><select id="ddTeamSelect" aria-label="Choose franchise">'+
        report.teams.map(x=>'<option value="'+x.id+'"'+(x.id===selected?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div></div>'+
    '<div class="dd-metrics">'+
      summaryItem(selectedYear+' MODEL PPG',fmt(peak.ppg),'Scenario scoring strength')+
      summaryItem('2026 ACTUAL PPG',fmt(t.current_ppg),'Through completed Week '+report.source_week)+
      summaryItem('GAP VS BOEK',selected===1?'—':sign(peak.ppg-book.ppg),'Model PPG, selected year')+
      summaryItem('PEAK MODEL YEAR',String(peakYear.year),fmt(peakYear.p)+' projected PPG')+
    '</div>'+
    '<div class="dd-chart-head"><span>SEASON TRAJECTORY</span><div class="dd-legend">'+
      [1,6,selected].filter((id,i,a)=>a.indexOf(id)===i).map(id=>
       '<span><i style="background:'+COLORS[id]+'"></i>'+esc(TEAMS[id])+'</span>').join('')+'</div></div>'+
    '<div class="dd-chart">'+linePlot(report.years,selected)+'</div>'+
    '<div class="dd-year-selector" role="group" aria-label="Forecast season">'+report.years.map(y=>button(y,y===selectedYear)).join('')+'</div>'+
   '</section>'+
   '<div class="dd-columns">'+
    '<section class="dd-panel"><div class="dd-panel-heading"><div><span class="dd-overline">LEAGUE TABLE</span><h3>'+selectedYear+' projected order</h3></div><span class="dd-mini">MODEL PPG</span></div>'+
      teamList(selected)+'</section>'+
    '<section class="dd-panel"><div class="dd-panel-heading"><div><span class="dd-overline">ROSTER PROFILE</span><h3>'+esc(t.name)+'</h3></div>'+
     '<a class="dd-link" href="#/team/'+selected+'">TEAM PAGE ↗</a></div>'+
     '<div class="dd-identity">'+avatar(selected)+'<div><strong>'+esc(TEAMS[selected])+'</strong><small>'+t.roster_count+' eligible NFL players</small></div></div>'+
     '<div class="dd-profile-stats">'+
      '<div><span>TOP-10 VALUE-WEIGHTED AGE</span><b>'+fmt(t.top10_value_weighted_age)+'</b></div>'+
      '<div><span>KNOWN FUTURE DRAFT PICKS</span><b>'+fmt(known2027to30,0)+'</b></div>'+
      '<div><span>KNOWN FIRST-ROUND PICKS</span><b>'+fmt(t.known_first_rounders,0)+'</b></div>'+
      '<div><span>'+selectedYear+' SCORING RANK</span><b>#'+(yr.ranking.findIndex(x=>x.id===selected)+1)+'</b></div>'+
     '</div>'+
     '<div class="dd-draft-title">PICK CAPITAL <small>KNOWN THROUGH '+knownThrough+'</small></div>'+
     '<div class="dd-draft-grid">'+[2027,2028,2029,2030].map(y=>{
      const d=t.draft_by_year[y];
      return '<div><span>'+y+'</span><strong>'+(d.known||d.projected_assumed)+'</strong><small>'+
        (d.projected_assumed ? (d.known?d.known+' known · '+d.projected_assumed+' assumed':'assumed') : d.round1+' firsts')+'</small></div>';
     }).join('')+'</div>'+
     '<a class="dd-related" href="#/dynasty">VIEW ROSTER MARKET VALUES <span>↗</span></a>'+
     '<a class="dd-related" href="#/stock-market">VIEW DYNASTY STOCK MARKET <span>↗</span></a>'+
    '</section>'+
   '</div>'+
   '<section class="dd-panel dd-compare"><div class="dd-panel-heading"><div><span class="dd-overline">SIX-SEASON COMPARISON</span><h3>Boek vs '+esc(TEAMS[selected])+'</h3></div>'+
    '<span class="dd-mini">PPG / MODEL</span></div>'+gapRows(selected)+'</section>'+
   '<details class="dd-details"><summary>Model notes and limitations <span>+</span></summary>'+
    '<div class="dd-details-body"><p>Current data: FIG weekly team scoring, roster ownership and player scoring; RosterAudit values; actual 2027–'+knownThrough+' original-franchise draft holdings. Later original picks are assumed until real ownership is available.</p>'+
    '<p>Future player production depends on provisional aging, rookie-development, injury and roster assumptions. The model does not invent future trades or award any manager a trading-skill bonus. The historical one-year backtests have not consistently outperformed a simple roster baseline.</p>'+
    '<p>Projected PPG is a stylized lineup-strength estimate. It is not the number of points a franchise is guaranteed to score. The service refreshes its report from new FIG data; no live sports provider is queried when opening this page.</p>'+
    '<a href="#/historical-predictions">HISTORICAL PROJECTIONS ↗</a></div></details>'+
   '<footer class="dd-foot">FROMM IS GARBAGE <span>•</span> RESEARCH / 2026 <span>•</span> VERSION '+esc(report.model_version)+'</footer>'+
  '</div>';
  node.querySelectorAll('[data-dd-year]').forEach(b=>b.addEventListener('click',()=>{
   selectedYear=Number(b.dataset.ddYear);display(selected);
  }));
  node.querySelector('#ddTeamSelect').addEventListener('change',e=>{
   const id=Number(e.target.value);if(TEAMS[id])location.hash='#/dynasty-dominance/'+id;
  });
 }
 async function render(id){
  const selected=TEAMS[+id]?+id:1;
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
  display(selected);
 }
 window.figDynastyDominance=render;
 window.figDynastyDominanceInvalidate=()=>{report=null;};
})();
