/* FIG 2026–2031 contender outlook. Scenario-based relative strength; not official title odds.
   Annual player aging, verified future picks, uncertain rookie outcomes.
   The model has no team-name adjustments or guaranteed playoff outcomes. */
(function(global){
 'use strict';
 const HORIZON=2031,TAIL_HORIZON=2033,TRIALS=3500;
 // Ten franchises and one champion: 10% is the equal-share championship
 // benchmark, not a threshold tuned against any specific team.
 const EQUITABLE_TITLE_SHARE=100/10;
 const POS=new Set(['QB','RB','WR','TE']);
 const CURVES={
  QB:[[19,.76],[22,.88],[24,.98],[26,1.06],[29,1.11],[31,1.09],[33,1.03],[35,.92],[38,.70],[41,.40],[45,.10]],
  RB:[[19,.78],[21,.92],[23,1.02],[25,1.06],[26,1.01],[27,.90],[28,.77],[30,.46],[33,.14],[36,.04]],
  WR:[[19,.72],[22,.86],[24,1],[26,1.10],[28,1.12],[29,1.06],[31,.89],[33,.66],[35,.39],[38,.12]],
  TE:[[19,.64],[23,.79],[25,.95],[27,1.07],[29,1.12],[31,1.07],[33,.87],[35,.57],[38,.22],[42,.08]]
 };
 function value(x){const n=Number(x);return Number.isFinite(n)?Math.max(0,n):0;}
 function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
 function average(a){return a.reduce((s,n)=>s+n,0)/Math.max(1,a.length);}
 function deviation(a){
  const m=average(a);
  return Math.sqrt(average(a.map(v=>(v-m)**2)));
 }
 function marketCalibration(teams){
  // Empirically calibrate a monotonic cap -> PPG curve on all ten current
  // franchises, not on selected owners. Weekly PPG differences have only
  // a small residual after accounting for active lineup market value.
  const xs=teams.map(t=>Math.log(t.baseCapital+2000));
  const ys=teams.map(t=>t.ppg);
  const mx=average(xs),my=average(ys);
  const xx=xs.reduce((sum,x)=>sum+(x-mx)**2,0);
  const xy=xs.reduce((sum,x,i)=>sum+(x-mx)*(ys[i]-my),0);
  const slope=clamp(xx>0?xy/xx:0,0,110);
  const intercept=my-slope*mx;
  return {slope,intercept,score:cap=>clamp(intercept+slope*Math.log(Math.max(0,cap)+2000),35,300)};
 }
 function playoffChampion(rankings,teamInfo,rng){
  // Exactly the actual 5-team structure: 4v5 play-in, 1vplay-in,
  // 2v3 semifinal, then title game. The seeds below use projected
  // underlying strength, not future schedules or official standing odds.
  const byId=new Map(teamInfo.map(t=>[t.id,t]));
  function game(a,b){
   const sdA=byId.get(a.id).weeklySd,sdB=byId.get(b.id).weeklySd;
   const scoreA=a.ppg+sdA*normal(rng),scoreB=b.ppg+sdB*normal(rng);
   return scoreA>=scoreB?a:b;
  }
  const seeds=rankings.slice(0,5);
  const playIn=game(seeds[3],seeds[4]);
  const semi1=game(seeds[0],playIn);
  const semi2=game(seeds[1],seeds[2]);
  return game(semi1,semi2).id;
 }
 function ageCurve(pos,age){
  const points=CURVES[String(pos||'').toUpperCase()];
  if(!points)return .6;
  if(age<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++){
   if(age<=points[i][0]){
    const p=points[i-1],q=points[i],f=(age-p[0])/(q[0]-p[0]);
    return p[1]+f*(q[1]-p[1]);
   }
  }
  return .04;
 }
 function generator(seed){
  let state=seed>>>0;
  return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return ((state>>>0)+.5)/4294967296;};
 }
 function normal(rng){return Math.sqrt(-2*Math.log(Math.max(1e-9,rng())))*Math.cos(2*Math.PI*rng());}
 function playersFor(team,playerValue){
  return [...new Map((team.roster||[]).map(p=>[String(p.player_id),p])).values()]
   .filter(p=>POS.has(String(p.position).toUpperCase()))
   .map(p=>({pos:String(p.position).toUpperCase(),age:Number(p.age),v:value(playerValue(p.player_id))}));
 }
 function capital(roster){
  // Optimize a LEGAL 10-player superflex lineup, rather than pretending ten
  // valuable wide receivers can fill QB/RB/TE requirements. This matters most
  // when a franchise has weak starting-QB depth or concentrated rookie picks.
  const candidates=roster.map(p=>({pos:p.pos,v:value(p.v)}));
  const used=new Set();
  function fill(allowed){
   let best=-1;
   for(let i=0;i<candidates.length;i++){
    if(used.has(i)||!allowed.includes(candidates[i].pos))continue;
    if(best<0||candidates[i].v>candidates[best].v)best=i;
   }
   if(best<0)return 0;
   used.add(best);
   return candidates[best].v;
  }
  let starters=0;
  for(const [allowed,count] of [[['QB'],1],[['RB'],2],[['WR'],3],[['TE'],1],
    [['RB','WR','TE'],2],[['QB','RB','WR','TE'],1]]){
   for(let j=0;j<count;j++)starters+=fill(allowed);
  }
  const bench=candidates.filter((p,i)=>!used.has(i)).map(p=>p.v).sort((a,b)=>b-a);
  return starters+.24*bench.slice(0,10).reduce((s,n)=>s+n,0);
 }
 // Original rounds 1–4 appear three draft years ahead. Existing 2027–29
 // trades are authoritative; newly issued 2030+ picks are assumed untraded.
 // These remain draft assets and do not directly increase projected PPG.
 function marketPickValue(market,round,yearsAway){
  const tierYear=yearsAway<=1?2027:yearsAway===2?2028:2029;
  return value(market&&market.future_picks&&market.future_picks[tierYear+':'+round+':mid']);
 }
 function addNewOriginalPicks(state,season,market){
  const draftYear=season+3;
  if(draftYear<=state.base.latestKnownDraftYear)return;
  for(let round=1;round<=4;round++){
   const exists=state.picks.some(p=>p.year===draftYear&&p.round===round&&p.original===state.id);
   if(!exists){
    const price=marketPickValue(market,round,3);
    if(price>0)state.picks.push({year:draftYear,round,original:state.id,value:price,initialDistance:3,inferred:true});
   }
  }
 }
 function currentPickValue(pick,season,market){
  const initial=marketPickValue(market,pick.round,Math.max(1,pick.initialDistance));
  const now=marketPickValue(market,pick.round,Math.max(1,pick.year-season));
  return initial>0&&now>0?pick.value*now/initial:pick.value;
 }
 function futureDraftCapital(state,season,market){
  const future=state.picks.filter(p=>p.year>season);
  return {value:future.reduce((sum,p)=>sum+currentPickValue(p,season,market),0),count:future.length,
   years:future.map(p=>p.year)};
 }
 function pickValuation(pick,lookup,year){
  const y=Number(pick.pick_season);
  if(y<=year||y>TAIL_HORIZON+3)return null;
  const p=value(lookup(pick));
  return p>0?{year:y,value:p,round:Number(pick.round),original:Number(pick.original_franchise_id),initialDistance:y-year,inferred:false}:null;
 }
 function validate(input){
  const {teams,weeklyRanks,year,playerValue,pickValue}=input;
  if(!Array.isArray(teams)||teams.length!==10||new Set(teams.map(t=>Number(t.id))).size!==10)throw Error('Expected 10 distinct franchises');
  if(typeof playerValue!=='function'||typeof pickValue!=='function')throw Error('Player/pick valuations required');
  if(!Array.isArray(weeklyRanks)||!Number.isInteger(year)||year<2023||year>HORIZON)throw Error('Invalid scoring year');
  const scoringModel=input.currentModel||(global&&global.figDynastyWindowModel);
  if(!scoringModel||typeof scoringModel.projected!=='function')throw Error('Existing PPG model required');
  const scoreRows=weeklyRanks.filter(r=>Number(r.season)===year&&Number(r.week)>=1&&Number(r.week)<=14&&Number.isFinite(Number(r.points_for)));
  const latestKnownDraftYear=Math.max(year,...teams.flatMap(t=>(t.asset&&t.asset.picks||[]).map(p=>Number(p.pick_season)||year)));
  const teamsData=teams.map(t=>{
   const id=Number(t.id);
   const scores=scoreRows.filter(s=>Number(s.franchise_id)===id).sort((a,b)=>Number(a.week)-Number(b.week)).map(x=>Number(x.points_for));
   const model=scoringModel.projected(scores,[]);
   // Use observed PPG dispersion and cap implausible tiny/huge samples;
   // no schedule adjustment enters the annual strength forecast.
   const weeklySd=clamp(deviation(scores),18,39);
   const roster=playersFor(t,playerValue);
   const total=roster.reduce((s,p)=>s+p.v,0);
   const covered=roster.filter(p=>Number.isFinite(p.age)&&p.age>=18&&p.age<=50).reduce((s,p)=>s+p.v,0);
   const picks=(t.asset&&t.asset.picks||[]).map(p=>pickValuation(p,pickValue,year)).filter(Boolean);
   return {id,ppg:model&&model.ppg,roster,picks,latestKnownDraftYear,
    ageCoverage:total>0?covered/total:0,baseCapital:capital(roster),
    total:value(t.value),pickCapital:value(t.picks),weeklySd,hasScores:scores.length>=5};
  });
  const ready=teamsData.every(t=>t.hasScores&&t.roster.length>=10&&t.ageCoverage>=.90&&t.baseCapital>0);
  return {ready,teams:teamsData,year};
 }
 function seasonStep(state,year,rng,market){
  addNewOriginalPicks(state,year,market);
  const next=[];
  for(const p of state.players){
   const before=ageCurve(p.pos,p.age),after=ageCurve(p.pos,p.age+1);
   const growth=clamp(after/Math.max(.05,before),.28,1.28);
   const uncertainty=clamp(1+.115*normal(rng),.50,1.49);
   const maturity=p.rookieYear===undefined?1:
     ((year-p.rookieYear<=0?.38:year-p.rookieYear===1?.70:year-p.rookieYear===2?.90:1)/
      (year-1-p.rookieYear<=0?.38:year-1-p.rookieYear===1?.70:year-1-p.rookieYear===2?.90:1));
   const v=p.v*growth*uncertainty*maturity;
   if(v>35)next.push({pos:p.pos,age:p.age+1,v,rookieYear:p.rookieYear});
  }
  // Conservative baseline: only tradeable future picks that the Sleeper
  // snapshot actually credits to this franchise. No assumed acquisitions.
  const arrivals=state.picks.filter(p=>p.year===year);
  for(const pick of arrivals){
   // Dynasty pick price is an optimistic TRADE value, not guaranteed rookie
   // fantasy production. Outcomes include busts, contributors, and rare stars.
   // Even successful rookies usually take several seasons to reach full impact.
   const draw=rng();
   const realized=draw<.35?.07+.25*rng():draw<.80?.35+.42*rng():1+.50*rng();
   const pos=['RB','WR','WR','TE','QB'][Math.floor(rng()*5)];
   next.push({pos,age:pos==='QB'?23:22,v:currentPickValue(pick,year-1,market)*realized*.38,rookieYear:year});
  }
  // Do not assume any successful future trades. Any young replacements
  // enter only through the franchise's actual current draft-pick holdings.
  state.players=next;
 }
 function makeSeed(input){
  let seed=2166136261;
  for(const t of input.teams.slice().sort((a,b)=>a.id-b.id)){
   seed=Math.imul(seed^(Math.round(t.total*10+t.baseCapital+t.pickCapital)),16777619)>>>0;
   for(const p of t.roster)seed=Math.imul(seed^(Math.round(p.v)+p.age*17),16777619)>>>0;
  }
  return (seed^input.year^0x41234011)>>>0||87431;
 }
 function forecast(input){
  const data=validate(input),years=Array.from({length:HORIZON-data.year+1},(_,i)=>data.year+i);
  const simulatedYears=Array.from({length:TAIL_HORIZON-data.year+1},(_,i)=>data.year+i);
  if(!data.ready)return {ready:false,years,teams:data.teams,reason:'Missing completed scores or verified roster values'};
  const calibration=marketCalibration(data.teams);
  const initialMeanCapital=average(data.teams.map(t=>t.baseCapital));
  const values=Object.fromEntries(data.teams.map(t=>[t.id,simulatedYears.map(y=>({year:y,topThree:0,championships:0,sum:0,pickCapital:0,pickCount:0,allScores:[]}))]));
  const rng=generator(makeSeed(data));
  for(let trial=0;trial<TRIALS;trial++){
   const states=data.teams.map(t=>({id:t.id,base:t,players:t.roster.map(p=>({...p})),picks:t.picks.map(p=>({...p}))}));
   for(let yi=0;yi<simulatedYears.length;yi++){
    const season=simulatedYears[yi],offset=season-data.year;
    if(offset>0)states.forEach(st=>seasonStep(st,season,rng,input.market));
    const capitals=states.map(st=>capital(st.players));
    const currentMean=average(capitals);
    // Express the pool in today's market units. Common changes in league
    // asset prices should not manufacture fantasy scoring inflation/deflation.
    const marketRebase=clamp(initialMeanCapital/Math.max(1,currentMean),.67,1.5);
    const scores=states.map((st,i)=>{
     const team=st.base,assetPPG=calibration.score(capitals[i]*marketRebase);
     const initialAssetPPG=calibration.score(team.baseCapital);
     // The unexplained portion of a seven-week scoring sample fades quickly.
     // Do NOT carry virtually all of a 2026 scoring edge forward to 2031.
     const residual=(team.ppg-initialAssetPPG)*Math.pow(.48,offset);
     const uncertainty=(5+3.1*offset)*normal(rng);
     return {id:team.id,ppg:clamp(assetPPG+residual+uncertainty,35,300)};
    });
    const ranks=scores.slice().sort((a,b)=>b.ppg-a.ppg||a.id-b.id);
    const champion=playoffChampion(ranks,data.teams,rng);
    ranks.forEach((item,rank)=>{
     const row=values[item.id][yi];
     row.sum+=item.ppg;
     const stock=futureDraftCapital(states.find(st=>st.id===item.id),season,input.market);
     row.pickCapital+=stock.value;
     row.pickCount+=stock.count;
     if(rank<3)row.topThree++;
     if(item.id===champion)row.championships++;
     row.allScores.push(item.ppg);
    });
   }
  }
  const output=data.teams.map(t=>{
   const fullOutlook=values[t.id].map(v=>{
    const points=v.allScores.sort((a,b)=>a-b);
    return {year:v.year,topThree:Math.round(v.topThree/TRIALS*1000)/10,
      titleChance:Math.round(v.championships/TRIALS*1000)/10,
      strength:Math.round(v.sum/TRIALS*10)/10,
      futurePickCapital:Math.round(v.pickCapital/TRIALS),
      futurePickCount:Math.round(v.pickCount/TRIALS),
      low:Math.round(points[Math.floor(.15*(points.length-1))]*10)/10,
      high:Math.round(points[Math.floor(.85*(points.length-1))]*10)/10};
   });
   const outlook=fullOutlook.filter(y=>y.year<=HORIZON);
   const qualified=fullOutlook.map((o,i)=>o.titleChance>=EQUITABLE_TITLE_SHARE?i:-1).filter(i=>i>=0);
   const open=qualified.length?qualified[0]:-1;
   let close=-1;
   if(open>=0){close=open;while(close+1<fullOutlook.length&&fullOutlook[close+1].titleChance>=EQUITABLE_TITLE_SHARE)close++;}
   const peak=fullOutlook.slice().sort((a,b)=>b.strength-a.strength||a.year-b.year)[0];
   const peakYear=peak.year>HORIZON?String(HORIZON+1)+'+':peak.year;
   const beyond=open>=0&&fullOutlook[close].year>=HORIZON;
   // The open-ended label NEVER promises a later championship. There is no
   // supported exact closing or opening year beyond the visible horizon.
   const window=open<0?'2032+ · TBD':fullOutlook[open].year>HORIZON?
     '2032+ · Possible':
     (open===0?'Now':String(fullOutlook[open].year))+'–'+
     (beyond?HORIZON+'+':fullOutlook[close].year);
   const status=open<0?(outlook[0].titleChance>=5?'On the bubble':'Building'):
     fullOutlook[open].year>HORIZON?'Long-range possibility':
     open===0?(beyond?'Sustained contender':close<=1?'Win-now':'Contending'):
     open<=2?'Rising contender':'Long-term rebuild';
   return {id:t.id,outlook,openYear:open<0?null:fullOutlook[open].year,
    endYear:open<0?null:fullOutlook[close].year,throughHorizon:beyond,window,status,
    seasonsInWindow:open<0?0:close-open+1,
    peakYear,peakChance:peak.topThree,peakTitleChance:peak.titleChance,
    farChance:outlook.at(-1).titleChance,ageCoverage:t.ageCoverage,
    baselinePPG:t.ppg,expectedContendingSeasons:Math.round(outlook.reduce((sum,y)=>sum+y.titleChance/EQUITABLE_TITLE_SHARE,0)*10)/10,
    capital:t.total,picks:t.pickCapital};
  }).sort((a,b)=>b.outlook[0].titleChance-a.outlook[0].titleChance||a.id-b.id);
  return {ready:true,years,teams:output,trials:TRIALS,tailHorizon:TAIL_HORIZON,metric:'Hypothetical neutral-playoff championship rate',benchmark:EQUITABLE_TITLE_SHARE,calibration:{slope:calibration.slope}};
 }
 const api={forecast,ageCurve,validate,TRIALS,HORIZON,TAIL_HORIZON,EQUITABLE_TITLE_SHARE,marketCalibration,marketPickValue,addNewOriginalPicks,currentPickValue,futureDraftCapital};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figDynastyWindowForecast=api;
})(typeof window!=='undefined'?window:null);
