/* FIG Dynasty Market v209. The existing raTeamData and scoring model remain authoritative. */
(function () {
 'use strict';
 var palette=['#18a888','#4678d4','#dfae48','#c96b65','#986add','#399aad','#db7d37','#5b8a5c','#e16eae','#64748b'];
 var names={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
 var escapeHTML=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];});};
 var fmt=function(n){return Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});};
 var signed=function(n){return (n>0?'+':'')+fmt(n);};
 var percent=function(n){return Number(n||0).toFixed(1)+'%';};
 var ts=function(date){var s=String(date||'');return s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'—';};
 var firstId=function(obj){return Number(obj.franchise_id);};
 var dataHistory=[];
 var entries=[];
 var currentMode='market';
 var activePeriod='ALL';
 var displayed=new Set();
 var focus=null;
 var holder=null;
 var statusById={};
 var safeNumber=function(v){var n=Number(v);return Number.isFinite(n)?n:0;};
 var avatar=function(id){return '<img src="'+escapeHTML(OWNER_AVATAR_BY_ID[id]||'')+'" alt="" loading="lazy">';};
 function name(id){return escapeHTML(displayOwnerName('',id)||names[id]||String(id));}
 function tabs(mode){
  return '<nav class="dm-tabs" aria-label="Dynasty market sections">'+
   '<a class="'+(mode==='market'?'active':'')+'" href="#/stock-market">STOCK MARKET</a>'+
   '<a class="'+(mode==='window'?'active':'')+'" href="#/championship-window">CHAMPIONSHIP WINDOW</a>'+
   '<a href="#/dynasty">ROSTER VALUES</a></nav>';
 }
 function teamRow(t, extra){
  return '<a class="dm-team-link" href="#/stock-market/'+t.id+'">'+avatar(t.id)+
   '<span>'+name(t.id)+'<small>'+escapeHTML(extra||'VIEW FRANCHISE STOCK')+'</small></span><b aria-hidden="true">›</b></a>';
 }
 function latest(){
  var records=(DATA.standingsCareer||[]).map(function(t){
   var id=firstId(t),value=raTeamData(id);
   return {id:id,name:displayOwnerName(t.owner_name,id),value:value.knownTotal,
    playerValue:value.playerValue,picks:value.pickValue,known:value.allValued,
    picksCount:value.picks.length,roster:value.roster,asset:value};
  });
  return records.sort(function(a,b){return b.value-a.value||a.id-b.id;});
 }
 function historicTeam(snapshot,id){
  return (snapshot&&snapshot.teams||[]).find(function(t){return Number(t.franchise_id)===id;})||null;
 }
 function comparisonPeriod(){
  if(!dataHistory.length)return [];
  if(activePeriod==='ALL')return dataHistory;
  var days={'7D':7,'30D':30,'90D':90}[activePeriod]||3650;
  var end=new Date(dataHistory[dataHistory.length-1].date+'T12:00:00Z').getTime();
  return dataHistory.filter(function(s){return end-new Date(s.date+'T12:00:00Z').getTime()<=days*86400000;});
 }
 function change(t,first,last){
  var a=historicTeam(first,t.id),b=historicTeam(last,t.id);
  return a&&b?safeNumber(b.total)-safeNumber(a.total):null;
 }
 function chart(points,selected){
  var w=960,h=360,padLeft=86,padRight=28,padTop=22,padBottom=58;
  if(points.length<2){
   return '<div class="dm-chart-empty"><strong>MARKET TRACKING HAS BEGUN</strong>'+
     '<span>Historical movement will appear after the second daily snapshot. No earlier prices are estimated.</span></div>';
  }
  var all=points.flatMap(function(p){return [...selected].map(function(id){return historicTeam(p,id);}).filter(Boolean).map(function(t){return safeNumber(t.total);});});
  if(!all.length)return '<div class="dm-chart-empty">Select a franchise to compare its market value.</div>';
  var lo=Math.min.apply(null,all),hi=Math.max.apply(null,all),margin=Math.max(500,(hi-lo)*.13);lo=Math.max(0,lo-margin);hi+=margin;
  var xmin=new Date(points[0].date+'T12:00:00Z').getTime(),xmax=new Date(points[points.length-1].date+'T12:00:00Z').getTime();
  var x=function(date){return padLeft+(w-padLeft-padRight)*(new Date(date+'T12:00:00Z').getTime()-xmin)/Math.max(1,xmax-xmin);};
  var y=function(val){return padTop+(h-padTop-padBottom)*(hi-val)/Math.max(1,hi-lo);};
  var s='<svg class="dm-stock-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Daily franchise dynasty valuation history">';
  for(var i=0;i<5;i++){
   var yy=padTop+(h-padTop-padBottom)*i/4;
   s+='<line x1="'+padLeft+'" x2="'+(w-padRight)+'" y1="'+yy+'" y2="'+yy+'" class="dm-gridline"/>'+
      '<text x="'+(padLeft-12)+'" y="'+(yy+4)+'" text-anchor="end" class="dm-axis-label">'+fmt(hi-(hi-lo)*i/4)+'</text>';
  }
  [0,Math.floor((points.length-1)/2),points.length-1].filter(function(v,i,a){return a.indexOf(v)===i;}).forEach(function(i){
   s+='<text x="'+x(points[i].date)+'" y="'+(h-18)+'" text-anchor="middle" class="dm-axis-label">'+ts(points[i].date)+'</text>';
  });
  [...selected].forEach(function(id){
   var line=points.map(function(p){var t=historicTeam(p,id);return t?{date:p.date,v:safeNumber(t.total)}:null;}).filter(Boolean);
   if(!line.length)return;
   var path=line.map(function(p,i){return(i?'L':'M')+x(p.date).toFixed(2)+','+y(p.v).toFixed(2);}).join(' ');
   s+='<path d="'+path+'" fill="none" stroke="'+palette[(id-1)%palette.length]+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
   var last=line[line.length-1];
   s+='<circle cx="'+x(last.date)+'" cy="'+y(last.v)+'" r="5" fill="'+palette[(id-1)%palette.length]+'" stroke="#fff" stroke-width="2"/>';
  });
  return s+'</svg>';
 }
 function renderGraph(){
  var area=document.getElementById('dmGraph');
  if(!area)return;
  var p=comparisonPeriod();
  area.innerHTML=chart(p,displayed);
  var periodStart=p[0],periodEnd=p[p.length-1];
  var summary=document.getElementById('dmMovers');
  if(summary){
   var sorted=entries.map(function(t){return {t:t,d:change(t,periodStart,periodEnd)};})
     .filter(function(x){return x.d!==null;}).sort(function(a,b){return b.d-a.d;});
   summary.innerHTML=sorted.length>0 && p.length>1 ?
     sorted.map(function(x){return '<a href="#/stock-market/'+x.t.id+'">'+
       avatar(x.t.id)+'<b>'+name(x.t.id)+'</b><span class="'+(x.d>=0?'up':'down')+'">'+signed(x.d)+'</span></a>';}).join('') :
     '<p class="dm-pending-note">Value movers appear once two different dates have been recorded.</p>';
  }
 }
 function marketPage(){
  var wealth=entries.reduce(function(s,t){return s+t.value;},0);
  var now=dataHistory[dataHistory.length-1],prior=dataHistory.length>1?dataHistory[dataHistory.length-2]:null;
  var lastDate=now?ts(now.date):raDate();
  var top=entries[0];
  var header='<div class="dm-page">'+tabs('market')+
    '<div class="dm-heading"><div><span class="dm-kicker">FRANCHISE EQUITY TRACKER</span><h1>DYNASTY STOCK MARKET</h1><p>Current RosterAudit player prices + FIG future-pick rules</p></div>'+
    '<span class="dm-as-of">LAST MARKET SNAPSHOT<br><b>'+escapeHTML(lastDate)+'</b></span></div>'+
    '<div class="dm-overview">'+
     '<div><small>LEAGUE MARKET VALUE</small><strong>'+fmt(wealth)+'</strong><span>All 10 franchises</span></div>'+
     '<div><small>MOST VALUABLE FRANCHISE</small><strong>'+name(top.id)+'</strong><span>'+fmt(top.value)+' dynasty points</span></div>'+
     '<div><small>MARKET LEADER SHARE</small><strong>'+percent(wealth?top.value/wealth*100:0)+'</strong><span>'+name(top.id)+' of league capital</span></div></div>';
  var single=focus!==null?entries.find(function(t){return t.id===focus;}):null;
  var selector='<div class="dm-panel-head"><div><span>MARKET PERFORMANCE</span><h2>'+(single?name(single.id)+' STOCK HISTORY':'FRANCHISE VALUE HISTORY')+'</h2></div><div class="dm-periods">'+
    ['7D','30D','90D','ALL'].map(function(k){return '<button data-dm-period="'+k+'" class="'+(activePeriod===k?'active':'')+'" type="button">'+k+'</button>';}).join('')+
    '</div></div>';
  var legend='<div class="dm-legend">'+entries.map(function(t){
   return '<button type="button" data-dm-team="'+t.id+'" class="'+(displayed.has(t.id)?'selected':'')+'"><i style="background:'+palette[(t.id-1)%palette.length]+'"></i>'+name(t.id)+'</button>';
  }).join('')+'</div>';
  var table='<div class="dm-panel-head"><div><span>LIVE ASSET RANKINGS</span><h2>FRANCHISE MARKET CAP</h2></div></div>'+
   '<div class="dm-wealth-list">'+entries.map(function(t,i){
    var old=prior&&historicTeam(prior,t.id),delta=old?t.value-safeNumber(old.total):null;
    return '<a href="#/stock-market/'+t.id+'" class="dm-wealth-row">'+
     '<span class="dm-place">#'+(i+1)+'</span>'+avatar(t.id)+
     '<span class="dm-wealth-team"><strong>'+name(t.id)+'</strong><small>'+fmt(t.playerValue)+' players · '+fmt(t.picks)+' picks</small></span>'+
     '<span class="dm-wealth-stat"><strong>'+fmt(t.value)+'</strong><small class="'+(delta===null?'':delta>=0?'up':'down')+'">'+
       (delta===null?'Awaiting change':signed(delta)+' since prior day')+'</small></span></a>';
   }).join('')+'</div>';
  var focusCard=single?'<section class="dm-box dm-focus"><div class="dm-panel-head"><div><span>FRANCHISE PROFILE</span><h2>'+name(single.id)+' MARKET OVERVIEW</h2></div><a href="#/team/'+single.id+'">TEAM PROFILE →</a></div>'+
     '<div class="dm-focus-stats"><div><small>PLAYERS</small><strong>'+fmt(single.playerValue)+'</strong></div>'+
       '<div><small>FUTURE PICKS</small><strong>'+fmt(single.picks)+'</strong></div>'+
       '<div><small>LEAGUE WEALTH SHARE</small><strong>'+percent(wealth?single.value/wealth*100:0)+'</strong></div></div>'+
     '<a class="dm-focus-link" href="#/championship-window">VIEW CHAMPIONSHIP WINDOW →</a></section>':'';
  holder.innerHTML=header+'<section class="dm-box"><div>'+selector+'</div><div id="dmGraph"></div>'+legend+'</section>'+
   (focusCard||'')+'<section class="dm-box">'+table+'</section>'+
   '<section class="dm-box"><div class="dm-panel-head"><div><span>VALUATION CHANGE</span><h2>MARKET MOVERS</h2></div></div><div class="dm-movers" id="dmMovers"></div></section>'+
   '<p class="dm-footnote">Values by <a href="https://rosteraudit.com" target="_blank" rel="noopener noreferrer">RosterAudit.com</a>. Future picks use the league’s existing valuation rules. Trends start with actual dated snapshots; no historical market prices are reconstructed. Missing pick tiers are excluded from the known total.</p></div>';
  holder.querySelectorAll('[data-dm-period]').forEach(function(button){
   button.addEventListener('click',function(){
    activePeriod=button.dataset.dmPeriod;
    holder.querySelectorAll('[data-dm-period]').forEach(function(el){el.classList.toggle('active',el===button);});
    renderGraph();
   });
  });
  holder.querySelectorAll('[data-dm-team]').forEach(function(button){
   button.addEventListener('click',function(){
    var id=Number(button.dataset.dmTeam);
    if(displayed.has(id)){if(displayed.size>1)displayed.delete(id);}
    else displayed.add(id);
    button.classList.toggle('selected',displayed.has(id));
    renderGraph();
   });
  });
  renderGraph();
 }
 function projectedPPG(){
  var standings=DATA.currentStandings||[];
  var season=Math.max.apply(null,standings.map(function(r){return Number(r.season);}));
  var seasonScores=(DATA.weeklyRanks||[]).filter(function(r){return Number(r.season)===season&&Number(r.week)<=14&&Number.isFinite(Number(r.points_for));});
  var all=seasonScores.map(function(r){return Number(r.points_for);});
  var avg=all.reduce(function(a,b){return a+b;},0)/Math.max(1,all.length);
  var result={};
  entries.forEach(function(t){
   var scores=seasonScores.filter(function(r){return Number(r.franchise_id)===t.id;})
     .sort(function(a,b){return Number(a.week)-Number(b.week);}).map(function(r){return Number(r.points_for);});
   if(scores.length<5){result[t.id]=null;return;}
   var full=scores.reduce(function(a,b){return a+b;},0)/scores.length;
   var recent=scores.slice(-3).reduce(function(a,b){return a+b;},0)/3;
   result[t.id]=Math.max(35,Math.min(300,.65*full+.35*recent));
  });
  return {byId:result,season:season,completedWeeks:Math.floor(all.length/10)};
 }
 function windowScores(){
  var model=projectedPPG();
  var byStrength=entries.slice().sort(function(a,b){return (model.byId[b.id]||0)-(model.byId[a.id]||0);});
  var byMarket=entries.slice().sort(function(a,b){return b.value-a.value;});
  var ranks={},marketRanks={};
  byStrength.forEach(function(t,i){ranks[t.id]=i+1;});
  byMarket.forEach(function(t,i){marketRanks[t.id]=i+1;});
  var isReady=entries.every(function(t){return model.byId[t.id]!==null;});
  var rows=entries.map(function(t){
   var sr=ranks[t.id],mr=marketRanks[t.id],label,klass;
   if(!isReady){label='Awaiting week 5';klass='neutral';}
   else if(sr<=4&&mr<=4){label='Dynasty Juggernaut';klass='elite';}
   else if(sr<=4){label='Win-Now Contender';klass='now';}
   else if(mr<=4){label='Rising Contender';klass='rise';}
   else if(sr>=8&&mr>=8){label='Rebuild Needed';klass='rebuild';}
   else{label='Middle of the Pack';klass='neutral';}
   return {t:t,ppg:model.byId[t.id],strengthRank:sr,marketRank:mr,label:label,klass:klass};
  }).sort(function(a,b){return a.strengthRank-b.strengthRank;});
  return {rows:rows,model:model,ready:isReady};
 }
 function scatter(scores){
  var rows=scores.rows,w=960,h=460,p={l:94,r:46,t:40,b:92};
  var vals=rows.map(function(r){return r.ppg;}),assets=rows.map(function(r){return r.t.value;});
  var minx=Math.floor((Math.min.apply(null,vals)-10)/10)*10,maxx=Math.ceil((Math.max.apply(null,vals)+10)/10)*10;
  var miny=Math.max(0,Math.min.apply(null,assets)*.80),maxy=Math.max.apply(null,assets)*1.12;
  var x=function(v){return p.l+(v-minx)/Math.max(1,maxx-minx)*(w-p.l-p.r);};
  var y=function(v){return h-p.b-(v-miny)/Math.max(1,maxy-miny)*(h-p.t-p.b);};
  var midx=(vals.slice().sort(function(a,b){return a-b;})[4]+vals.slice().sort(function(a,b){return a-b;})[5])/2;
  var midy=(assets.slice().sort(function(a,b){return a-b;})[4]+assets.slice().sort(function(a,b){return a-b;})[5])/2;
  var out='<svg viewBox="0 0 '+w+' '+h+'" class="dm-window-chart" role="img" aria-label="Franchise current scoring strength versus dynasty asset value">';
  for(var i=0;i<5;i++){var yy=p.t+(h-p.t-p.b)*i/4;
   out+='<line x1="'+p.l+'" x2="'+(w-p.r)+'" y1="'+yy+'" y2="'+yy+'" class="dm-gridline"/>'+
   '<text x="'+(p.l-13)+'" y="'+(yy+4)+'" text-anchor="end" class="dm-axis-label">'+fmt(maxy-(maxy-miny)*i/4)+'</text>';
  }
  for(var j=0;j<5;j++){var xx=p.l+(w-p.l-p.r)*j/4;
   out+='<text x="'+xx+'" y="'+(h-55)+'" text-anchor="middle" class="dm-axis-label">'+fmt(minx+(maxx-minx)*j/4)+'</text>';
  }
  out+='<line x1="'+x(midx)+'" x2="'+x(midx)+'" y1="'+p.t+'" y2="'+(h-p.b)+'" stroke="#aebbc7" stroke-dasharray="7 6" />'+
   '<line x1="'+p.l+'" x2="'+(w-p.r)+'" y1="'+y(midy)+'" y2="'+y(midy)+'" stroke="#aebbc7" stroke-dasharray="7 6" />'+
   '<text x="'+(w/2)+'" y="'+(h-20)+'" text-anchor="middle" class="dm-axis-title">CURRENT MODEL PPG →</text>'+
   '<text x="25" y="'+(h/2)+'" transform="rotate(-90 25 '+(h/2)+')" text-anchor="middle" class="dm-axis-title">DYNASTY MARKET VALUE →</text>';
  rows.forEach(function(r){
   var cx=x(r.ppg),cy=y(r.t.value),color=palette[(r.t.id-1)%palette.length];
   out+='<a href="#/team/'+r.t.id+'" aria-label="'+name(r.t.id)+' team profile">'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="12" fill="'+color+'" stroke="#fff" stroke-width="3"/>'+
    '<text x="'+cx+'" y="'+(cy-19)+'" text-anchor="middle" class="dm-point-name">'+name(r.t.id)+'</text></a>';
  });
  return out+'</svg>';
 }
 function windowPage(){
  var info=windowScores();
  var cards=info.rows.map(function(r){
   return '<a class="dm-window-row" href="#/team/'+r.t.id+'"><span class="dm-window-avatar">'+avatar(r.t.id)+'</span>'+
   '<span class="dm-window-name"><strong>'+name(r.t.id)+'</strong><small>Model PPG rank #'+(info.ready?r.strengthRank:'—')+' · Market rank #'+r.marketRank+'</small></span>'+
   '<span class="dm-window-scores"><strong>'+(r.ppg===null?'—':r.ppg.toFixed(1))+'</strong><small>'+fmt(r.t.value)+' VALUE</small></span>'+
   '<span class="dm-status '+r.klass+'">'+r.label+'</span></a>';
  }).join('');
  holder.innerHTML='<div class="dm-page">'+tabs('window')+
   '<div class="dm-heading"><div><span class="dm-kicker">CURRENT PERFORMANCE × FUTURE CAPITAL</span><h1>CHAMPIONSHIP WINDOW</h1>'+
   '<p>Two distinct rankings: model scoring strength and current dynasty wealth</p></div>'+
   '<a class="dm-calculator" href="#/playoff-calculator">2026 TITLE ODDS →</a></div>'+
   '<div class="dm-overview"><div><small>SCORING MODEL</small><strong>65 / 35</strong><span>Full season / last three</span></div>'+
   '<div><small>SCORING SAMPLE</small><strong>'+info.model.completedWeeks+' WEEKS</strong><span>Completed regular-season weeks</span></div>'+
   '<div><small>FUTURE STRENGTH PROXY</small><strong>ASSET VALUE</strong><span>RosterAudit + priced picks</span></div></div>'+
   '<section class="dm-box"><div class="dm-panel-head"><div><span>LEAGUE POSITIONING</span><h2>WHO CAN WIN NOW AND LATER?</h2></div></div>'+
   (info.ready?scatter(info):'<div class="dm-chart-empty"><strong>INSUFFICIENT COMPLETED GAMES</strong><span>Current-strength classifications begin after five completed regular-season weeks.</span></div>')+
   '<p class="dm-panel-caption">Horizontal axis: model points per game. Vertical axis: total dynasty asset valuation. Dashed lines mark the league medians; they are not championship probabilities.</p></section>'+
   '<section class="dm-box"><div class="dm-panel-head"><div><span>FRANCHISE OUTLOOK</span><h2>CHAMPIONSHIP WINDOW INDEX</h2></div></div>'+
    '<div class="dm-window-list">'+cards+'</div></section>'+
   '<section class="dm-box dm-method"><div class="dm-panel-head"><div><span>HOW THE INDEX WORKS</span><h2>METHODOLOGY</h2></div></div>'+
    '<p><b>Current strength</b> is the same 65% full-season / 35% last-three-game projected PPG formula used by the Playoff Calculator, calculated from official completed weeks. It never uses fantasy schedule strength or roster market value.</p>'+
    '<p><b>Long-term capital</b> is today’s dynasty asset value, including future picks under the existing league-specific pick rules. It measures assets, not guaranteed future wins.</p>'+
    '<p><b>Labels</b> are rank-based: top four in both rankings are Dynasty Juggernauts; top four in scoring alone are Win-Now Contenders; top four in market alone are Rising Contenders; bottom three in both need a rebuild; other franchises are Middle of the Pack.</p>'+
    '<p>No invented 2027–2029 championship probabilities are shown. For actual current-season playoff and title odds, use the <a href="#/playoff-calculator">Playoff Calculator</a>.</p></section>'+
   '<p class="dm-footnote">Roster values by <a href="https://rosteraudit.com" target="_blank" rel="noopener noreferrer">RosterAudit.com</a> · Market prices are current estimates, not guaranteed outcomes.</p></div>';
 }
 async function launch(mode,team){
  currentMode=mode==='window'?'window':'market';focus=Number.isInteger(Number(team))&&Number(team)>=1&&Number(team)<=10?Number(team):null;
  navActive('dynasty');
  await load(['raValues','currentRoster','currentPicks','draftPicks','standingsCareer','weeklyRanks','currentStandings']);
  holder=document.getElementById('app');
  if(!raReady()){
   holder.innerHTML='<section class="dm-page"><div class="dm-chart-empty">Dynasty values are temporarily unavailable. Awaiting a validated RosterAudit refresh.</div></section>';
   return;
  }
  entries=latest();
  dataHistory=[];
  try {
   var res=await fetch('data/dynasty_market_history.json',{cache:'no-store'});
   if(res.ok){var payload=await res.json();if(payload.version===1&&Array.isArray(payload.snapshots)){dataHistory=payload.snapshots.filter(function(s){
    return s&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&Array.isArray(s.teams)&&s.teams.length===10;
   }).sort(function(a,b){return a.date.localeCompare(b.date);});}}
  }catch(e){console.warn('Dynasty history unavailable, showing current values only:',e);}
  if(currentMode==='window')windowPage();
  else {
   activePeriod='ALL';
   displayed=new Set(focus?[focus]:entries.slice(0,4).map(function(t){return t.id;}));
   marketPage();
  }
 }
 window.figDynastyMarket=launch;
})();