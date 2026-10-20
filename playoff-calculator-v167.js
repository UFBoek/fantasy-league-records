/* FIG League Playoff Lab v187. Read-only Sleeper schedule; official results remain in published JSON. */
(function () {
 'use strict';
 var root, standings, history, teamById, strength, leagueId, year, firstWeek, weeks, sources, selectedWeek, picked, customSchedule, scoreDrafts, selectedTeam, oddsResults, bracketPicks, bracketScores;
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
 var saveBracket=function(){try{localStorage.setItem(storeKey('bracket'),JSON.stringify({picks:bracketPicks,scores:bracketScores}));}catch(e){}};
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
   history=(DATA.weeklyRanks||[]).filter(function(x){return +x.season===year && +x.week>=1 && +x.week<=END && Number.isFinite(+x.points_for);});
   firstWeek=1+Math.max(0,...history.map(function(x){return +x.week||0;}));
   firstWeek=clamp(firstWeek,1,15);
   var gp=standings[0].wins+standings[0].losses+standings[0].ties;
   if(firstWeek!==gp+1)throw Error('Official standings and completed weekly scoring data are out of sync. Please wait for the next Sleeper archive refresh.');
   selectedWeek=firstWeek;
 }
 function computeStrength(){
   var all=history.map(function(r){return +r.points_for;});
   var avg=all.reduce(function(s,v){return s+v;},0)/Math.max(1,all.length);
   // Prior-season results are used ONLY to fill an eight-game deviation window.
   // They never contribute to a team's projected current-season scoring mean.
   var priorHistory=(DATA.weeklyRanks||[]).filter(function(r){
     return +r.season===year-1 && +r.week>=1 && +r.week<=END && Number.isFinite(+r.points_for);
   });
   strength={};
   standings.forEach(function(t){
     var scores=history.filter(function(r){return +r.franchise_id===t.id;})
       .sort(function(a,b){return a.week-b.week;}).map(function(r){return +r.points_for;});
     var season=scores.reduce(function(s,v){return s+v;},0)/Math.max(1,scores.length);
     if(!scores.length)season=avg;
     var recent=scores.slice(-3).reduce(function(s,v){return s+v;},0)/Math.max(1,Math.min(3,scores.length));
     if(!scores.length)recent=avg;
     // Projected averages remain current-season only, weighted 4:3 for
     // the last three games and the full current season.
     var mean=clamp((4*recent+3*season)/7,35,300);
     if(scores.length<3)mean=avg+(mean-avg)*scores.length/3;
     // Estimate each franchise's volatility from its last eight completed
     // regular-season games. Fill any missing current-season games with the
     // most recent regular-season games from the immediately prior season.
     var currentWindow=scores.slice(-8);
     var missing=Math.max(0,8-currentWindow.length);
     var previous=priorHistory.filter(function(r){return +r.franchise_id===t.id;})
       .sort(function(a,b){return a.week-b.week;}).map(function(r){return +r.points_for;});
     var priorWindow=missing?previous.slice(-missing):[];
     // Normalize prior-season games against that season's full regular-season
     // mean. Center current games on their selected rolling-window mean.
     // This prevents a change in team strength between seasons from being
     // mistaken for week-to-week volatility.
     var currentAvg=currentWindow.reduce(function(s,v){return s+v;},0)/Math.max(1,currentWindow.length);
     var previousAvg=previous.reduce(function(s,v){return s+v;},0)/Math.max(1,previous.length);
     var squared=currentWindow.reduce(function(sum,v){return sum+Math.pow(v-currentAvg,2);},0)+
       priorWindow.reduce(function(sum,v){return sum+Math.pow(v-previousAvg,2);},0);
     var sampleSize=currentWindow.length+priorWindow.length;
     var variability=sampleSize?Math.sqrt(squared/sampleSize):0;
     // All-play is displayed as an official league metric, but it does not
     // change predicted points or a team's own scoring standard deviation.
     var apTotal=t.apW+t.apL+t.apT;
     var ap=apTotal?(t.apW+t.apT*.5)/apTotal:.5;
     strength[t.id]={mean:mean,sd:variability,season:season,recent:recent,allPlay:ap,
       sdGames:sampleSize,sdPriorGames:priorWindow.length};
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
 function playoffGame(a,b,rng,seeds){
    var x=strength[a],y=strength[b];
    var pa=round(Math.max(0,x.mean+x.sd*normal(rng))),pb=round(Math.max(0,y.mean+y.sd*normal(rng)));
    return {a:a,b:b,scoreA:pa,scoreB:pb,winner:pa>pb?a:pb>pa?b:seeds.indexOf(a)<seeds.indexOf(b)?a:b};
  }
  function postSeason(seeds,rng){
    var playin=playoffGame(seeds[3],seeds[4],rng,seeds);
    var semi1=playoffGame(seeds[0],playin.winner,rng,seeds);
    var semi2=playoffGame(seeds[1],seeds[2],rng,seeds);
    var final=playoffGame(semi1.winner,semi2.winner,rng,seeds);
    return {playin:playin,semi1:semi1,semi2:semi2,final:final,champion:final.winner};
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
   standings.forEach(function(t){results[t.id]={id:t.id,playoffs:0,bye:0,one:0,champ:0,w:0,pf:0,path:{},seeds:[0,0,0,0,0,0,0,0,0,0]};});
   var rng=rand(0xC0FFEE+firstWeek*31),titleRng=rand(0xFACEB00C+firstWeek*17);
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
     var title=postSeason(rows.slice(0,SPOTS).map(function(t){return t.id;}),titleRng);
     results[title.champion].champ++;
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
   Object.values(results).forEach(function(x){x.playoffs/=N;x.bye/=N;x.one/=N;x.champ/=N;x.w/=N;x.pf/=N;x.seeds=x.seeds.map(function(v){return v/N;});});
   return results;
 }
 function missingWeeks(){
   return Object.keys(weeks).filter(function(k){return !weeks[k];}).map(Number);
 }
 function projectedTable(result){
   var rs=standings.map(function(t){var r=result&&result[t.id];return {id:t.id,w:r?r.w:t.wins+t.ties*.5,pf:r?r.pf:t.pf,playoffs:r?r.playoffs:0,bye:r?r.bye:0,one:r?r.one:0,champ:r?r.champ:0};}).sort(function(a,b){return b.w-a.w||b.pf-a.pf;});
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
 function scenarioRecords(){
   // Only explicitly selected winners count here. AUTO is simulated for odds
   // but must never turn an unplayed game into a displayed W–L result.
   var records={};
   standings.forEach(function(t){records[t.id]={wins:t.wins,losses:t.losses,ties:t.ties,picks:0};});
   allGames().forEach(function(game){
     var chosen=picked[game.key],winner=chosen&&Number(chosen.winner);
     if(winner!==game.a&&winner!==game.b)return;
     var loser=winner===game.a?game.b:game.a;
     records[winner].wins++;records[loser].losses++;
     records[winner].picks++;records[loser].picks++;
   });
   return records;
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
   var scenario=scenarioRecords(),pickedMatchups=allGames().filter(function(g){return picked[g.key]&&(Number(picked[g.key].winner)===g.a||Number(picked[g.key].winner)===g.b);}).length;
   var ranked=projectedTable(oddsResults).slice().sort(function(a,b){return b.playoffs-a.playoffs||b.w-a.w;});
   var body=ranked.map(function(r){
     var t=teamById[r.id],s=strength[r.id],record=scenario[r.id];
     var label=record.wins+'–'+record.losses+(record.ties?'–'+record.ties:'');
     var displayedRecord=record.picks?
       '<span class="pcl-scenario-record"><strong>'+label+'</strong><small>'+record.picks+' picked</small></span>':label;
     return '<tr class="pcl-clickable-row" data-team-row="'+r.id+'" role="link" tabindex="0" aria-label="Open '+safe(t.name)+' playoff path">'+
       '<td><span class="pcl-team-btn">'+img(r.id)+'<span>'+safe(t.name)+'</span></span></td>'+
       '<td>'+displayedRecord+'</td><td>'+fmt(t.pf)+'</td><td>'+pc(s.allPlay)+'</td>'+
       '<td class="pcl-prob">'+pctCell(r.playoffs)+'</td><td class="pcl-prob">'+pctCell(r.bye)+'</td>'+ 
        '<td class="pcl-prob">'+pctCell(r.one)+'</td><td class="pcl-prob pcl-title-odds">'+pctCell(r.champ)+'</td>'+
       '<td>'+r.w.toFixed(1)+'</td></tr>';
   }).join('');
   wrap.innerHTML='<div class="pcl-table-wrap"><table class="pcl-table"><thead><tr><th>TEAM</th><th>W–L</th><th>PF</th><th>ALL-PLAY</th><th>PLAYOFFS</th><th>TOP-3 BYE</th><th>1 SEED</th><th>CHAMPION</th><th>PROJ W</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
      '<div class="pcl-legend">'+(pickedMatchups?'WHAT-IF · '+pickedMatchups+' picked · ':'')+N.toLocaleString()+' simulations</div>';
  }
  function renderBracket(result){
    var holder=root.querySelector('#pclBracket');
    if(!result){holder.innerHTML='<div class="pcl-warning">Complete the remaining schedule to project the bracket.</div>';return;}
    var rs=projectedTable(result);
    var slot=function(i){var t=rs[i];return '<div class="pcl-bracket-team"><span class="pcl-seed">#'+(i+1)+'</span>'+img(t.id)+'<b>'+safe(name(t.id))+'</b></div>';};
    holder.innerHTML='<a class="pcl-bracket-entry" href="#/playoff-calculator/bracket" aria-label="Open playoff simulator"><div class="pcl-bracket">'+
      '<div class="pcl-bracket-round"><span class="pcl-round-label">W15 · PLAY-IN</span><div class="pcl-bracket-pair">'+slot(3)+'<em>vs</em>'+slot(4)+'</div></div>'+
      '<div class="pcl-bracket-round"><span class="pcl-round-label">W16 · SEMIFINALS</span><div class="pcl-bracket-pair">'+slot(0)+'<em>vs</em><span class="pcl-bracket-unknown">PLAY-IN WINNER</span></div><div class="pcl-bracket-pair">'+slot(1)+'<em>vs</em>'+slot(2)+'</div></div>'+
      '<div class="pcl-bracket-round"><span class="pcl-round-label">W17 · TITLE GAME</span><div class="pcl-bracket-pair"><span class="pcl-bracket-unknown">SEMIFINAL WINNER</span><em>vs</em><span class="pcl-bracket-unknown">SEMIFINAL WINNER</span></div></div>'+
      '</div><div class="pcl-bracket-open">OPEN PLAYOFF SIMULATOR →</div></a>';
  }
  function bracketState(seeds){
    var pick=function(key,options){var p=+bracketPicks[key];return options.indexOf(p)>=0?p:null;};
    var playin=pick('playin',[seeds[3],seeds[4]]);
    var semi1=playin?pick('semi1',[seeds[0],playin]):null;
    var semi2=pick('semi2',[seeds[1],seeds[2]]);
    var final=semi1&&semi2?pick('final',[semi1,semi2]):null;
    return {playin:playin,semi1:semi1,semi2:semi2,final:final};
  }
  function bracketMatch(label,key,a,b,winner,seeds){
    if(!a||!b)return '<div class="pcl-sim-match pcl-sim-pending"><span class="pcl-sim-match-label">'+label+'</span><b>AWAITING PREVIOUS ROUND</b></div>';
    var sc=bracketScores[key],show=sc&&sc.a===a&&sc.b===b&&sc.winner===winner;
    var slot=function(id,points){
      var chosen=winner===id;
      return '<button type="button" class="pcl-sim-team'+(chosen?' pcl-sim-winner':'')+'" data-bracket-round="'+key+'" data-bracket-winner="'+id+'" aria-pressed="'+chosen+'">'+
        '<span class="pcl-sim-seed">#'+(seeds.indexOf(id)+1)+'</span>'+img(id)+'<strong>'+safe(name(id))+'</strong>'+
        (show?'<span class="pcl-sim-points">'+fmt(points)+'</span>':'')+
        (chosen?'<span class="pcl-sim-check">✓</span>':'')+'</button>';
    };
    return '<div class="pcl-sim-match"><span class="pcl-sim-match-label">'+label+'</span>'+
      slot(a,sc&&sc.scoreA)+'<span class="pcl-sim-vs">VS</span>'+slot(b,sc&&sc.scoreB)+'</div>';
  }
  function renderPlayoffSim(){
    var result=oddsForCurrentScenario();
    if(!result){root.innerHTML='<a class="pcl-route-back" href="#/playoff-calculator">← PLAYOFF CALCULATOR</a>'+
      '<div class="pcl-warning">Complete remaining regular-season matchups to project the playoff bracket.</div>';return;}
    var seeds=projectedTable(result).slice(0,SPOTS).map(function(t){return t.id;});
    var s=bracketState(seeds),champ=s.final;
    root.innerHTML='<a class="pcl-route-back" href="#/playoff-calculator">← PLAYOFF CALCULATOR</a>'+
      '<section class="pcl-sim-header"><div><div class="pcl-kicker">'+year+' · PROJECTED SEEDS</div><h2>PLAYOFF SIMULATOR</h2></div>'+
      '<div class="pcl-sim-actions"><button type="button" class="pcl-primary" data-bracket-run="1">SIMULATE PLAYOFFS</button><button type="button" data-bracket-reset="1">RESET BRACKET</button></div></section>'+
      (champ?'<div class="pcl-sim-champion">'+img(champ,'pcl-sim-champion-photo')+
        '<div><small>YOUR CHAMPION</small><strong>'+safe(name(champ))+'</strong></div><span>#'+(seeds.indexOf(champ)+1)+' SEED</span></div>':'')+
      '<div class="pcl-sim-bracket">'+
      '<section class="pcl-sim-round"><h3>WEEK 15 <span>PLAY-IN</span></h3>'+
      bracketMatch('#4 VS #5','playin',seeds[3],seeds[4],s.playin,seeds)+
      '<div class="pcl-sim-byes">BYES · #1 '+safe(name(seeds[0]))+' · #2 '+safe(name(seeds[1]))+' · #3 '+safe(name(seeds[2]))+'</div></section>'+
      '<section class="pcl-sim-round"><h3>WEEK 16 <span>SEMIFINALS</span></h3>'+
      bracketMatch('SEMIFINAL 1','semi1',seeds[0],s.playin,s.semi1,seeds)+
      bracketMatch('SEMIFINAL 2','semi2',seeds[1],seeds[2],s.semi2,seeds)+'</section>'+
      '<section class="pcl-sim-round"><h3>WEEK 17 <span>CHAMPIONSHIP</span></h3>'+
      bracketMatch('TITLE GAME','final',s.semi1,s.semi2,s.final,seeds)+'</section></div>';
  }
  function runBracketOnce(){
    var result=oddsForCurrentScenario();if(!result)return;
    var seeds=projectedTable(result).slice(0,SPOTS).map(function(t){return t.id;});
    var rng=rand((Date.now()^Math.floor(Math.random()*4294967296))>>>0),sim=postSeason(seeds,rng);
    bracketPicks={playin:sim.playin.winner,semi1:sim.semi1.winner,semi2:sim.semi2.winner,final:sim.final.winner};
    bracketScores={playin:sim.playin,semi1:sim.semi1,semi2:sim.semi2,final:sim.final};
    saveBracket();renderPlayoffSim();
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
     '<span><small>1 SEED</small><b>'+(r?pc(r.one):'—')+'</b></span>'+ 
      '<span><small>CHAMPION</small><b>'+(r?pc(r.champ):'—')+'</b></span>'+ 
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

 function playoffImpactGames(results,id){
   if(!results||!results._impacts)return {own:[],others:[]};
   // Exclude James matchups from the highlighted list only, never from the
   // simulation itself or the team's remaining schedule.
   var all=Object.values(results._impacts).filter(function(x){
     return !x.locked&&x.a!==10&&x.b!==10&&x.count[0]>=150&&x.count[1]>=150;
   }).map(function(x){
     function make(team,side){return (x.made[side][team]||0)/x.count[side];}
     var forA=make(id,0),forB=make(id,1),ownSwing=Math.abs(forA-forB);
     var aWin=make(x.a,0),aLoss=make(x.a,1);
     var bWin=make(x.b,1),bLoss=make(x.b,0);
     return {game:x,forA:forA,forB:forB,ownSwing:ownSwing,
       participants:[{id:x.a,win:aWin,loss:aLoss,swing:Math.abs(aWin-aLoss)},
                     {id:x.b,win:bWin,loss:bLoss,swing:Math.abs(bWin-bLoss)}]};
   });
   var own=all.filter(function(v){return v.game.a===id||v.game.b===id;})
     .sort(function(a,b){return b.ownSwing-a.ownSwing||a.game.week-b.game.week;}).slice(0,3);
   // Rank outside games by how much they move this selected team's chances.
   var others=all.filter(function(v){return v.game.a!==id&&v.game.b!==id;})
     .sort(function(a,b){return b.ownSwing-a.ownSwing||
       Math.max(b.participants[0].swing,b.participants[1].swing)-
       Math.max(a.participants[0].swing,a.participants[1].swing)||
       a.game.week-b.game.week;}).slice(0,3);
   return {own:own,others:others};
 }
 function implicationCard(entry,own){
   var g=entry.game,lock=picked[g.key]||{};
   var labels='<span class="pcl-implication-branch">'+safe(name(g.a))+' WIN: <b>'+pc(entry.forA)+'</b></span>'+
     '<span class="pcl-implication-branch">'+safe(name(g.b))+' WIN: <b>'+pc(entry.forB)+'</b></span>';
   var participantImpact=!own?'<div class="pcl-other-impact"><span class="pcl-other-impact-heading">HOW THIS AFFECTS THEIR PLAYOFF CHANCES</span>'+
     entry.participants.map(function(p){
       return '<div class="pcl-other-impact-team"><strong>'+safe(name(p.id))+'</strong>'+
         '<span>WIN <b>'+pc(p.win)+'</b></span><span>LOSS <b>'+pc(p.loss)+'</b></span>'+
         '<span class="pcl-other-impact-swing">'+(100*p.swing).toFixed(1)+' pp swing</span></div>';
     }).join('')+'</div>':'';
   return '<article class="pcl-implication"><div class="pcl-implication-top"><span class="pcl-implication-week">W'+g.week+'</span>'+
     '<span class="pcl-implication-teams">'+img(g.a)+safe(name(g.a))+'<em>vs</em>'+img(g.b)+safe(name(g.b))+'</span>'+
     '<span class="pcl-implication-swing"><b>'+(100*entry.ownSwing).toFixed(1)+' pp</b><small>IMPACT ON '+safe(name(selectedTeam).toUpperCase())+'</small></span></div>'+
     participantImpact+
     '<div class="pcl-implication-bottom"><div class="pcl-implication-context">'+labels+'</div>'+
     '<div class="pcl-implication-picks"><button data-key="'+g.key+'" data-winner="'+g.a+'" class="'+(lock.winner===g.a?'pcl-choice-on':'')+'">'+safe(name(g.a))+'</button>'+
     '<button data-key="'+g.key+'" data-winner="'+g.b+'" class="'+(lock.winner===g.b?'pcl-choice-on':'')+'">'+safe(name(g.b))+'</button>'+
     '<button data-auto="'+g.key+'" class="'+(!lock.winner?'pcl-choice-on':'')+'">AUTO</button></div></div></article>';
 }
 function renderTeamRoute(){
   var s=quickStats(selectedTeam),t=s.team,all=oddsForCurrentScenario(),r=all&&all[selectedTeam];
   var remaining=Math.max(0,END-firstWeek+1),paths=r&&r.path;
   var modeled=r?'<div class="pcl-route-chances">'+
     '<div><small>MAKE PLAYOFFS</small><strong>'+pc(r.playoffs)+'</strong></div>'+
     '<div><small>TOP-3 BYE</small><strong>'+pc(r.bye)+'</strong></div>'+
     '<div><small>FIRST SEED</small><strong>'+pc(r.one)+'</strong></div>'+ 
      '<div><small>CHAMPION</small><strong>'+pc(r.champ)+'</strong></div>'+
     '<div><small>PROJECTED WINS</small><strong>'+r.w.toFixed(1)+'</strong></div></div>':
     '<div class="pcl-warning">Official standings are available, but some future matchups are missing. Use the main What-If Calculator to complete the schedule and enable accurate odds.</div>';
   var pathRows='',likely=null,likelyProb=null,mostCommon=null;
   if(r){
     for(var w=0;w<=remaining;w++){
       var p=paths[String(w)],enough=p&&p.samples>=15,playoffs=enough?p.made/p.samples:null;
       if(enough&&playoffs>=.5&&likely===null){likely=w;likelyProb=playoffs;}
       if(!mostCommon||(p&&p.samples>mostCommon.samples))mostCommon={w:w,samples:p?p.samples:0};
       pathRows+='<tr><td><b>'+w+'</b> of '+remaining+'</td><td>'+(t.wins+w)+'–'+(t.losses+remaining-w)+'</td>'+
         '<td>'+(p?pc(p.samples/N):'—')+'</td>'+
         '<td>'+(enough?'<span class="pcl-route-likelihood">'+pc(playoffs)+'<i style="width:'+Math.round(playoffs*100)+'%"></i></span>':'—')+'</td>'+
         '<td>'+(enough?pc(p.bye/p.samples):'—')+'</td></tr>';
     }
   }
   var insights=r?'<div class="pcl-road-insights">'+
     '<span><small>PROJECTED REMAINING WINS</small><b>'+(r.w-t.wins).toFixed(1)+' / '+remaining+'</b></span>'+
     '<span><small>50%+ PLAYOFF CHANCE</small><b>'+(likely===null?'No qualifying sample':likely+' more win'+(likely===1?'':'s'))+'</b></span>'+
     '<span><small>MOST COMMON FINISH</small><b>'+(t.wins+(mostCommon?mostCommon.w:0))+'–'+(t.losses+remaining-(mostCommon?mostCommon.w:0))+'</b></span></div>':'';
   var seedHtml=r?'<div class="pcl-seed-grid">'+r.seeds.slice(0,5).map(function(p,i){
      return '<span><strong>#'+(i+1)+'</strong>'+pc(p)+'</span>';
   }).join('')+'</div>':'<p class="pcl-caption">Seed odds become available when the schedule is complete.</p>';
   var leagueAvg=standings.reduce(function(a,x){return a+strength[x.id].mean;},0)/standings.length;
   var games=allGames(),schedule=s.opp.map(function(o){
     var opponent=teamById[o.id],chance=modelMatchWinChance(selectedTeam,o.id);
     var game=games.find(function(g){return g.week===o.week&&(g.a===selectedTeam||g.b===selectedTeam);});
     var lock=game&&picked[game.key]||{},selected=lock.winner===selectedTeam,against=lock.winner===o.id;
     return '<div class="pcl-route-game"><span class="pcl-route-week">W'+o.week+'</span>'+img(o.id)+
       '<span class="pcl-route-opp"><b>'+safe(opponent.name)+'</b><small>'+opponent.wins+'–'+opponent.losses+' · '+fmt(strength[o.id].mean)+' model PPG</small></span>'+
       '<span class="pcl-route-win">'+pc(chance)+'<small>MODEL WIN CHANCE</small></span>'+
       '<div class="pcl-route-quick-controls"><button data-key="'+game.key+'" data-winner="'+selectedTeam+'" class="'+(selected?'pcl-choice-on':'')+'">WIN</button>'+
       '<button data-key="'+game.key+'" data-winner="'+o.id+'" class="'+(against?'pcl-choice-on':'')+'">LOSS</button>'+
       '<button data-auto="'+game.key+'" class="'+(!lock.winner?'pcl-choice-on':'')+'">AUTO</button></div></div>';
   }).join('');
   var biggest=playoffImpactGames(all,selectedTeam);
   var impactSection='<section class="section pcl-section"><div class="pcl-section-head"><h2>BIGGEST PLAYOFF-IMPLICATION GAMES</h2><span>BASED ON SIMULATED ODDS SWINGS</span></div>'+
     ''+
     '<div class="pcl-implication-columns">'+
     '<div class="pcl-implication-column"><h3>YOUR MOST IMPORTANT MATCHUPS</h3>'+
     (biggest.own.length?biggest.own.map(function(o){return implicationCard(o,true);}).join(''):'<p class="pcl-caption">No eligible unpicked matchups to highlight. Your full remaining schedule is shown below.</p>')+'</div>'+
     '<div class="pcl-implication-column"><h3>OTHER GAMES TO WATCH</h3>'+
     (biggest.others.length?biggest.others.map(function(o){return implicationCard(o,false);}).join(''):'<p class="pcl-caption">Other matchups need valid simulation samples before they can be ranked.</p>')+'</div></div>'+
     '<p class="pcl-caption">Odds swings are changes in percentage points estimated from the simulation. Games you have already picked are excluded from the highlighted list, but still count toward standings and playoff odds.</p></section>';
   root.innerHTML='<a href="#/playoff-calculator" class="pcl-route-back">← ALL PLAYOFF ODDS</a>'+
     '<section class="pcl-route-hero"><div class="pcl-route-person">'+img(selectedTeam,'pcl-route-portrait')+
     '<div><div class="pcl-kicker">TEAM PLAYOFF OUTLOOK</div><h2>'+safe(t.name)+'</h2><p>'+t.wins+'–'+t.losses+' · '+fmt(t.pf)+' PF · '+pc(s.model.allPlay)+' ALL-PLAY</p></div></div>'+
     modeled+'</section>'+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>ROAD TO THE PLAYOFFS</h2><span>'+remaining+' GAMES LEFT · FIVE TEAMS QUALIFY</span></div>'+
     insights+
     (r?'<div class="pcl-route-table-wrap"><table class="pcl-table pcl-route-table"><thead><tr><th>WINS FROM HERE</th><th>FINAL RECORD</th><th>CHANCE OF RECORD</th><th>PLAYOFF ODDS</th><th>TOP-3 BYE</th></tr></thead><tbody>'+pathRows+'</tbody></table></div>'+
     '<p class="pcl-caption">Odds by final record are conditional estimates. “—” indicates fewer than 15 simulated finishes, not elimination or an official clinch.</p>':
     '<p class="pcl-caption">Complete the missing schedule in the main What-If Calculator to see the path by final record.</p>')+
     '<div class="pcl-route-actions"><button data-path="win">SIMULATE WINNING OUT</button><button data-path="lose">SIMULATE LOSING OUT</button><button data-path="reset">RESET '+safe(t.name).toUpperCase()+' MATCHUPS</button></div></section>'+
     impactSection+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>REMAINING SCHEDULE</h2><span>CHOOSE WIN · LOSS · AUTO DIRECTLY BELOW</span></div>'+
     '<div class="pcl-route-summary"><span>OPPONENT AVG <b>'+(s.opp.length?fmt(s.oppAvg):'—')+'</b></span><span>LEAGUE AVG <b>'+fmt(leagueAvg)+'</b></span>'+
     '<span>MODEL POINTS/WK <b>'+fmt(s.model.mean)+'</b></span></div>'+
     '<div class="pcl-route-games">'+(schedule||'<div class="pcl-caption">No confirmed future matchups available.</div>')+'</div></section>'+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>SEED OUTLOOK</h2><span>FIRST THROUGH FIFTH SEED</span></div>'+seedHtml+
     '<div class="pcl-route-detail-stats"><span>LAST 3 AVG <b>'+fmt(s.model.recent)+'</b></span><span>SEASON AVG <b>'+fmt(s.model.season)+'</b></span>'+
     '<span>ALL-PLAY <b>'+pc(s.model.allPlay)+'</b></span></div></section>'+
     '<a class="pcl-path-link pcl-bottom-cta" href="#/playoff-calculator">ALL-TEAM PLAYOFF ODDS →</a>'+
     '<p class="pcl-caption">Odds are estimates. Only finalized games count.</p>';
 }
 function renderWeeks(){
   var controls=root.querySelector('#pclWeeks');
   if(!controls)return;
   controls.innerHTML=Object.keys(weeks).map(function(w){
     return '<button type="button" class="'+(+w===selectedWeek?'pcl-week-active':'')+'" data-week="'+w+'">W'+w+(weeks[w]?'':' !')+'</button>';
   }).join('')||'<span class="pcl-caption">Regular season is complete.</span>';
   var holder=root.querySelector('#pclGames'),pairs=weeks[selectedWeek];
   if(!pairs){
     holder.innerHTML='<div class="pcl-warning"><strong>Week '+selectedWeek+' schedule unavailable</strong><p>Sleeper has not exposed matchup pairs. Enter this week’s five games below to use them for the odds model.</p></div>'+scheduleEditor();
     return;
   }
   var rows=pairs.map(function(pair){
     var a=+pair[0],b=+pair[1],key=matchKey(selectedWeek,a,b),lock=picked[key]||{};
     var status=lock.winner===a?'pcl-choice-on':'',statusB=lock.winner===b?'pcl-choice-on':'';
     return '<div class="pcl-match'+(a===selectedTeam||b===selectedTeam?' pcl-match-featured':'')+'">'+
       '<button type="button" class="pcl-side '+status+'" data-key="'+key+'" data-winner="'+a+'" aria-pressed="'+(lock.winner===a)+'">'+img(a)+'<span>'+safe(name(a))+'</span></button>'+
       '<span class="pcl-vs">VS</span>'+
       '<button type="button" class="pcl-side '+statusB+'" data-key="'+key+'" data-winner="'+b+'" aria-pressed="'+(lock.winner===b)+'">'+img(b)+'<span>'+safe(name(b))+'</span></button>'+
       '<button type="button" class="pcl-auto '+(!lock.winner?'pcl-choice-on':'')+'" data-auto="'+key+'" aria-label="Automatically simulate '+safe(name(a))+' versus '+safe(name(b))+'">AUTO</button></div>';
   }).join('');
   holder.innerHTML='<div class="pcl-schedule-source">'+(sources[selectedWeek]==='manual'?'MANUAL SCHEDULE':'SLEEPER SCHEDULE')+'</div>'+rows;
 }
 function scheduleEditor(){
   var options='<option value="">Choose team</option>'+standings.slice().sort(function(a,b){return a.id-b.id;}).map(function(t){return '<option value="'+t.id+'">'+safe(t.name)+'</option>';}).join('');
   var rows=Array.from({length:5},function(_,i){return '<div class="pcl-edit-pair"><span>GAME '+(i+1)+'</span><select data-editor-row="'+i+'" data-editor-side="0">'+options+'</select><b>vs</b><select data-editor-row="'+i+'" data-editor-side="1">'+options+'</select></div>';}).join('');
   return '<div class="pcl-schedule-editor"><h3>ENTER WEEK '+selectedWeek+' MATCHUPS</h3><p>Choose each team exactly once. This schedule will be saved on your device until Sleeper publishes its own matchups.</p>'+rows+'<button type="button" data-save-schedule="1" class="pcl-primary">USE THESE MATCHUPS</button><p class="pcl-editor-error" id="pclEditError"></p></div>';
 }
 function reRender(){
   if(!document.getElementById('figPlayoffCalc'))return;
   if(routeMode==='team'){renderTeamRoute();return;}
   if(routeMode==='bracket'){renderPlayoffSim();return;}
   renderOdds();
   renderBracket(oddsResults);
   renderWeeks();
   root.querySelector('#pclMissing').textContent=missingWeeks().length?'Missing schedules: '+missingWeeks().map(function(w){return 'W'+w;}).join(', '):'All remaining weeks scheduled';
 }
 function handleClick(event){
   var sb=event.target.closest('button[data-bracket-run],button[data-bracket-reset],button[data-bracket-round]');
   if(sb&&root.contains(sb)){
     if(sb.dataset.bracketRun!==undefined){runBracketOnce();return;}
     if(sb.dataset.bracketReset!==undefined){bracketPicks={};bracketScores={};saveBracket();renderPlayoffSim();return;}
     var key=sb.dataset.bracketRound,id=+sb.dataset.bracketWinner;
     if(['playin','semi1','semi2','final'].indexOf(key)<0||!teamById[id])return;
     if(bracketPicks[key]===id)delete bracketPicks[key];else bracketPicks[key]=id;
     delete bracketScores[key];
     if(key==='playin'){delete bracketPicks.semi1;delete bracketScores.semi1;}
     if(key==='playin'||key==='semi1'||key==='semi2'){delete bracketPicks.final;delete bracketScores.final;}
     saveBracket();renderPlayoffSim();return;
   }

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
 }
 function renderShell(){
   root.innerHTML='<section class="pcl-overview"><div class="pcl-kicker">'+year+' · FIVE-TEAM PLAYOFF FORMAT · WEEKS 1–14</div>'+
     '<div class="pcl-headline"><div><h2>THE PLAYOFF LAB</h2></div>'+
     '<div class="pcl-status"><span class="pcl-status-label">OFFICIAL RESULTS THROUGH</span><strong>WEEK '+(firstWeek-1)+'</strong><span id="pclMissing"></span></div></div>'+
     '</section>'+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>PLAYOFF ODDS</h2><span>TOP 5 QUALIFY · TOP 3 BYES</span></div><div id="pclOdds"></div></section>'+
     '<section id="pclWeekArea" class="section pcl-section pcl-whatif"><div class="pcl-section-head"><h2>WHAT-IF CALCULATOR</h2><span>TAP A WINNER · NO SCORES NEEDED</span></div>'+
     '<div class="pcl-actions"><button type="button" data-reset="1">RESET SCENARIO</button><button type="button" data-refresh="1">RECHECK SLEEPER</button></div>'+
     '<div class="pcl-week-tabs" id="pclWeeks"></div><div class="pcl-match-list" id="pclGames"></div></section>'+
     '<section class="section pcl-section"><div class="pcl-section-head"><h2>PROJECTED PLAYOFF BRACKET</h2><span>BASED ON PROJECTED SEEDS</span></div><div id="pclBracket"></div></section>'+
     '<div class="pcl-disclaimer">Odds are projections, not clinches. Only finalized scores count.</div>';
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
   picked=read('picks');
   // Old manually entered scores should not silently override the new winner-only UI.
   Object.keys(picked).forEach(function(key){
     var p=picked[key];if(!p||typeof p!=='object'){delete picked[key];return;}
     if(p.aPts!==undefined||p.bPts!==undefined){if(p.winner)picked[key]={winner:p.winner};else delete picked[key];}
   });
   customSchedule=read('schedule');scoreDrafts={};
   var storedBracket=read('bracket');bracketPicks=storedBracket.picks||{};bracketScores=storedBracket.scores||{};
   routeMode=routeType==='team'?'team':routeType==='bracket'?'bracket':'main';selectedTeam=routeMode==='team'&&teamById[+routeValue]?+routeValue:1;
   lastOddsKey=null;cachedOdds=null;
   if(routeType==='week'&&Number.isInteger(+routeValue)&&+routeValue>=firstWeek&&+routeValue<=END)selectedWeek=+routeValue;
   app.innerHTML=hero('LEAGUE PLAYOFF PICTURE','PLAYOFF CALCULATOR','Five teams make it. Play out the remaining schedule, or let the odds model do the work.')+'<div id="figPlayoffCalc" class="pcl"></div>';
   root=document.getElementById('figPlayoffCalc');
   if(routeMode==='main'){
     renderShell();root.querySelector('#pclOdds').innerHTML='<div class="pcl-loading">Checking upcoming matchups with Sleeper…</div>';
   }else{
     root.innerHTML='<div class="pcl-loading">Loading playoff projections…</div>';
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
