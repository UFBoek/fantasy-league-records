/* Historical predictions: date-cutoff, read-only retrospective probabilities. */
(function(){
'use strict';
var N=8000, timelineN=4000, FIRST_WEEK=5, oddsCache={}, scoresCache={}, scheduleCache={};
var currentYear=2026,currentWeek=7,selectedId=1,selectedMetric='champ';
var fmt=function(n){return Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});};
var p100=function(n){return (100*(n||0)).toFixed(1)+'%';};
var safe=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});};
var rnd=function(x){return Math.round(x*100)/100;};
var clip=function(x,a,b){return Math.max(a,Math.min(b,x));};
var title=function(id){return displayOwnerName('',id);};
var rosterIds=function(){return [1,2,3,4,5,6,7,8,9,10];};
var settings=function(year){
 var row=(DATA.leagueSettings||[]).find(function(s){return +s.season===year;})||{},config={};
 try{config=JSON.parse(row.settings_json||'{}');}catch(e){}
 return {leagueId:String(row.league_id||''),spots:+config.playoff_teams||0,start:+config.playoff_week_start||15,count:+config.num_teams||10};
};
var allRegular=function(year){
 return (DATA.allGames||[]).filter(function(g){return +g.season===year && g.game_type==='Regular Season' && +g.week>=1 && +g.week<=14;});
};
var completeWeek=function(year){
 var history=(DATA.weeklyRanks||[]).filter(function(x){return +x.season===year && +x.week<=14;});
 var completed=0;
 for(var w=1;w<=14;w++){
  if(history.filter(function(x){return +x.week===w && Number.isFinite(+x.points_for);}).length!==10)break;
  completed=w;
 }
 return completed;
};
function mean(a){return a.length?a.reduce(function(s,x){return s+x;},0)/a.length:0;}
function rand(seed){var v=seed>>>0;return function(){v=(Math.imul(v,1664525)+1013904223)>>>0;return (v+.5)/4294967296;};}
function gauss(r){return Math.sqrt(-2*Math.log(Math.max(1e-9,r())))*Math.cos(6.283185307179586*r());}
function cdf(x){
 var z=Math.abs(x),t=1/(1+.2316419*z),d=.3989422804014327*Math.exp(-z*z/2);
 var result=1-d*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
 return x>=0?result:1-result;
}
function forecast(year,week){
 // Do not calculate predictions from fewer than four completed weeks.
 if(week<FIRST_WEEK||week>15)return null;
 var key=year+':'+week;
 if(scoresCache[key])return scoresCache[key];
 var ids=rosterIds(),history=DATA.weeklyRanks||[];
 var current=history.filter(function(x){return +x.season===year && +x.week<week && +x.week>=1 && +x.week<=14;});
 var previous=history.filter(function(x){return +x.season===year-1 && +x.week>=1 && +x.week<=14;});
 var pooledVariance=0,pooledCount=0;
 ids.forEach(function(id){
  var xs=current.filter(function(x){return +x.franchise_id===id;}).map(function(x){return +x.points_for;});
  var m=mean(xs);xs.forEach(function(x){pooledVariance+=(x-m)*(x-m);pooledCount++;});
 });
 var poolSd=pooledCount>10?Math.sqrt(pooledVariance/pooledCount):26;
 var result={};
 ids.forEach(function(id){
  var scores=current.filter(function(x){return +x.franchise_id===id;}).sort(function(a,b){return +a.week-+b.week;}).map(function(x){return +x.points_for;});
  var prior=previous.filter(function(x){return +x.franchise_id===id;}).sort(function(a,b){return +a.week-+b.week;}).map(function(x){return +x.points_for;});
  var season=mean(scores),recent=mean(scores.slice(-3));
  var m=clip(.65*season+.35*recent,35,300);
  var currentWindow=scores.slice(-8),missing=Math.max(0,8-currentWindow.length),past=prior.slice(-missing||prior.length);
  if(!missing)past=[];
  var cavg=mean(currentWindow),pavg=mean(prior),sq=0;
  currentWindow.forEach(function(x){sq+=(x-cavg)*(x-cavg);});
  past.forEach(function(x){sq+=(x-pavg)*(x-pavg);});
  var size=currentWindow.length+past.length;
  // For a first-year or thin window, preserve uncertainty without using later scores.
  var sd=size>=5?Math.sqrt(sq/size):Math.sqrt((sq+Math.max(0,5-size)*poolSd*poolSd)/Math.max(5,size));
  result[id]={id:id,mean:rnd(m),sd:rnd(clip(sd,12,65)),season:season,recent:recent,samples:size,priorSamples:past.length};
 });
 scoresCache[key]=result;
 return result;
}
function standings(year,week){
 var rows=Object.fromEntries(rosterIds().map(function(id){return [id,{id:id,wins:0,losses:0,ties:0,pf:0}];}));
 allRegular(year).forEach(function(g){
  if(+g.week>=week)return;
  var a=rows[+g.franchise_1],b=rows[+g.franchise_2];
  if(!a||!b)return;
  var x=+g.score_1,y=+g.score_2;a.pf+=x;b.pf+=y;
  if(x>y){a.wins++;b.losses++;}else if(y>x){b.wins++;a.losses++;}else{a.ties++;b.ties++;}
 });
 return Object.values(rows);
}
function ordered(a,b){return (b.wins+.5*b.ties)-(a.wins+.5*a.ties)||b.pf-a.pf||a.id-b.id;}
function historicalSchedule(year){
 var weeks={};
 allRegular(year).forEach(function(g){
  var w=+g.week;if(!weeks[w])weeks[w]=[];
  weeks[w].push({a:+g.franchise_1,b:+g.franchise_2,scoreA:+g.score_1,scoreB:+g.score_2});
 });
 if(scheduleCache[year])Object.keys(scheduleCache[year]).forEach(function(w){if(!weeks[w])weeks[w]=scheduleCache[year][w];});
 return weeks;
}
async function ensureSchedule(year,week){
 var s=settings(year),weeks=historicalSchedule(year);
 var missing=[];for(var w=week;w<=14;w++)if(!weeks[w]||weeks[w].length!==5)missing.push(w);
 if(!missing.length)return weeks;
 if(year<Math.max.apply(null,(DATA.league||[]).map(function(x){return +x.season;})))return weeks;
 if(!s.leagueId)return weeks;
 if(!scheduleCache[year])scheduleCache[year]={};
 await Promise.all(missing.map(async function(w){
  try{
   var res=await fetch('https://api.sleeper.app/v1/league/'+encodeURIComponent(s.leagueId)+'/matchups/'+w,{cache:'no-store'});
   if(!res.ok)return;
   var data=await res.json(),buckets={};
   data.forEach(function(x){if(x.matchup_id==null)return;var k=String(x.matchup_id);(buckets[k]||(buckets[k]=[])).push(+x.roster_id);});
   var pairs=Object.keys(buckets).sort(function(a,b){return +a-+b;}).map(function(k){return buckets[k];});
   var ids=pairs.flat();
   if(pairs.length!==5||ids.length!==10||new Set(ids).size!==10)return;
   scheduleCache[year][w]=pairs.map(function(pair){return {a:pair[0],b:pair[1]};});
  }catch(e){console.warn('Historical schedule Week '+w,e);}
 }));
 return historicalSchedule(year);
}
function game(a,b,model,rng,seeds){
 var x=Math.max(0,model[a].mean+model[a].sd*gauss(rng));
 var y=Math.max(0,model[b].mean+model[b].sd*gauss(rng));
 return x>y?a:y>x?b:seeds.indexOf(a)<seeds.indexOf(b)?a:b;
}
function playoffChampion(seeds,model,rng){
 if(seeds.length===5){
  var p=game(seeds[3],seeds[4],model,rng,seeds);
  return game(game(seeds[0],p,model,rng,seeds),game(seeds[1],seeds[2],model,rng,seeds),model,rng,seeds);
 }
 // Historical six-team bracket: seeds 1/2 bye; 3v6 and 4v5 quarterfinals.
 var q36=game(seeds[2],seeds[5],model,rng,seeds);
 var q45=game(seeds[3],seeds[4],model,rng,seeds);
 return game(game(seeds[0],q45,model,rng,seeds),game(seeds[1],q36,model,rng,seeds),model,rng,seeds);
}
function simulate(year,week,iterations){
 if(week<FIRST_WEEK||week>15)return null;
 var key=year+':'+week+':'+iterations;
 if(oddsCache[key])return oddsCache[key];
 var settingsYear=settings(year),model=forecast(year,week),schedule=historicalSchedule(year);
 if(!model||![5,6].includes(settingsYear.spots)||settingsYear.count!==10)return null;
 var remaining=[];
 for(var w=week;w<=14;w++){
  if(!schedule[w]||schedule[w].length!==5)return null;
  remaining.push.apply(remaining,schedule[w]);
 }
 var base=standings(year,week);
 var n=iterations,counts=Object.fromEntries(rosterIds().map(function(id){return [id,{playoffs:0,bye:0,one:0,champ:0,wins:0,score:0}];}));
 var rng=rand(0xC0FFEE+year*73+week*31+iterations),titleRng=rand(0xFACEB00C+year*31+week*17+iterations);
 for(var run=0;run<n;run++){
  var rows=base.map(function(x){return {id:x.id,wins:x.wins,losses:x.losses,ties:x.ties,pf:x.pf};});
  var byId=Object.fromEntries(rows.map(function(x){return [x.id,x];}));
  remaining.forEach(function(g){
   var a=byId[g.a],b=byId[g.b],pa=Math.max(0,model[g.a].mean+model[g.a].sd*gauss(rng)),pb=Math.max(0,model[g.b].mean+model[g.b].sd*gauss(rng));
   a.pf+=pa;b.pf+=pb;if(pa>pb){a.wins++;b.losses++;}else if(pb>pa){b.wins++;a.losses++;}else{a.ties++;b.ties++;}
  });
  rows.sort(ordered);
  var seeds=rows.slice(0,settingsYear.spots).map(function(x){return x.id;});
  counts[playoffChampion(seeds,model,titleRng)].champ++;
  rows.forEach(function(row,index){
   var c=counts[row.id];if(index<settingsYear.spots)c.playoffs++;
   if(index<(settingsYear.spots===5?3:2))c.bye++;
   if(index===0)c.one++;
   c.wins+=row.wins+row.ties*.5;c.score+=row.pf;
  });
 }
 Object.keys(counts).forEach(function(id){var c=counts[id];Object.keys(c).forEach(function(k){c[k]/=n;});});
 var result={model:model,standings:base,counts:counts,iterations:n};
 oddsCache[key]=result;return result;
}
function matchupProb(a,b,model){
 var x=model[a],y=model[b];return cdf((x.mean-y.mean)/Math.sqrt(x.sd*x.sd+y.sd*y.sd));
}
function matchups(year,week,model,complete){
 var scheduled=historicalSchedule(year)[week]||[];
 if(week===15)return '<div class="fig-hist-empty">Playoffs begin in Week 15. Matchups depend on final seeds.</div>';
 if(scheduled.length!==5)return '<div class="fig-hist-empty">Matchup schedule unavailable for this week.</div>';
 return '<div class="fig-hist-matchups">'+scheduled.map(function(m){
  var prob=matchupProb(m.a,m.b,model),played=week<=complete&&Number.isFinite(m.scoreA)&&Number.isFinite(m.scoreB);
  var winner=played?(m.scoreA>m.scoreB?m.a:m.b):null;
  return '<div class="fig-hist-match"><div class="fig-hist-versus"><strong>'+safe(title(m.a))+'</strong><span>'+p100(prob)+'</span><div class="fig-hist-probbar"><i style="width:'+Math.round(prob*100)+'%"></i></div><span>'+p100(1-prob)+'</span><strong>'+safe(title(m.b))+'</strong></div>'+
  (played?'<div class="fig-hist-result">Final: '+fmt(m.scoreA)+' – '+fmt(m.scoreB)+' · '+safe(title(winner))+' won</div>':'')+'</div>';
 }).join('')+'</div>';
}
function drawTable(year,week,results){
 var list=results.standings.map(function(s){var v=results.counts[s.id],m=results.model[s.id];return {id:s.id,record:s.wins+'–'+s.losses,model:m,p:v.playoffs,b:v.bye,one:v.one,champ:v.champ};});
 list.sort(function(a,b){return b.champ-a.champ||b.p-a.p||a.id-b.id;});
 return '<div class="fig-hist-table-wrap"><table class="fig-hist-table"><thead><tr><th>TEAM</th><th>W–L</th><th>PPG</th><th>SD</th><th>PLAYOFFS</th><th>BYE</th><th>#1 SEED</th><th>TITLE</th></tr></thead><tbody>'+
 list.map(function(t){
 return '<tr class="'+(t.id===selectedId?'is-selected':'')+'"><td><button type="button" class="fig-hist-team" data-team="'+t.id+'">'+ownerAvatar(t.id,'fig-hist-avatar')+'<strong>'+safe(title(t.id))+'</strong></button></td><td>'+t.record+'</td><td>'+fmt(t.model.mean)+'</td><td>'+fmt(t.model.sd)+'</td><td>'+p100(t.p)+'</td><td>'+p100(t.b)+'</td><td>'+p100(t.one)+'</td><td class="fig-hist-strong">'+p100(t.champ)+'</td></tr>';
 }).join('')+'</tbody></table></div>';
}
function metricValue(data,id,metric){
 var r=data&&data.counts&&data.counts[id];
 if(metric==='ppg')return data.model[id].mean;
 return r?r[metric]*100:0;
}
function historyPlot(series){
 if(!series.length)return '';
 var high=selectedMetric==='ppg'?Math.max(250,Math.ceil(Math.max.apply(null,series.map(function(x){return x.value;}))/25)*25):100;
 var width=740,height=190,left=40,right=12,top=12,bottom=26;
 var mx=function(x){return left+(x-FIRST_WEEK)*(width-left-right)/(15-FIRST_WEEK);};
 var my=function(y){return top+(high-y)*(height-top-bottom)/high;};
 var pts=series.map(function(s){return mx(s.week).toFixed(1)+','+my(s.value).toFixed(1);}).join(' ');
 var grid=[0,.25,.5,.75,1].map(function(f){var y=my(high*f);return '<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y+'" y2="'+y+'" class="fig-hist-grid"/><text x="'+(left-6)+'" y="'+(y+4)+'" text-anchor="end">'+(selectedMetric==='ppg'?Math.round(high*f):Math.round(high*f)+'%')+'</text>';}).join('');
 var dots=series.map(function(s){return '<circle cx="'+mx(s.week)+'" cy="'+my(s.value)+'" r="'+(s.week===currentWeek?5:3)+'" class="'+(s.week===currentWeek?'focus':'')+'"><title>Entering Week '+s.week+': '+(selectedMetric==='ppg'?fmt(s.value)+' PPG':s.value.toFixed(1)+'%')+'</title></circle>';}).join('');
 var labels=[5,7,9,11,13,15].map(function(x){return '<text x="'+mx(x)+'" y="'+(height-4)+'" text-anchor="middle">'+x+'</text>';}).join('');
 return '<svg class="fig-hist-chart" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+safe(title(selectedId))+' '+safe(selectedMetric)+' historical trend">'+grid+'<polyline points="'+pts+'" />'+dots+labels+'</svg>';
}
function metricLabel(key){return ({champ:'TITLE ODDS',playoffs:'PLAYOFF ODDS',ppg:'PROJECTED PPG'})[key]||key;}
function renderTrend(year,asOfWeek){
 var area=document.getElementById('figHistoricalTrend');
 if(!area)return;
 var series=[];
 for(var w=FIRST_WEEK;w<=Math.min(15,asOfWeek);w++){
  if(!forecast(year,w))continue;
  var data=simulate(year,w,timelineN);
  if(data)series.push({week:w,value:metricValue(data,selectedId,selectedMetric)});
 }
 area.innerHTML=series.length?historyPlot(series):'<div class="fig-hist-empty">Trend unavailable until the remaining schedule is available.</div>';
}
function bindPage(year){
 var yr=document.getElementById('figHistYear'),wk=document.getElementById('figHistWeek');
 if(yr)yr.onchange=function(){location.hash='#/historical-predictions/'+yr.value+'/5';};
 if(wk)wk.onchange=function(){location.hash='#/historical-predictions/'+year+'/'+wk.value;};
 document.querySelectorAll('[data-team]').forEach(function(btn){btn.onclick=function(){
  selectedId=+btn.dataset.team;document.querySelectorAll('[data-team]').forEach(function(b){b.closest('tr').classList.toggle('is-selected',+b.dataset.team===selectedId);});
  renderTrend(year,currentWeek);
  var head=document.getElementById('figHistTrendName');if(head)head.textContent=title(selectedId);
 };});
 document.querySelectorAll('[data-hist-metric]').forEach(function(btn){btn.onclick=function(){
  selectedMetric=btn.dataset.histMetric;
  document.querySelectorAll('[data-hist-metric]').forEach(function(b){b.classList.toggle('active',b.dataset.histMetric===selectedMetric);b.setAttribute('aria-pressed',b.dataset.histMetric===selectedMetric?'true':'false');});
  renderTrend(year,currentWeek);
 };});
}
window.figHistoricalPredictions=async function(yearParam,weekParam){
 await load(['league','leagueSettings','allGames','weeklyRanks']);
 navActive('historical-predictions');
 var allYears=(DATA.league||[]).map(function(x){return +x.season;}).filter(Number.isFinite).sort(function(a,b){return a-b;});
 var availableYears=allYears.filter(function(y){return completeWeek(y)>=FIRST_WEEK-1;});
 var yr=+yearParam;
 if(!availableYears.includes(yr))yr=availableYears[availableYears.length-1];
 if(!yr){app.innerHTML='<div class="empty">Historical predictions begin in Week 5.</div>';return;}
 var done=completeWeek(yr), maxWeek=Math.min(15,done+1);
 var requestedWeek=+weekParam;
 var wk=Number.isInteger(requestedWeek)&&requestedWeek>=FIRST_WEEK?Math.min(requestedWeek,maxWeek):(!weekParam?maxWeek:FIRST_WEEK);
 currentYear=yr;currentWeek=wk;
 if(!rosterIds().includes(selectedId))selectedId=1;
 await ensureSchedule(yr,wk);
 var model=forecast(yr,wk),result=simulate(yr,wk,N),options='';
 for(var w=FIRST_WEEK;w<=maxWeek;w++)options+='<option value="'+w+'">'+(w===15?'PLAYOFFS':'WEEK '+w)+'</option>';
 var yearOptions=availableYears.map(function(y){return '<option value="'+y+'"'+(y===yr?' selected':'')+'>'+y+'</option>';}).join('');
 var notice='65% season / 35% last 3 · scoring deviation from recent games';
 var panel=result?'<div class="fig-hist-kpi"><div><span>SCORING LEADER</span><strong>'+safe(title(Object.keys(model).sort(function(a,b){return model[b].mean-model[a].mean;})[0]))+'</strong><small>'+fmt(Math.max.apply(null,Object.keys(model).map(function(k){return model[k].mean;})))+' PPG</small></div>'+
 '<div><span>TITLE FAVORITE</span><strong>'+safe(title(Object.keys(result.counts).sort(function(a,b){return result.counts[b].champ-result.counts[a].champ;})[0]))+'</strong><small>'+p100(Math.max.apply(null,Object.keys(result.counts).map(function(k){return result.counts[k].champ;})))+'</small></div>'+
 '<div><span>PLAYOFF SPOTS</span><strong>'+settings(yr).spots+' TEAMS</strong><small>'+yr+' format</small></div></div>'+
 '<section class="fig-hist-panel"><h2>CHAMPIONSHIP PROJECTIONS</h2>'+drawTable(yr,wk,result)+'</section>'+
 '<section class="fig-hist-panel"><div class="fig-hist-trend-header"><div><h2>PROJECTION HISTORY</h2><div id="figHistTrendName" class="fig-hist-trend-name">'+safe(title(selectedId))+'</div></div><div class="fig-hist-segments">'+['champ','playoffs','ppg'].map(function(k){return '<button type="button" data-hist-metric="'+k+'" aria-pressed="'+(k===selectedMetric)+'" class="'+(k===selectedMetric?'active':'')+'">'+metricLabel(k)+'</button>';}).join('')+'</div></div><div id="figHistoricalTrend" class="fig-hist-chart-wrap"><div class="fig-hist-empty">Calculating trend…</div></div></section>'+
 '<section class="fig-hist-panel"><h2>WEEK '+wk+' MATCHUP ODDS</h2>'+matchups(yr,wk,model,done)+'</section>':
 '<section class="fig-hist-panel"><div class="fig-hist-empty">Remaining schedule is unavailable. Historical PPG estimates are available, but playoff odds need every remaining matchup.</div>'+
 (model?'<h2>PROJECTED PPG</h2><div class="fig-hist-simple">'+rosterIds().sort(function(a,b){return model[b].mean-model[a].mean;}).map(function(id){return '<div><strong>'+safe(title(id))+'</strong><span>'+fmt(model[id].mean)+' PPG · SD '+fmt(model[id].sd)+'</span></div>';}).join('')+'</div>':'')+'</section>';
 app.innerHTML='<div class="fig-hist-page"><div class="fig-hist-back"><a href="#/playoff-calculator">← PLAYOFF CALCULATOR</a></div>'+
 '<div class="fig-hist-title"><span>LEAGUE ARCHIVE</span><h1>HISTORICAL PREDICTIONS</h1></div>'+
 '<div class="fig-hist-controls"><label>SEASON <select id="figHistYear">'+yearOptions+'</select></label><label>AS OF <select id="figHistWeek">'+options+'</select></label></div>'+
 '<div class="fig-hist-note">'+safe(notice)+'</div>'+panel+'</div>';
 var select=document.getElementById('figHistWeek');if(select)select.value=String(wk);
 bindPage(yr);
 if(result){
  // Paint the standings first, then calculate the historical chart.
  setTimeout(function(){if(currentYear===yr&&currentWeek===wk)renderTrend(yr,wk);},30);
 }
};
})();