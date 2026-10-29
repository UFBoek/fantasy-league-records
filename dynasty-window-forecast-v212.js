/* FIG Championship Window forecast through 2031.
   Scenario-based team-strength outlook, NOT a forecast of specific titles.
   No roster/league result is written back to Sleeper or historical records. */
(function(global){
 'use strict';
 const HORIZON=2031,TRIALS=700;
 const POS=new Set(['QB','RB','WR','TE']);
 const CURVES={
  QB:[[19,.80],[22,.92],[25,1],[28,1.06],[31,1.04],[33,.98],[35,.88],[38,.69],[41,.40],[45,.10]],
  RB:[[19,.84],[21,1],[23,1.04],[25,.97],[27,.78],[29,.54],[31,.30],[33,.13],[36,.04]],
  WR:[[19,.78],[22,.92],[25,1.05],[27,1.08],[29,.98],[31,.82],[33,.59],[35,.35],[38,.12]],
  TE:[[19,.70],[23,.87],[26,1.03],[29,1.07],[31,.96],[33,.78],[35,.52],[38,.22],[42,.08]]
 };
 const MIN_BASE_WEEKS=5;
 function value(x){const n=Number(x);return Number.isFinite(n)?Math.max(0,n):0;}
 function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
 function average(a){return a.reduce((s,n)=>s+n,0)/Math.max(1,a.length);}
 function ageCurve(pos,age){
  let points=CURVES[String(pos||'').toUpperCase()];
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
  return function(){
   state^=state<<13;state^=state>>>17;state^=state<<5;
   return ((state>>>0)+.5)/4294967296;
  };
 }
 function normal(rng){return Math.sqrt(-2*Math.log(Math.max(1e-9,rng())))*Math.cos(2*Math.PI*rng());}
 function playersFor(team,playerValue){
  return [...new Map((team.roster||[]).map(p=>[String(p.player_id),p])).values()]
    .filter(p=>POS.has(String(p.position).toUpperCase()))
    .map(p=>({pos:String(p.position).toUpperCase(),age:Number(p.age),v:value(playerValue(p.player_id)),
      slot:!!(p.is_starter===true||p.is_starter==='True'||p.is_starter==='true')}));
 }
 function capital(roster){
  const sorted=roster.map(p=>p.v).filter(v=>v>0).sort((a,b)=>b-a);
  return sorted.slice(0,10).reduce((s,n)=>s+n,0)+.28*sorted.slice(10,20).reduce((s,n)=>s+n,0);
 }
 function futurePick(pick,lookup,year){
  const y=Number(pick.pick_season);
  if(y<=year||y>HORIZON)return null;
  const p=value(lookup(pick));
  return p>0?{year:y,position:'WR',value:p,round:Number(pick.round)}:null;
 }
 function validate(input){
  const {teams,weeklyRanks,year,playerValue,pickValue}=input;
  if(!Array.isArray(teams)||teams.length!==10||new Set(teams.map(t=>Number(t.id))).size!==10)throw Error('Expected ten franchises');
  if(typeof playerValue!=='function'||typeof pickValue!=='function')throw Error('Value lookups required');
  if(!Array.isArray(weeklyRanks)||!Number.isInteger(year)||year<2023||year>HORIZON)throw Error('Invalid scoring year');
  const scoringModel=input.currentModel||(global&&global.figDynastyWindowModel);
  if(!scoringModel||typeof scoringModel.projected!=='function')throw Error('Existing PPG model required');
  const scoreRows=weeklyRanks.filter(r=>Number(r.season)===year&&Number(r.week)>=1&&Number(r.week)<=14&&Number.isFinite(Number(r.points_for)));
  const teamInfo=teams.map(t=>{
   const id=Number(t.id);
   const scores=scoreRows.filter(s=>Number(s.franchise_id)===id).sort((a,b)=>Number(a.week)-Number(b.week)).map(x=>Number(x.points_for));
   const model=scoringModel.projected(scores,[]);
   const roster=playersFor(t,playerValue);
   const ageCoverage=roster.filter(p=>Number.isFinite(p.age)&&p.age>=18&&p.age<=50).reduce((s,p)=>s+p.v,0)/
     Math.max(1,roster.reduce((s,p)=>s+p.v,0));
   const picks=(t.asset&&t.asset.picks||[]).map(p=>futurePick(p,pickValue,year)).filter(Boolean);
   return {id,ppg:model&&model.ppg,roster,picks,ageCoverage,baseCapital:capital(roster),
     total:value(t.value),pickCapital:value(t.picks),hasScores:scores.length>=MIN_BASE_WEEKS};
  });
  const ready=teamInfo.every(t=>t.hasScores&&t.roster.length>=10&&t.ageCoverage>=.9&&t.baseCapital>0);
  return {ready,teams:teamInfo,year};
 }
 function modelTurnover(roster,rng,retool){
  if(!retool)return;
  // Rebuilding by exchanging existing veterans, never conjuring extra wealth.
  // Only a small portion of older assets can be sold each season; haircut
  // and development uncertainty prevent assuming perfect trades.
  const retirement={QB:33,RB:26,WR:29,TE:30};
  const candidates=roster.filter(p=>p.age>retirement[p.pos]&&p.v>200)
   .sort((a,b)=>(b.age-retirement[b.pos])-(a.age-retirement[a.pos]));
  let moved=0;
  for(const old of candidates){
   if(moved>=2)break;
   if(rng()>.28)continue;
   const proceeds=old.v*(.72+.26*rng());
   old.v=0;
   // A veteran can be converted into younger value, but at a market discount.
   roster.push({pos:old.pos,age:old.pos==='QB'?24:old.pos==='TE'?24:22,
     v:proceeds*clamp(.85+.28*normal(rng),.30,1.45)});
   moved++;
  }
 }
 function seasonStep(state,year,rng,retool){
  const next=[];
  for(const asset of state.players){
   const oldFactor=ageCurve(asset.pos,asset.age),newFactor=ageCurve(asset.pos,asset.age+1);
   const retention=clamp(newFactor/Math.max(.05,oldFactor),.35,1.32);
   // Idiosyncratic uncertain development, injury and value changes.
   const random=clamp(1+.13*normal(rng),.52,1.48);
   const v=asset.v*retention*random;
   if(v>35)next.push({pos:asset.pos,age:asset.age+1,v});
  }
  for(const pick of state.picks){
   if(pick.year!==year)continue;
   // Fixed-pick proceeds are spent into a rookie, not retained as cash too.
   const d=clamp(.84+.61*normal(rng),.08,2.45);
   const pos=['RB','WR','WR','TE','QB'][Math.floor(rng()*5)];
   next.push({pos,age:pos==='QB'?23:22,v:pick.value*d});
  }
  modelTurnover(next,rng,retool);
  state.players=next;
 }
 function makeSeed(input){
  let seed=2166136261;
  for(const t of input.teams){
   const v=Math.round(t.total*10+t.baseCapital+t.pickCapital);
   seed=Math.imul(seed^v,16777619)>>>0;
   for(const p of t.roster)seed=Math.imul(seed^(Math.round(p.v)+p.age*17),16777619)>>>0;
  }
  return (seed^input.year^0x41234011)>>>0 || 87431;
 }
 function forecast(input){
  const validated=validate(input);
  const years=Array.from({length:HORIZON-validated.year+1},(_,i)=>validated.year+i);
  if(!validated.ready)return {ready:false,years,teams:validated.teams,reason:'Missing completed scores or verified roster values'};
  const teamInfo=validated.teams;
  const meanPPG=average(teamInfo.map(t=>t.ppg));
  const initialMeanCapital=average(teamInfo.map(t=>t.baseCapital));
  const result=Object.fromEntries(teamInfo.map(t=>[t.id,years.map(y=>({year:y,topThree:0,meanPPG:0,allScores:[]}))]));
  const rng=generator(makeSeed(validated));
  for(let run=0;run<TRIALS;run++){
   const states=teamInfo.map(t=>({id:t.id,base:t,players:t.roster.map(p=>({...p})),picks:t.picks}));
   for(let yi=0;yi<years.length;yi++){
    const year=years[yi],offset=year-validated.year;
    if(offset>0)states.forEach(st=>seasonStep(st,year,rng,true));
    const caps=states.map(st=>capital(st.players)),meanCap=Math.max(1,average(caps));
    const scores=states.map((st,i)=>{
     const t=st.base,relative=(caps[i]+200)/(meanCap+200);
     const baseRelative=(t.baseCapital+200)/(initialMeanCapital+200);
     const evolution=26*Math.log(relative/baseRelative);
     const longCapital=12*Math.log(relative)*(1-Math.exp(-.40*offset));
     const baseline=(t.ppg-meanPPG)*Math.exp(-.12*offset);
     // Projected scoring-strength uncertainty increases with forecast horizon.
     const noise=(8+3.8*offset)*normal(rng);
     return {id:t.id,ppg:clamp(meanPPG+baseline+evolution+longCapital+noise,45,300)};
    });
    scores.sort((a,b)=>b.ppg-a.ppg||a.id-b.id);
    scores.forEach((s,rank)=>{
     const entry=result[s.id][yi];
     entry.meanPPG+=s.ppg;
     if(rank<3)entry.topThree++;
     entry.allScores.push(s.ppg);
    });
   }
  }
  const teams=teamInfo.map(t=>{
   const outlook=result[t.id].map(row=>{
     const sorted=row.allScores.sort((a,b)=>a-b);
     const pick=q=>sorted[Math.floor(q*(sorted.length-1))];
     return {year:row.year,topThree:Math.round(row.topThree/TRIALS*1000)/10,
       strength:Math.round(row.meanPPG/TRIALS*10)/10,
       low:Math.round(pick(.15)*10)/10,high:Math.round(pick(.85)*10)/10};
   });
   const qualified=outlook.map((p,i)=>p.topThree>=50?i:-1).filter(i=>i>=0);
   const openIdx=qualified.length?qualified[0]:-1;
   let closedIdx=-1;
   if(openIdx!==-1){closedIdx=openIdx;while(closedIdx+1<outlook.length&&outlook[closedIdx+1].topThree>=50)closedIdx++;}
   const peak=outlook.slice().sort((a,b)=>b.topThree-a.topThree||a.year-b.year)[0];
   const futureYears=outlook.slice(1);
   const stillContending=closedIdx===outlook.length-1;
   const label=openIdx<0?'No projected window by '+HORIZON:
      (openIdx===0?'Now':String(outlook[openIdx].year))+'–'+(stillContending?HORIZON+'+':outlook[closedIdx].year);
   const status=openIdx<0?(outlook[0].topThree>=35?'On the bubble':'Building'):
      openIdx===0?(stillContending?'Sustained contender':closedIdx<=1?'Win-now':'Contending'):
      openIdx<=2?'Rising contender':'Long-term rebuild';
   return {id:t.id,outlook,openYear:openIdx<0?null:outlook[openIdx].year,
     endYear:openIdx<0?null:outlook[closedIdx].year,
     throughHorizon:stillContending,window:label,status,
     seasonsInWindow:openIdx<0?0:closedIdx-openIdx+1,
     peakYear:peak.year,peakChance:peak.topThree,
     farChance:outlook[outlook.length-1].topThree,
     ageCoverage:t.ageCoverage,baselinePPG:t.ppg,
     // Uses all modeled years, not an invented closing year after 2031.
     expectedContendingSeasons:Math.round(outlook.reduce((s,y)=>s+y.topThree/100,0)*10)/10,
     capital:t.total,picks:t.pickCapital};
  }).sort((a,b)=>b.outlook[0].topThree-a.outlook[0].topThree||a.id-b.id);
  return {ready:true,years,teams,trials:TRIALS,topThreeDefinition:'Top 3 in simulated underlying scoring strength'};
 }
 const api={forecast,ageCurve,validate,TRIALS,HORIZON};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figDynastyWindowForecast=api;
})(typeof window!=='undefined'?window:null);
