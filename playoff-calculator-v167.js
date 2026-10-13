/* FIG League Playoff Lab v167. Read-only Sleeper schedule; official results remain in published JSON. */
(function () {
 'use strict';
 var root, standings, history, teamById, strength, leagueId, year, firstWeek, weeks, sources, selectedWeek, picked, customSchedule, scoreDrafts, selectedTeam, oddsResults;
 var N=8000, END=14, SPOTS=5, BYES=3, lastOddsKey=null, cachedOdds=null, routeMode='main';
 var safe=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || '&#39;';});};
 var fmt=function(x){return Number(x||0).toLocaleString(undefined,{maximumFractionDigits:2});};
 var pc=function(x){return (100*x).toFixed(1)+'%';};
 var round=function(n){return Math.round(n*100)/100;};
 var clamp=function(x,a,b){return Math.min(b,Math.max(a,x));};
 var name=function(id){return (teamById[id]&&teamById[id].name)||('Team '+id);};
 var img=function(id,cls){return '<img class="'+(cls||'pcl-avatar')+'" src="'+safe(OWNER_AVATAR_BY_ID[id]||'')+'" alt="" loading="lazy">';};
 var matchKey=function(w,a,b){return w+'_'+Math.min(a,b)+'_'+Math.max(a,b);};
 var storeKey=function(suffix){return 'fig-playoff-lab-'+year+'-'+firstWeek+'-'+suffix;};
 var save=function(){try{localStorage.setItem(storeKey('picks'),JSON.stringify(picked));localStorage.setItem(storeKey('schedule'),JSON.stringify(customSchedule));}catch(e){}};
 var read=function(suffix){try{return JSON.parse(localStorage.getItem(storeKey(suffix))||'{}')||{};}catch(e){return {};}};
 function getStandings(){
   var current=(DATA.currentStandings||[]), league=DATA.leagueSettings||[];
   var match=league.slice().sort(function(a,b){return Number(b.season)-Number(a.season);})[0]||{};
   year=Number(match.season)||2026;
   leagueId=String(match.league_id||'');
   var settings={};try{settings=JSON.parse(match.settings_json||'{}');}catch(e){}
   if(settings.playoff_teams!==SPOTS||settings.playoff_week_start!==15||settings.num_teams!==10){throw Error('Playoff settings have changed. Calculator requires the confirmed 10-team, five-playoff-team, Week 15 format.');}
   standings=current.filter(function(t){return +t.season===year;}).map(function(t){
     return {id:+t.franchise_id,name:displayOwnerName(t.owner_name,t.franchise_id),wins:+t.wins||0,losses:+t.losses||0,ties:+t.ties||0,pf:+t.points_for||0,apW:+t.all_play_wins||0,apL:+t.all_play_losses||0,apT:+t.all_play_ties||0,apPct:(+t.all_play_win_pct||0)/100};
   });
   if(standings.length!==10)throw Error('Official 2026 standings are incomplete; cannot calculate odds.');
   teamById={};standings.forEach(function(x){teamById[x.id]=x;});
   history=(DATA.weeklyRanks||[]).filter(function(x){return +x.season===year && Number.isFinite(+x.points_for);});
   firstWeek=1+Math.max(0,...history.map(function(x){return +x.week||0;}));
   firstWeek=clamp(firstWeek,1,15);
   var gp=standings[0].wins+standings[0].losses+standings[0].ties;
   if(firstWeek!==gp+1)throw Error('Official standings and completed weekly scoring data are out of sync. Please wait for the next Sleeper archive refresh.');
   selectedWeek=firstWeek;
 }
 function computeStrength(){
   var all=history.map(function(r){return +r.points_for;});
   var avg=all.reduce(function(s,v){return s+v;},0)/Math.max(1,all.length);
   var sd=Math.sqrt(all.reduce(function(s,v){return s+Math.pow(v-avg,2);},0)/Math.max(1,all.length));
   sd=clamp(sd||42,28,85);
   strength={};
   standings.forEach(function(t){
     var scores=history.filter(function(r){return +r.franchise_id===t.id;}).sort(function(a,b){return a.week-b.week;}).map(function(r){return +r.points_for;});
     var season=scores.reduce(function(s,v){return s+v;},0)/Math.max(1,scores.length);
     if(!scores.length)season=avg;
     var recent=scores.slice(-3).reduce(function(s,v){return s+v;},0)/Math.max(1,Math.min(3,scores.length));
     if(!scores.length)recent=avg;
     // Equal-score week results contribute through ALL-PLAY regardless of schedule luck.
     var apTotal=t.apW+t.apL+t.apT;
     var ap=apTotal?(t.apW+t.apT*.5)/apTotal:.5;
     var allPlaySignal=avg+(ap-.5)*2*sd*.82;
     var mean=clamp(.40*recent+.30*season+.30*allPlaySignal,35,300);
     if(scores.length<3)mean=avg+(mean-avg)*scores.length/3;
     var varTeam=scores.reduce(function(s,v){return s+(v-season)*(v-season);},0)/Math.max(1,scores.length);
     var variability=clamp(Math.sqrt(varTeam*.55+sd*sd*.45),22,78);
     strength[t.id]={mean:mean,sd:variability,season:season,recent:recent,allPlay:ap};
   });
 }
 function validPairs(pairs){
   if(!Array.isArray(pairs)||pairs.length!==5)return false;
   var ids=[];
   for(var i=0;i<pairs.length;i++){
     if(!Array.isArray(pairs[i])||pairs[i].length!==2)return false;
     var a=+pairs[i][0],b=+pairs[i][1];
     if(a===b||!teamById[a]||!teamById[b])return false;
     ids.push(a,b);
   }
   return new Set(ids).size===10;
 }
 function parseSleeper(rows){
   if(!Array.isArray(rows)||rows.length!==10)return null;
   var m={};
   rows.forEach(function(r){
     if(r.matchup_id===null||r.matchup_id===undefined)return;
     var key=String(r.matchup_id);
     if(!m[key])m[key]=[];
     m[key].push(+r.roster_id);
   });
   var pairs=Object.keys(m).sort(function(a,b){return +a-(+b);}).map(function(k){return m[k];});
   return validPairs(pairs)?pairs:null;
 }
 async function loadSchedule(){
   weeks={};sources={};
   for(var w=firstWeek;w<=END;w++){weeks[w]=null;sources[w]='missing';}
   if(firstWeek>END)return;
   await Promise.all(Object.keys(weeks).map(async function(k){
     var w=+k,pairs=null;
     try{
       var response=await fetch('https://api.sleeper.app/v1/league/'+encodeURIComponent(leagueId)+'/matchups/'+w,{cache:'no-store'});
       if(!response.ok)throw Error('HTTP '+response.status);
       pairs=parseSleeper(await response.json());
     }catch(e){console.warn('Sleeper schedule Week '+w+': '+e.message);}
     if(pairs){weeks[w]=pairs;sources[w]='sleeper';}
     else if(validPairs(customSchedule[w])){weeks[w]=customSchedule[w];sources[w]='manual';}
   }));
 }
 function allGames(){
   var games=[];
   for(var w=firstWeek;w<=END;w++){
     if(!weeks[w])continue;
     weeks[w].forEach(function(p){games.push({week:w,a:p[0],b:p[1],key:matchKey(w,p[0],p[1])});});
   }
   return games;
 }
 function noMissing(){for(var w=firstWeek;w<=END;w++)if(!validPairs(weeks[w]))return false;return true;}
 function rand(seed){
   var s=seed>>>0;
   return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return (s+.5)/4294967296;};
 }
 function normal(rng){
   var u=Math.max(1e-9,rng()),v=rng();
   return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185307179586*v);
 }
 function pickScores(g,locked,rng){
   var a=strength[g.a],b=strength[g.b],pa,pb;
   if(locked && Number.isFinite(+locked.aPts) && Number.isFinite(+locked.bPts) && locked.aPts!==null && locked.bPts!==null){
     return [Number(locked.aPts),Number(locked.bPts)];
   }
   var attempts=locked&&locked.winner?40:1;
   for(var x=0;x<attempts;x++){
     pa=Math.max(0,a.mean+a.sd*normal(rng));pb=Math.max(0,b.mean+b.sd*normal(rng));
     if(!locked||!locked.winner||(locked.winner===g.a&&pa>pb)||(locked.winner===g.b&&pb>pa))break;
   }
   if(locked&&locked.winner){
     if(locked.winner===g.a&&pa<=pb){pa=Math.max(pa,pb+1);}
     else if(locked.winner===g.b&&pb<=pa){pb=Math.max(pb,pa+1);}
   }
   return [round(pa),round(pb)];
 }
 function baseRows(){
   return standings.map(function(t){return {id:t.id,wins:t.wins,losses:t.losses,ties:t.ties,pf:t.pf};});
 }
 function standingsSort(a,b){return (b.wins+b.ties*.5)-(a.wins+a.ties*.5)||b.pf-a.pf||a.id-b.id;}
 function runOdds(){
   if(!noMissing())return null;
   var games=allGames(),results={},impacts={};
    games.forEach(function(g){impacts[g.key]={key:g.key,a:g.a,b:g.b,week:g.week,count:[0,0],made:[{},{}],bye:[{},{}],locked:!!(picked[g.key]&&picked[g.key].winner)};});
   standings.forEach(function(t){results[t.id]={id:t.id,playoffs:0,bye:0,one:0,w:0,pf:0,path:{},seeds:[0,0,0,0,0,0,0,0,0,0]};});
   var rng=rand(0xC0FFEE+firstWeek*31);
   for(var n=0;n<N;n++){
     var rows=baseRows(),lookup={},roundWinners=[];rows.forEach(function(t){lookup[t.id]=t;});
     for(var g=0;g<games.length;g++){
       var match=games[g],pts=pickScores(match,picked[match.key],rng);
       var a=lookup[match.a],b=lookup[match.b];
       a.pf+=pts[0];b.pf+=pts[1];
       if(pts[0]>pts[1]){a.wins++;b.losses++;roundWinners.push({key:match.key,side:0});}
       else if(pts[1]>pts[0]){b.wins++;a.losses++;roundWinners.push({key:match.key,side:1});}
       else {a.ties++;b.ties++;}
     }
     rows.sort(standingsSort);
     var seeds={};
     rows.forEach(function(t,i){seeds[t.id]=i;
       var r=results[t.id];
       if(i<SPOTS)r.playoffs++;
       if(i<BYES)r.bye++;
       if(i===0)r.one++;
       r.seeds[i]++;
       var remainingWins=t.wins-teamById[t.id].wins;
       var pathKey=String(remainingWins);
       var outcome=r.path[pathKey]||(r.path[pathKey]={samples:0,made:0,bye:0});
       outcome.samples++;if(i<SPOTS)outcome.made++;if(i<BYES)outcome.bye++;
       r.w+=t.wins+t.ties*.5;
       r.pf+=t.pf;
     });
     roundWinners.forEach(function(w){
       var x=impacts[w.key];if(x.locked)return;
       var side=w.side;x.count[side]++;
       standings.forEach(function(t){var id=t.id,i=seeds[id];if(i<SPOTS)x.made[side][id]=(x.made[side][id]||0)+1;if(i<BYES)x.bye[side][id]=(x.bye[side][id]||0)+1;});
     });
   }
   Object.defineProperty(results,'_impacts',{value:impacts,enumerable:false});
   Object.values(results).forEach(function(x){x.playoffs/=N;x.bye/=N;x.one/=N;x.w/=N;x.pf/=N;x.seeds=x.seeds.map(function(v){return v/N;});});
   return results;
 }
 function missingWeeks(){
   return Object.keys(weeks).filter(function(k){return !weeks[k];}).map(Number);
 }
 function projectedTable(result){
   var rs=standings.map(function(t){var r=result&&result[t.id];return {id:t.id,w:r?r.w:t.wins+t.ties*.5,pf:r?r.pf:t.pf,playoffs:r?r.playoffs:0,bye:r?r.bye:0,one:r?r.one:0};}).sort(function(a,b){return b.w-a.w||b.pf-a.pf;});
   return rs;
 }
 function oddsForCurrentScenario(){
   if(!noMissing()){oddsResults=null;return null;}
   var key=JSON.stringify(picked)+'|'+JSON.stringify(weeks)+'|'+firstWeek;
   if(lastOddsKey!==key||!cachedOdds){cachedOdds=runOdds();lastOddsKey=key;}
   oddsResults=cachedOdds;return cachedOdds;
 }
 function quickStats(id){
   var t=teamById[id],s=strength[id];
   var opp=allGames().filter(function(g){return g.a===id||g.b===id;}).map(function(g){return {week:g.week,id:g.a===id?g.b:g.a};});
   var oppAvg=opp.reduce(function(sum,o){return sum+strength[o.id].mean;},0)/Math.max(1,opp.length);
   return {team:t,model:s,opp:opp,oppAvg:oppAvg};
 }
 function pctCell(n){return '<strong>'+pc(n)+'</strong><span class="pcl-odds-track"><span style="width:'+Math.max(0,Math.min(100,n*100))+'%"></span></span>';}
 function renderOdds(){
   var wrap=root.querySelector('#pclOdds');
   var missing=missingWeeks();
   if(missing.length){
     wrap.innerHTML='<div class="pcl-warning"><strong>Schedule still needed</strong><p>Missing matchup data for Week'+(missing.length===1?' ':'s ')+missing.join(', ')+'. Complete those weeks in the What-If Calculator to enable accurate, schedule-based odds.</p></div>';
     oddsResults=null;return;
   }
   oddsForCurrentScenario();
   var ranked=projectedTable(oddsResults).slice().sort(function(a,b){return b.playoffs-a.playoffs||b.w-a.w;});
   var body=ranked.map(function(r){
     var t=teamById[r.id],s=strength[r.id];
     return '<tr class="pcl-clickable-row" data-team-row="'+r.id+'" role="link" tabindex="0" aria-label="Open '+safe(t.name)+' playoff path">'+
       '<td><span class="pcl-team-btn">'+img(r.id)+'<span>'+safe(t.name)+'</span></span></td>'+
       '<td>'+t.wins+'–'+t.losses+'</td><td>'+fmt(t.pf)+'</td><td>'+pc(s.allPlay)+'</td>'+
       '<td class="pcl-prob">'+pctCell(r.playoffs)+'</td><td class="pcl-prob">'+pctCell(r.bye)+'</td>'+
       '<td>'+r.w.toFixed(1)+'</td></tr>';
   }).join('');
   wrap.innerHTML='<div class="pcl-table-wrap"><table class="pcl-table"><thead><tr><th>TEAM</th><th>W–L</th><th>PF</th><th>ALL-PLAY</th><th>PLAYOFFS</th><th>TOP-3 BYE</th><th>PROJ W</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
     '<div class="pcl-legend">Tap any team row for its route to the playoffs, remaining schedule, and possible finishing records. '+N.toLocaleString()+' simulations · wins and Points For determine seeding.</div>';
 }
 function renderBracket(result){
   var rs=projectedTable(result);
   var slot=function(i){var t=rs[i];return '<div class="pcl-bracket-team"><span class="pcl-seed">#'+(i+1)+'</span>'+img(t.id)+'<b>'+safe(name(t.id))+'</b></div>';};
   root.querySelector('#pclBracket').innerHTML='<div class="pcl-bracket">'+
     '<div class="pcl-bracket-round"><span class="pcl-round-label">W15 · PLAY-IN</span><div class="pcl-bracket-pair">'+slot(3)+'<em>vs</em>'+slot(4)+'</div><div class="pcl-bracket-note">Top 3 seeds receive byes</div></div>'+
     '<div class="pcl-bracket-round"><span class="pcl-round-label">W16 · SEMIFINALS</span><div class="pcl-bracket-pair">'+slot(0)+'<em>vs</em><span class="pcl-bracket-unknown">#4 / #5 WINNER</span></div><div class="pcl-bracket-pair">'+slot(1)+'<em>vs</em>'+slot(2)+'</div></div>'+
     '<div class="pcl-bracket-round"><span class="pcl-round-label">W17 · TITLE GAME</span><div class="pcl-bracket-pair"><span class="pcl-bracket-unknown">SEMIFINAL WINNER</span><em>vs</em><span class="pcl-bracket-unknown">SEMIFINAL WINNER</span></div></div>'+
     '</div><p class="pcl-caption">Bracket uses the modeled final seed order, not a prediction of playoff-game winners. Top 5 qualify, with Points For breaking equal records.</p>';
 }
 function renderTeamDetails(){
   // The main calculator only needs a compact summary. Full path and seeding
   // scenarios live on the team's dedicated playoff page.
   var wrap=root.querySelector('#pclTeamDetails'),s=quickStats(selectedTeam),r=oddsResults&&oddsResults[selectedTeam];
   var chooser=root.querySelector('#pclTeamSelect');if(chooser)chooser.value=String(selectedTeam);
   var next=s.opp.slice(0,3).map(function(x){return '<span class="pcl-opponent">W'+x.week+' '+safe(name(x.id))+'</span>';}).join('');
   wrap.innerHTML='<div class="pcl-quick-outlook"><div class="pcl-detail-head">'+img(selectedTeam,'pcl-detail-avatar')+
     '<div><strong>'+safe(name(selectedTeam))+'</strong><span>'+s.team.wins+'–'+s.team.losses+' · '+fmt(s.team.pf)+' PF</span></div></div>'+
     '<div class="pcl-quick-stats"><span><small>PLAYOFFS</small><b>'+(r?pc(r.playoffs):'—')+'</b></span>'+
     '<span><small>TOP-3 BYE</small><b>'+(r?pc(r.bye):'—')+'</b></span>'+
     '<span><small>LAST 3 AVG</small><b>'+fmt(s.model.recent)+'</b></span>'+
     '<span><small>ALL-PLAY</small><b>'+pc(s.model.allPlay)+'</b></span></div>'+
     '<a class="pcl-path-link" href="#/playoff-calculator/team/'+selectedTeam+'">FULL PLAYOFF PATH →</a></div>'+
     '<div class="pcl-quick-upcoming"><b>NEXT OPPONENTS</b>'+ (next||'<span>Regular season complete</span>')+'</div>';
 }
 // Matchups are simulated directly against scheduled opponents; the formula
 // below is only a concise head-to-head difficulty estimate for the team page.
 function modelMatchWinChance(a,b){
   var diff=strength[a].mean-strength[b].mean;
   var spread=Math.sqrt(strength[a].sd*strength[a].sd+strength[b].sd*strength[b].sd);
   return 1/(1+Math.exp(-1.7*diff/Math.max(1,spread)));
 }
 function renderTeamRoute(){
   var s=quickStats(selectedTeam),t=s.team,r=oddsForCurrentScenario()&&oddsResults[selectedTeam];
   var remaining=END-firstWeek+1;
   var modeled=r?'<div class="pcl-route-chances">'+
     '<div><small>MAKE PLAYOFFS</small><strong>'+pc(r.playoffs)+'</strong></div>'+
     '<div><small>TOP-3 BYE</small><strong>'+pc(r.bye)+'</strong></div>'+
     '<div><small>FIRST SEED</small><strong>'+pc(r.one)+'</strong></div>'+
     '<div><small>PROJECTED WINS</small><strong>'+r.w.toFixed(1)+'</strong></div></div>':
     '<div class="pcl-warning">Complete the missing weeks of the schedule in the main calculator to see accurate odds. Current standings and recorded performance are shown below.</div>';
   var pathRows='';
   if(r){
     for(var w=0;w<=Math.max(0,remaining);w++){
       var p=r.path[String(w)],have=p&&p.samples>=15;
       pathRows+='<tr><td><b>'+w+'</b> / '+remaining+'</td><td>'+ (t.wins+w)+'–'+(t.losses+remaining-w)+'</td>'+
         '<td>'+(have?pc(p.made/p.samples):'—')+'</td><td>'+(have?pc(p.bye/p.samples):'—')+'</td></tr>';
     }
   }
   var seedHtml=r?'<div class="pcl-seed-grid">'+r.seeds.slice(0,5).map(function(p,i){return '<span><strong>#'+(i+1)+'</strong>'+pc(p)+'</span>';}).join('')+'</div>':'<p class="pcl-caption">Seed odds appear once all remaining matchups are available.</p>';
   var leagueAvg=standings.reduce(function(a,x){return a+strength[x.id].mean;},0)/standings.length;
   var schedule=s.opp.map(function(o){
     var opp=teamById[o.id],chance=modelMatchWinChance(selectedTeam,o.id);
     var game=allGames().find(function(g){return g.week===o.week&&(g.a===selectedTeam||g.b===selectedTeam);});
     var lock=game&&picked[game.key],state=lock?(lock.winner===selectedTeam?' · PICKED WIN':lock.winner===o.id?' · PICKED LOSS':' · SET SCORE'):'';
     return '<a class="pcl-route-game" href="#/playoff-calculator/week/'+o.week+'"><span class="pcl-route-week">W'+o.week+'</span>'+
       img(o.id)+'<span class="pcl-route-opp"><b>'+safe(opp.name)+'</b><small>'+opp.wins+'–'+opp.losses+' · '+fmt(strength[o.id].mean)+' model PPG'+safe(state)+'</small></span>'+
       '<span class="pcl-route-win">'+pc(chance)+'<small>MODEL WIN CHANCE</small></span><span class="pcl-route-edit">EDIT ↗</span></a>';
   }).join('');
   root.innerHTML='<a href="#/playoff-calculator" class="pcl-route-back">← ALL PLAYOFF ODDS</a>'+
    '<section class="pcl-route-hero"><div class="pcl-route-person">'+img(selectedTeam,'pcl-route-portrait')+
    '<div><div class="pcl-kicker">TEAM PLAYOFF OUTLOOK</div><h2>'+safe(t.name)+'</h2><p>'+t.wins+'–'+t.losses+' · '+fmt(t.pf)+' PF · '+pc(s.model.allPlay)+' ALL-PLAY</p></div></div>'+
    modeled+'</section>'+
    '<section class="section pcl-section"><div class="pcl-section-head"><h2>ROAD TO THE PLAYOFFS</h2><span>'+remaining+' GAMES LEFT · FIVE TEAMS QUALIFY</span></div>'+
    '<p class="pcl-route-intro">How likely '+safe(t.name)+' is to qualify based on how many remaining games it wins. Each percentage accounts for other teams’ results and the Points For tiebreaker.</p>'+
    (r?'<div class="pcl-route-table-wrap"><table class="pcl-table pcl-route-table"><thead><tr><th>WINS FROM HERE</th><th>FINAL RECORD</th><th>PLAYOFF ODDS</th><th>TOP-3 BYE</th></tr></thead><tbody>'+pathRows+'</tbody></table></div>'+
    '<p class="pcl-caption">Percentages are conditional on simulated finishing records. A dash means that fewer than 15 simulations produced that record; this is not an automatic elimination or clinch.</p>':
    '<p class="pcl-caption">Missing weeks prevent a complete route calculation; return to the simulator to fill them.</p>')+
    '<div class="pcl-route-actions"><button data-path="win">SIMULATE WINNING OUT</button><button data-path="lose">SIMULATE LOSING OUT</button><button data-path="reset">RESET '+safe(t.name).toUpperCase()+' MATCHUPS</button></div></section>'+
    '<section class="section pcl-section"><div class="pcl-section-head"><h2>REMAINING SCHEDULE</h2><span>SELECT A WEEK TO EDIT ITS RESULTS</span></div>'+
    '<div class="pcl-route-summary"><span>OPPONENT AVG <b>'+ (s.opp.length?fmt(s.oppAvg):'—')+'</b></span><span>LEAGUE AVG <b>'+fmt(leagueAvg)+'</b></span>'+
    '<span>MODEL POINTS/WK <b>'+fmt(s.model.mean)+'</b></span></div>'+
    '<div class="pcl-route-games">'+(schedule||'<div class="pcl-caption">No confirmed future matchups available.</div>')+'</div></section>'+
    '<section class="section pcl-section"><div class="pcl-section-head"><h2>SEED OUTLOOK</h2><span>FIRST THROUGH FIFTH SEED</span></div>'+seedHtml+
    '<div class="pcl-route-detail-stats"><span>LAST 3 AVG <b>'+fmt(s.model.recent)+'</b></span><span>SEASON AVG <b>'+fmt(s.model.season)+'</b></span>'+
    '<span>ALL-PLAY <b>'+pc(s.model.allPlay)+'</b></span></div></section>'+
    '<a class="pcl-path-link pcl-bottom-cta" href="#/playoff-calculator">OPEN FULL WHAT-IF CALCULATOR →</a>'+
    '<p class="pcl-caption">Model odds, not mathematical clinching status. Only finalized regular-season games affect official records. Scenario picks are saved on this device.</p>';
 }
 function renderWeeks(){
   var controls=root.querySelector('#pclWeeks');
   var options=Object.keys(weeks).map(function(w){return '<button type="button" class="'+(+w===selectedWeek?'pcl-week-active':'')+'" data-week="'+w+'">W'+w+(weeks[w]?'':' !')+'</button>';}).join('');
   controls.innerHTML=options||'<span class="pcl-caption">Regular season is complete.</span>';
   var holder=root.querySelector('#pclGames'),pairs=weeks[selectedWeek];
   if(!pairs){holder.innerHTML='<div class="pcl-warning"><strong>Week '+selectedWeek+' schedule unavailable</strong><p>Sleeper has not exposed usable matchup pairs yet. Enter this week’s five matchups below to make your own schedule-aware projections.</p></div>'+scheduleEditor();return;}
   var manual=sources[selectedWeek]==='manual'?'MANUALLY ENTERED':'SLEEPER SCHEDULE';
   var rows=pairs.map(function(pair){
     var a=+pair[0],b=+pair[1],key=matchKey(selectedWeek,a,b),lock=picked[key]||{},draft=scoreDrafts[key]||{};
     var ma=strength[a],mb=strength[b],status=lock.winner===a?'pcl-choice-on':'',statusB=lock.winner===b?'pcl-choice-on':'';
     var vA=draft.a!==undefined?draft.a:lock.aPts!==undefined&&lock.aPts!==null?lock.aPts:'';
     var vB=draft.b!==undefined?draft.b:lock.bPts!==undefined&&lock.bPts!==null?lock.bPts:'';
     return '<div class="pcl-match"><button type="button" class="pcl-side '+status+'" data-key="'+key+'" data-winner="'+a+'">'+img(a)+'<span>'+safe(name(a))+'</span><small>'+Math.round(ma.mean)+' proj</small></button>'+
       '<span class="pcl-vs">VS</span>'+
       '<button type="button" class="pcl-side '+statusB+'" data-key="'+key+'" data-winner="'+b+'">'+img(b)+'<span>'+safe(name(b))+'</span><small>'+Math.round(mb.mean)+' proj</small></button>'+
       '<div class="pcl-match-options"><button type="button" class="pcl-auto '+(!lock.winner&&lock.aPts===undefined?'pcl-choice-on':'')+'" data-auto="'+key+'">AUTO</button>'+
       '<label>'+safe(name(a))+' <input data-score="'+key+'" data-score-side="a" type="number" min="0" max="500" step="0.01" placeholder="'+Math.round(ma.mean)+'" value="'+safe(vA)+'" aria-label="'+safe(name(a))+' projected score"></label>'+
       '<label>'+safe(name(b))+' <input data-score="'+key+'" data-score-side="b" type="number" min="0" max="500" step="0.01" placeholder="'+Math.round(mb.mean)+'" value="'+safe(vB)+'" aria-label="'+safe(name(b))+' projected score"></label></div></div>';
   }).join('');
   holder.innerHTML='<div class="pcl-schedule-source">'+manual+' · Tap a team to lock a win. Enter both scores to lock Points For, too.</div>'+rows;
 }
 function scheduleEditor(){
   var options='<option value="">Choose team</option>'+standings.slice().sort(function(a,b){return a.id-b.id;}).map(function(t){return '<option value="'+t.id+'">'+safe(t.name)+'</option>';}).join('');
   var rows=Array.from({length:5},function(_,i){return '<div class="pcl-edit-pair"><span>GAME '+(i+1)+'</span><select data-editor-row="'+i+'" data-editor-side="0">'+options+'</select><b>vs</b><select data-editor-row="'+i+'" data-editor-side="1">'+options+'</select></div>';}).join('');
   return '<div class="pcl-schedule-editor"><h3>ENTER WEEK '+selectedWeek+' MATCHUPS</h3><p>Choose each team exactly once. This schedule will be saved on your device until Sleeper publishes its own matchups.</p>'+rows+'<button type="button" data-save-schedule="1" class="pcl-primary">USE THESE MATCHUPS</button><p class="pcl-editor-error" id="pclEditError"></p></div>';
 }
 function reRender(){
   if(!document.getElementById('figPlayoffCalc'))return;
   if(routeMode==='team'){renderTeamRoute();return;}
   renderOdds();
   renderTeamDetails();
   renderBracket(oddsResults);
   renderWeeks();
   root.querySelector('#pclMissing').textContent=missingWeeks().length?'Missing schedules: '+missingWeeks().map(function(w){return 'W'+w;}).join(', '):'All remaining weeks scheduled';
 }
 function handleClick(event){
   var row=event.target.closest('[data-team-row]');
   if(row&&root.contains(row)){location.hash='#/playoff-calculator/team/'+row.dataset.teamRow;return;}
   var b=event.target.closest('button');if(!b||!root.contains(b))return;
   if(b.dataset.path){
     allGames().filter(function(g){return g.a===selectedTeam||g.b===selectedTeam;}).forEach(function(g){
       if(b.dataset.path==='reset')delete picked[g.key];
       else picked[g.key]={winner:b.dataset.path==='win'?selectedTeam:g.a===selectedTeam?g.b:g.a};
     });
     scoreDrafts={};save();reRender();return;
   }
   if(b.dataset.team){selectedTeam=+b.dataset.team;reRender();return;}
   if(b.dataset.week){selectedWeek=+b.dataset.week;renderWeeks();return;}
   if(b.dataset.reset!==undefined){picked={};scoreDrafts={};save();reRender();return;}
   if(b.dataset.refresh!==undefined){b.disabled=true;b.textContent='REFRESHING…';loadSchedule().then(function(){reRender();}).finally(function(){b.disabled=false;b.textContent='RECHECK SLEEPER';});return;}
   if(b.dataset.auto){delete picked[b.dataset.auto];delete scoreDrafts[b.dataset.auto];save();reRender();return;}
   if(b.dataset.winner){
     var key=b.dataset.key,winner=+b.dataset.winner;
     if(picked[key]&&picked[key].winner===winner){delete picked[key];}else picked[key]={winner:winner};
     delete scoreDrafts[key];save();reRender();return;
   }
   if(b.dataset.saveSchedule){
     var selects=Array.from(root.querySelectorAll('[data-editor-row]')),pairs=Array.from({length:5},function(){return [null,null];});
     selects.forEach(function(x){pairs[+x.dataset.editorRow][+x.dataset.editorSide]=+x.value;});
     if(!validPairs(pairs)){
       root.querySelector('#pclEditError').textContent='Choose exactly five valid matchups, with each of the 10 teams appearing once.';
       return;
     }
     customSchedule[selectedWeek]=pairs;weeks[selectedWeek]=pairs;sources[selectedWeek]='manual';save();reRender();return;
   }
 }
 function handleChange(event){
   var t=event.target;if(!t)return;
   if(t.id==='pclTeamSelect'){selectedTeam=+t.value;reRender();return;}
   if(!t.dataset||!t.dataset.score)return;
   var key=t.dataset.score,side=t.dataset.scoreSide;
   if(!scoreDrafts[key])scoreDrafts[key]={};
   scoreDrafts[key][side]=t.value;
   var v=scoreDrafts[key],a=Number(v.a),b=Number(v.b);
   if(v.a===''||v.b===''||!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0||a>500||b>500)return;
   var g=allGames().find(function(g){return g.key===key;});
   if(!g)return;
   picked[key]={aPts:round(a),bPts:round(b),winner:a>b?g.a:b>a?g.b:null};
   save();reRender();
 }
 function renderShell(){
   root.innerHTML='<section class="pcl-overview"><div class="pcl-kicker">'+year+' · FIVE-TEAM PLAYOFF FORMAT · WEEKS 1–14</div>'+
     '<div class="pcl-headline"><div><h2>THE PLAYOFF LAB</h2><p>Schedule-aware playoff odds and a week-by-week what-if simulator. <b>Wins first, total Points For as the tiebreaker.</b></p></div>'+
     '<div class="pcl-status"><span class="pcl-status-label">OFFICIAL RESULTS THROUGH</span><strong>WEEK '+(firstWeek-1)+'</strong><span id="pclMissing"></span></div></div>'+
     '</section>'+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>PLAYOFF ODDS</h2><span>TOP 5 QUALIFY · TOP 3 BYES</span></div><div id="pclOdds"></div></section>'+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>TEAM OUTLOOK</h2><select id="pclTeamSelect" aria-label="Choose a team outlook">'+standings.map(function(t){return '<option value="'+t.id+'">'+safe(t.name)+'</option>';}).join('')+'</select></div><div id="pclTeamDetails"></div></section>'+
     '<section id="pclWeekArea" class="section pcl-section pcl-whatif"><div class="pcl-section-head"><h2>WHAT-IF CALCULATOR</h2><span>SELECT WINNERS OR EXACT SCORES</span></div>'+
     '<div class="pcl-actions"><button type="button" data-reset="1">RESET SCENARIO</button><button type="button" data-refresh="1">RECHECK SLEEPER</button></div>'+
     '<div class="pcl-week-tabs" id="pclWeeks"></div><div class="pcl-match-list" id="pclGames"></div></section>'+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>PROJECTED PLAYOFF BRACKET</h2><span>BASED ON PROJECTED SEEDS</span></div><div id="pclBracket"></div></section>'+
     '<div class="pcl-disclaimer">Probabilities are estimates, not guarantees or mathematical clinches. Simulations draw future weekly scores from each team’s observed scoring distribution. Last three completed games have extra weight; all-play captures performance against the full league. Scheduled opponents determine every game, and projected PF breaks record ties. Unofficial live scores never count until published as completed.</div>';
   root.addEventListener('click',handleClick);
   root.addEventListener('keydown',function(e){
     var row=e.target.closest('[data-team-row]');
     if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();location.hash='#/playoff-calculator/team/'+row.dataset.teamRow;}
   });
   root.addEventListener('change',handleChange);
 }
 async function launch(routeType,routeValue){
   await load(['currentStandings','weeklyRanks','leagueSettings']);
   navActive('');
   getStandings();computeStrength();
   picked=read('picks');customSchedule=read('schedule');scoreDrafts={};
   routeMode=routeType==='team'?'team':'main';selectedTeam=routeMode==='team'&&teamById[+routeValue]?+routeValue:1;
   lastOddsKey=null;cachedOdds=null;
   if(routeType==='week'&&Number.isInteger(+routeValue)&&+routeValue>=firstWeek&&+routeValue<=END)selectedWeek=+routeValue;
   app.innerHTML=hero('LEAGUE PLAYOFF PICTURE','PLAYOFF CALCULATOR','Five teams make it. Play out the remaining schedule, or let the odds model do the work.')+'<div id="figPlayoffCalc" class="pcl"></div>';
   root=document.getElementById('figPlayoffCalc');
   if(routeMode==='main'){
     renderShell();root.querySelector('#pclOdds').innerHTML='<div class="pcl-loading">Checking upcoming matchups with Sleeper…</div>';
   }else{
     root.innerHTML='<div class="pcl-loading">Loading '+safe(name(selectedTeam))+' playoff path…</div>';
     root.addEventListener('click',handleClick);
   }
   await loadSchedule();
   if(!root.isConnected||!location.hash.startsWith('#/playoff-calculator'))return;
  // With no remaining regular-season games, the model produces exact 0/100% seed odds.
   reRender();
   if(routeType==='week'){
     var weekArea=document.getElementById('pclWeekArea');if(weekArea)weekArea.scrollIntoView({block:'start'});
   }
 }
 window.figPlayoffCalculator=launch;
})();
