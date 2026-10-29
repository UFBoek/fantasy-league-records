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
 var activePeriod='ALL';
 var displayed=new Set();
 var focus=null;
 var holder=null;
 var statusById={};
 var safeNumber=function(v){var n=Number(v);return Number.isFinite(n)?n:0;};
 var avatar=function(id){return '<img src="'+escapeHTML(OWNER_AVATAR_BY_ID[id]||'')+'" alt="" loading="lazy">';};
 function name(id){return escapeHTML(displayOwnerName('',id)||names[id]||String(id));}
 function tabs(){
  return '<nav class="dm-tabs" aria-label="Dynasty market sections">'+
   '<a class="active" href="#/stock-market">STOCK MARKET</a>'+
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
  var w=1060,h=430,left=77,right=145,top=41,bottom=65;
  if(points.length<2)return '<div class="dm-chart-empty"><strong>MARKET TRACKING HAS BEGUN</strong><span>Historical movement will appear after the second observed date.</span></div>';
  var series=[...selected].map(function(id){
   return {id:id,values:points.map(function(p){var t=historicTeam(p,id);return t?{date:p.date,value:safeNumber(t.total)}:null;}).filter(Boolean)};
  }).filter(function(s){return s.values.length;});
  if(!series.length)return '<div class="dm-chart-empty">Select a franchise to compare market value.</div>';
  var all=series.flatMap(function(s){return s.values.map(function(p){return p.value;});});
  var min=Math.min.apply(null,all),max=Math.max.apply(null,all);
  var rawSpread=Math.max(800,(max-min)*1.15);
  var target=Math.max(1,rawSpread/5),power=Math.pow(10,Math.floor(Math.log10(target)));
  var step=[1,2,2.5,5,10].map(function(n){return n*power;}).find(function(n){return n>=target;})||power*10;
  var ymin=Math.max(0,Math.floor((min-rawSpread*.075)/step)*step);
  var ymax=Math.ceil((max+rawSpread*.075)/step)*step;
  if(ymax-ymin<step*3){ymin=Math.max(0,ymin-step);ymax+=step;}
  var xMin=new Date(points[0].date+'T12:00:00Z').getTime();
  var xMax=new Date(points[points.length-1].date+'T12:00:00Z').getTime();
  var px=function(date){return left+(w-left-right)*(new Date(date+'T12:00:00Z').getTime()-xMin)/Math.max(1,xMax-xMin);};
  var py=function(value){return top+(h-top-bottom)*(ymax-value)/Math.max(1,ymax-ymin);};
  var short=function(value){
   if(Math.abs(value)>=1000){
    var k=value/1000;
    return (Math.abs(k-Math.round(k))<.001?k.toFixed(0):k.toFixed(1))+'k';
   }
   return fmt(value);
  };
  var out='<svg class="dm-stock-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Actual dated dynasty team valuations, in market points">';
  out+='<text x="'+left+'" y="18" class="dm-axis-title">DYNASTY VALUE · POINTS</text>';
  for(var tick=Math.ceil(ymin/step)*step;tick<=ymax+step*.01;tick+=step){
   var yy=py(tick);
   out+='<line class="dm-gridline" x1="'+left+'" y1="'+yy+'" x2="'+(w-right)+'" y2="'+yy+'"/>'+
      '<text class="dm-axis-label" text-anchor="end" x="'+(left-13)+'" y="'+(yy+5)+'">'+short(tick)+'</text>';
  }
  var dates=[0,Math.floor((points.length-1)/2),points.length-1].filter(function(v,i,a){return a.indexOf(v)===i;});
  dates.forEach(function(i){out+='<text class="dm-axis-label" text-anchor="middle" x="'+px(points[i].date)+'" y="'+(h-20)+'">'+ts(points[i].date)+'</text>';});
  var endpoints=[];
  series.forEach(function(line){
   var color=palette[(line.id-1)%palette.length];
   for(var j=1;j<line.values.length;j++){
    var from=line.values[j-1],to=line.values[j];
    var days=(new Date(to.date+'T12:00:00Z')-new Date(from.date+'T12:00:00Z'))/86400000;
    out+='<path d="M'+px(from.date).toFixed(2)+','+py(from.value).toFixed(2)+' L'+px(to.date).toFixed(2)+','+py(to.value).toFixed(2)+
      '" fill="none" stroke="'+color+'" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"'+(days>1.5?' stroke-dasharray="6 7"':'')+'/>';
   }
   var last=line.values[line.values.length-1],xx=px(last.date),yy=py(last.value);
   out+='<circle cx="'+xx+'" cy="'+yy+'" r="4.5" fill="'+color+'" stroke="#fff" stroke-width="1.5"/>';
   endpoints.push({id:line.id,y:yy,x:xx,color:color});
  });
  // Spread the on-chart direct labels so close-valued franchises stay legible.
  endpoints.sort(function(a,b){return a.y-b.y;});
  var gap=20,startY=top+9,endY=h-bottom-7;
  endpoints.forEach(function(e,i){e.labelY=Math.max(e.y,i?endpoints[i-1].labelY+gap:startY);});
  if(endpoints.length&&endpoints[endpoints.length-1].labelY>endY){
   var shift=endpoints[endpoints.length-1].labelY-endY;
   endpoints.forEach(function(e){e.labelY-=shift;});
  }
  endpoints.forEach(function(e){
   var labelX=w-right+14;
   out+='<path d="M'+e.x+','+e.y+' L'+(labelX-6)+','+e.labelY+'" fill="none" stroke="'+e.color+'" stroke-width="1.2" stroke-opacity=".55"/>'+
      '<text class="dm-end-label" x="'+labelX+'" y="'+(e.labelY+4)+'" fill="'+e.color+'">'+name(e.id)+'</text>';
  });
  return out+'</svg>';
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
  var header='<div class="dm-page">'+tabs()+
    '<div class="dm-heading"><div><span class="dm-kicker">FRANCHISE EQUITY TRACKER</span><h1>DYNASTY STOCK MARKET</h1></div>'+
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
  var focusCard=single?'<section class="dm-box dm-focus"><div class="dm-panel-head"><div><span>FRANCHISE PROFILE</span><h2>'+name(single.id)+' MARKET OVERVIEW</h2></div><a href="#/team/'+single.id+'">TEAM PROFILE →</a></div>'+
     '<div class="dm-focus-stats"><div><small>PLAYERS</small><strong>'+fmt(single.playerValue)+'</strong></div>'+
       '<div><small>FUTURE PICKS</small><strong>'+fmt(single.picks)+'</strong></div>'+
       '<div><small>LEAGUE WEALTH SHARE</small><strong>'+percent(wealth?single.value/wealth*100:0)+'</strong></div></div>'+
     '</section>':'';
  holder.innerHTML=header+'<section class="dm-box"><div>'+selector+'</div><div id="dmGraph"></div>'+legend+'</section>'+
   (focusCard||'')+
   '<section class="dm-box"><div class="dm-panel-head"><div><span>VALUATION CHANGE</span><h2>MARKET MOVERS</h2></div></div><div class="dm-movers" id="dmMovers"></div></section>'+
   '<p class="dm-footnote">Values: <a href="https://rosteraudit.com" target="_blank" rel="noopener noreferrer">RosterAudit</a> · Archive since Oct 9, 2026 · Dashed = missing dates · Future picks: FIG rules</p></div>';
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
 async function launch(mode,team){
  focus=Number.isInteger(Number(team))&&Number(team)>=1&&Number(team)<=10?Number(team):null;
  navActive('dynasty');
  await load(['raValues','currentRoster','currentPicks','draftPicks','standingsCareer']);
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
  activePeriod='ALL';
  displayed=new Set(focus?[focus]:entries.slice(0,4).map(function(t){return t.id;}));
  marketPage();
 }
 window.figDynastyMarket=launch;
})();