/* FIG 2026–2031 contender outlook. Scenario-based relative strength; not title odds.
   Annual market evolution, uncertain rookie outcomes, asset-conserving retooling.
   The model has no team-name adjustments or guaranteed playoff outcomes. */
(function(global){
 'use strict';
 const HORIZON=2031,TRIALS=1600,ELASTICITY=.75,CONTENDER_THRESHOLD=60;
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
 function pickValuation(pick,lookup,year){
  const y=Number(pick.pick_season);
  if(y<=year||y>HORIZON)return null;
  const p=value(lookup(pick));
  return p>0?{year:y,value:p,round:Number(pick.round)}:null;
 }
 function validate(input){
  const {teams,weeklyRanks,year,playerValue,pickValue}=input;
  if(!Array.isArray(teams)||teams.length!==10||new Set(teams.map(t=>Number(t.id))).size!==10)throw Error('Expected 10 distinct franchises');
  if(typeof playerValue!=='function'||typeof pickValue!=='function')throw Error('Player/pick valuations required');
  if(!Array.isArray(weeklyRanks)||!Number.isInteger(year)||year<2023||year>HORIZON)throw Error('Invalid scoring year');
  const scoringModel=input.currentModel||(global&&global.figDynastyWindowModel);
  if(!scoringModel||typeof scoringModel.projected!=='function')throw Error('Existing PPG model required');
  const scoreRows=weeklyRanks.filter(r=>Number(r.season)===year&&Number(r.week)>=1&&Number(r.week)<=14&&Number.isFinite(Number(r.points_for)));
  const globalKnownPickYear=Math.max(year,...teams.flatMap(t=>(t.asset?.picks||[]).map(p=>Number(p.pick_season)||year)));
  const teamsData=teams.map(t=>{
   const id=Number(t.id);
   const scores=scoreRows.filter(s=>Number(s.franchise_id)===id).sort((a,b)=>Number(a.week)-Number(b.week)).map(x=>Number(x.points_for));
   const model=scoringModel.projected(scores,[]);
   const roster=playersFor(t,playerValue);
   const total=roster.reduce((s,p)=>s+p.v,0);
   const covered=roster.filter(p=>Number.isFinite(p.age)&&p.age>=18&&p.age<=50).reduce((s,p)=>s+p.v,0);
   const picks=(t.asset&&t.asset.picks||[]).map(p=>pickValuation(p,pickValue,year)).filter(Boolean);
   const lastKnownPickYear=globalKnownPickYear;
   return {id,ppg:model&&model.ppg,roster,picks,lastKnownPickYear,
    ageCoverage:total>0?covered/total:0,baseCapital:capital(roster),
    total:value(t.value),pickCapital:value(t.picks),hasScores:scores.length>=5};
  });
  const ready=teamsData.every(t=>t.hasScores&&t.roster.length>=10&&t.ageCoverage>=.90&&t.baseCapital>0);
  return {ready,teams:teamsData,year};
 }
 function convertVeterans(roster,rng){
  const threshold={QB:33,RB:26,WR:29,TE:30};
  const list=roster.filter(p=>p.age>threshold[p.pos]&&p.v>250)
    .sort((a,b)=>(b.age-threshold[b.pos])-(a.age-threshold[a.pos]));
  let moved=0;
  for(const p of list){
   if(moved>=2)break;
   if(rng()>.23)continue;
   // Sale proceeds are discounted; the original player leaves the asset pool.
   const proceeds=p.v*(.70+.20*rng());
   p.v=0;
   roster.push({pos:p.pos,age:p.pos==='QB'?25:23,
      v:proceeds*clamp(.89+.17*normal(rng),.40,1.18)});
   moved++;
  }
 }
 function consolidateBench(roster,rng){
  const ordered=roster.filter(p=>p.v>100).sort((a,b)=>b.v-a.v);
  if(ordered.length<13)return;
  const core=ordered.slice(0,10).reduce((s,p)=>s+p.v,0);
  const bench=ordered.slice(10).reduce((s,p)=>s+p.v,0);
  const probability=clamp(.14+.60*bench/Math.max(1,core),.14,.65);
  if(rng()>probability)return;
  // Exchange two nonstarter assets for one younger starter-quality asset,
  // accepting a 10–25% value haircut. This models OPTIONAL retooling,
  // without creating value or assuming managers make perfect trades.
  const candidates=ordered.slice(10).sort((a,b)=>b.v-a.v);
  if(candidates.length<2)return;
  const a=candidates[0],b=candidates[1];
  const proceeds=(a.v+b.v)*(.75+.15*rng());
  if(proceeds<300)return;
  a.v=0;b.v=0;
  const pos=rng()<.32?'QB':rng()<.4?'TE':'WR';
  roster.push({pos,age:pos==='QB'?24:23,v:proceeds});
 }
 function seasonStep(state,year,rng,market){
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
  const arrivals=state.picks.filter(p=>p.year===year);
  if(year>state.base.lastKnownPickYear){
   // Untraded future picks beyond the known traded-pick horizon.
   // These arise for every franchise equally, not as guaranteed acquisitions.
   // Low-to-mid-round prices are used at a haircut due to uncertainty.
   for(let round=1;round<=4;round++){
    const estimated=value(market.future_picks?.['2029:'+round+':mid']);
    if(estimated>0)arrivals.push({year,value:estimated*.70,round});
   }
  }
  for(const pick of arrivals){
   // Dynasty pick price is an optimistic TRADE value, not guaranteed rookie
   // fantasy production. Outcomes include busts, contributors, and rare stars.
   // Even successful rookies usually take several seasons to reach full impact.
   const draw=rng();
   const realized=draw<.35?.07+.25*rng():draw<.80?.35+.42*rng():1+.50*rng();
   const pos=['RB','WR','WR','TE','QB'][Math.floor(rng()*5)];
   next.push({pos,age:pos==='QB'?23:22,v:pick.value*realized*.38,rookieYear:year});
  }
  convertVeterans(next,rng);
  consolidateBench(next,rng);
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
  if(!data.ready)return {ready:false,years,teams:data.teams,reason:'Missing completed scores or verified roster values'};
  const initialMean=average(data.teams.map(t=>t.ppg));
  const initialMeanCapital=average(data.teams.map(t=>t.baseCapital));
  const values=Object.fromEntries(data.teams.map(t=>[t.id,years.map(y=>({year:y,topThree:0,sum:0,relativeSum:0,allScores:[]}))]));
  const rng=generator(makeSeed(data));
  for(let trial=0;trial<TRIALS;trial++){
   const states=data.teams.map(t=>({id:t.id,base:t,players:t.roster.map(p=>({...p})),picks:t.picks}));
   for(let yi=0;yi<years.length;yi++){
    const season=years[yi],offset=season-data.year;
    if(offset>0)states.forEach(st=>seasonStep(st,season,rng,input.market||{}));
    const scores=states.map(st=>{
     const t=st.base;
     const coreNow=capital(st.players);
     const assetChange=Math.pow((coreNow+1200)/(t.baseCapital+1200),ELASTICITY);
     // Proven current scoring is our starting anchor. Future changes are driven
     // by position-specific development, realized picks and optional retooling.
     // Apply mild uncertainty regression, not a forced return to league average.
     const baseline=initialMean+(t.ppg-initialMean)*Math.pow(.986,offset);
     // Capital is valued using 1 QB, 2 RB, 3 WR, 1 TE, 2 FLEX and 1 SF.
   // Long-range scoring also reflects today's verified core quality, not
   // merely growth from a tiny starting roster. No owner-specific adjustment.
   const qualityAnchor=19*Math.log((t.baseCapital+2000)/(initialMeanCapital+2000))*(1-Math.exp(-.46*offset));
   const futureStrength=baseline*assetChange+qualityAnchor;
     const noise=(6+3.8*offset)*normal(rng);
     return {id:t.id,ppg:clamp(futureStrength+noise,35,300)};
    });
    const mean=average(scores.map(s=>s.ppg));
    scores.sort((a,b)=>b.ppg-a.ppg||a.id-b.id);
    scores.forEach((item,rank)=>{
     const row=values[item.id][yi];
     row.sum+=item.ppg;
     row.relativeSum+=item.ppg-mean;
     if(rank<3)row.topThree++;
     row.allScores.push(item.ppg);
    });
   }
  }
  const output=data.teams.map(t=>{
   const outlook=values[t.id].map(v=>{
    const points=v.allScores.sort((a,b)=>a-b);
    return {year:v.year,topThree:Math.round(v.topThree/TRIALS*1000)/10,
      strength:Math.round(v.sum/TRIALS*10)/10,
      advantage:Math.round(v.relativeSum/TRIALS*10)/10,
      low:Math.round(points[Math.floor(.15*(points.length-1))]*10)/10,
      high:Math.round(points[Math.floor(.85*(points.length-1))]*10)/10};
   });
   const qualified=outlook.map((o,i)=>o.topThree>=CONTENDER_THRESHOLD?i:-1).filter(i=>i>=0);
   const open=qualified.length?qualified[0]:-1;
   let close=-1;
   if(open>=0){close=open;while(close+1<outlook.length&&outlook[close+1].topThree>=CONTENDER_THRESHOLD)close++;}
   // Top-three probabilities saturate at 100 for dominant franchises.
   // Peak is the season with the highest expected underlying PPG, not a
   // tie-break between repeated 100% contention probabilities.
   const peak=outlook.slice().sort((a,b)=>b.strength-a.strength||a.year-b.year)[0];
   const beyond=close===outlook.length-1;
   const window=open<0?'No projected window by '+HORIZON:
     (open===0?'Now':String(outlook[open].year))+'–'+(beyond?HORIZON+'+':outlook[close].year);
   const status=open<0?(outlook[0].topThree>=35?'On the bubble':'Building'):
     open===0?(beyond?'Sustained contender':close<=1?'Win-now':'Contending'):
     open<=2?'Rising contender':'Long-term rebuild';
   return {id:t.id,outlook,openYear:open<0?null:outlook[open].year,
    endYear:open<0?null:outlook[close].year,throughHorizon:beyond,window,status,
    seasonsInWindow:open<0?0:close-open+1,
    peakYear:peak.year,peakChance:peak.topThree,peakAdvantage:peak.advantage,
    farChance:outlook.at(-1).topThree,ageCoverage:t.ageCoverage,
    baselinePPG:t.ppg,expectedContendingSeasons:Math.round(outlook.reduce((s,y)=>s+y.topThree/100,0)*10)/10,
    capital:t.total,picks:t.pickCapital};
  }).sort((a,b)=>b.outlook[0].topThree-a.outlook[0].topThree||a.id-b.id);
  return {ready:true,years,teams:output,trials:TRIALS,topThreeDefinition:'Top 3 in simulated underlying scoring strength'};
 }
 const api={forecast,ageCurve,validate,TRIALS,HORIZON,CONTENDER_THRESHOLD};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figDynastyWindowForecast=api;
})(typeof window!=='undefined'?window:null);
