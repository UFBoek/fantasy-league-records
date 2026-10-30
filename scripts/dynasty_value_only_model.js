'use strict';
/*
 * FIG Dynasty Dominance — position/age/value ONLY experiment.
 * No player game logs, previous player PPG, current franchise PPG,
 * future scoring outcomes, historical rookie PPG, or team calibrators
 * are accepted or read by this engine.
 *
 * RosterAudit valuation is a long-run talent prior, NOT a predicted
 * future market price. Position-specific maturation, veteran decline,
 * latent breakouts and random missed time create future PPG scenarios.
 *
 * Future rookie picks have no named player/known position/value. Their
 * initial ability is sampled from RosterAudit rookie PICK value tiers
 * (an asset-level prior) and an uncertain positional distribution.
 */

const TEAMS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
const IDS=Object.keys(TEAMS).map(Number);
const YEARS=[2027,2028,2029,2030,2031,2032];
// Calibrate only the league-wide scoring UNIT after position/age/value draws.
// 49 completed FIG weeks average ~1,602 PPG across all ten franchises.
// No historical player or individual franchise PPG enters the talent model.
const LEAGUE_BASELINE_PPG=1600;
const LEAGUE_RANGE_PPG=[1570,1630];
const LEAGUE_RAW_TREND_SHARE=.10;
const POS=new Set(['QB','RB','WR','TE']);
const PEAK={QB:30,RB:25,WR:27,TE:28};
const STAR={QB:37,RB:28,WR:30,TE:25};
const MATURITY={
 // Quarterbacks can retain prime scoring into their early 30s.
 // Average production declines more quickly after age 34.
 QB:[[20,.61],[22,.72],[24,.82],[26,.92],[28,.98],[30,1],[32,1],[34,.98],
     [35,.93],[36,.84],[37,.74],[38,.63],[39,.51],[40,.38],[41,.27],[42,.17],[44,.05]],
 RB:[[20,.67],[22,.80],[24,.94],[25,1],[26,.98],[27,.92],[28,.84],[29,.70],[30,.53],[31,.37],[33,.12],[35,.02]],
 WR:[[20,.59],[22,.71],[24,.84],[26,.96],[27,1],[29,.97],[30,.92],[31,.84],[32,.71],[34,.42],[36,.14],[38,.03]],
 TE:[[20,.56],[22,.66],[24,.78],[26,.92],[28,1],[30,.98],[32,.86],[34,.60],[36,.30],[38,.11],[40,.03]]
};
function maturity(pos,age){
 const c=MATURITY[pos];if(!c)return 0;
 if(age<=c[0][0])return c[0][1];
 for(let i=1;i<c.length;i++)if(age<=c[i][0]){
  const [a,v]=c[i-1],[b,w]=c[i];return v+(w-v)*(age-a)/(b-a);
 }
 return .02;
}
// Self-contained model. No scoring-history module is imported.
function random(seed){
 let state=seed>>>0,spare=null;
 const u=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return(state+.5)/4294967296;};
 const normal=()=>{
  if(spare!==null){const x=spare;spare=null;return x;}
  const q=Math.sqrt(-2*Math.log(Math.max(1e-10,u()))),angle=2*Math.PI*u();
  spare=q*Math.sin(angle);return q*Math.cos(angle);
 };
 return {u,normal};
}
function marketPpg(pos,value){
 // Explicit market-to-scoring unit scale by position. These are heuristic
 // coefficients, not scores or projections for any named NFL player.
 // League-size scoring units: the previous curve severely undervalued
 // middle-tier starters. Check the aggregate output against independent
 // 2023-26 FIG weekly TOTALS, never per-player historical box scores.
 // QB value 3k is a plausible starter (~26 raw PPG), 5k a quality
 // starter (~32). Elite QB model *mean* should top out around 33 PPG:
 // cap the raw market anchor at 34 before injuries/variance/league scaling.
 // This is NOT a limit on individual game results.
 const f={QB:[5,13.5,800,34],RB:[3,12.5,1800,31],WR:[3.5,12.5,1600,32],TE:[3.5,11,1600,29]}[pos];
 return f?clamp(f[0]+f[1]*Math.log1p(Math.max(0,+value||0)/f[2]),.2,f[3]):0;
}
function makePicks(data){
 const byYear=Object.fromEntries(YEARS.map(year=>[year,[]]));
 const ownership=new Map();
 for(const row of data){
  const year=+row.pick_season,round=+row.round,origin=+row.original_franchise_id,
   owner=+row.current_franchise_id;
  if(!YEARS.includes(year)||round<1||round>4||!IDS.includes(origin)||!IDS.includes(owner))continue;
  const key=year+':'+round+':'+origin;
  if(ownership.has(key))throw Error('Duplicate future draft pick '+key);
  ownership.set(key,{year,round,origin,owner,assumed:false});
 }
 for(const year of YEARS)for(const origin of IDS)for(let round=1;round<=4;round++){
  const key=year+':'+round+':'+origin;
  if(year<=2029&&!ownership.has(key))throw Error('Missing real future draft pick '+key);
  byYear[year].push(ownership.get(key)||{year,round,origin,owner:origin,assumed:true});
 }
 return byYear;
}
function legalLineup(players){
 const slots={QB:[],RB:[],WR:[],TE:[]};
 for(const p of players)if(slots[p.pos]&&p.ppg>0)slots[p.pos].push(p.ppg);
 for(const pos of ['QB','RB','WR','TE'])slots[pos].sort((a,b)=>b-a);
 const take=(pos,n)=>{let score=0;for(let i=0;i<n;i++)score+=slots[pos].shift()||0;return score;};
 let score=take('QB',1)+take('RB',2)+take('WR',3)+take('TE',1);
 const flex=[...slots.RB,...slots.WR,...slots.TE].sort((a,b)=>b-a);
 score+=(flex.shift()||0)+(flex.shift()||0);
 return score+Math.max(slots.QB[0]||0,flex[0]||0);
}

const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rnd=(v,n=1)=>Number(v.toFixed(n));
function pct(a,q){const s=[...a].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)];}
function calibrateLeagueScoring(teamSamples,playerSamples){
 const byYear={};
 for(const year of YEARS){
  const raw=IDS.reduce((sum,id)=>sum+mean(teamSamples[year][id]),0);
  if(!Number.isFinite(raw)||raw<=0)throw Error('Invalid league-wide simulated PPG');
  // Keep 10% of the simulated year-to-year league scoring movement rather
  // than flattening every season to exactly 1,600 points.
  const target=clamp(LEAGUE_BASELINE_PPG+(raw-LEAGUE_BASELINE_PPG)*LEAGUE_RAW_TREND_SHARE,
   LEAGUE_RANGE_PPG[0],LEAGUE_RANGE_PPG[1]);
  const multiplier=target/raw;
  for(const id of IDS){
   // Every team and individual player receives exactly the same year factor:
   // no relative team/player boost or ranking intervention.
   teamSamples[year][id]=teamSamples[year][id].map(ppg=>ppg*multiplier);
   for(const player of playerSamples[year][id].values()){
    player.total*=multiplier;
    player.draws=player.draws.map(ppg=>ppg*multiplier);
   }
  }
  byYear[year]={raw_ppg:rnd(raw),target_ppg:rnd(target),multiplier:rnd(multiplier,5)};
 }
 return byYear;
}
function teamRank(scores){
 const ordered=IDS.slice().sort((a,b)=>scores[a]-scores[b]);
 return Object.fromEntries(ordered.map((id,i)=>[id,i+1]));
}
function projectedPotential(pos,currentAge,value,year,firstYear=2026){
 if(!POS.has(pos)||!Number.isFinite(+value)||+value<0||!Number.isFinite(+currentAge))return null;
 const age=+currentAge+(year-firstYear),peak=PEAK[pos];
 // Veteran QB dynasty prices discount remaining career length, not just
 // next-season scoring. Partially undo that market horizon penalty for
 // 31–39-year-old QBs, tapering back to neutral by 42. No past PPG used.
 const veteranQBValueFactor=pos==='QB'?
  1+.55*clamp((+currentAge-30)/4,0,1)*clamp((42-(+currentAge))/6,0,1):1;
 const anchor=marketPpg(pos,+value*veteranQBValueFactor);
 // RosterAudit dynasty valuations already include age. For young players,
 // its value defines a plausible eventual talent ceiling while maturation
 // restricts CURRENT output. For older players it represents current ability;
 // only *future* physical decline is applied, without double-discounting
 // the player's current age.
 const readiness=+currentAge<peak?
  maturity(pos,age)/maturity(pos,peak):
  maturity(pos,age)/maturity(pos,+currentAge);
 // 2026 dynasty prices discount an older QB's remaining career, not just
 // how many points he can score IF he remains a starting quarterback.
 // Preserve a credible veteran-starter baseline through age 39, but do
 // not award it to low-value backups, young developing QBs, or 40+ players
 // whose role/retirement outlook is considerably less certain.
 // This floor is BEFORE availability and the shared league normalization;
 // a season-average projection may still be slightly below this talent floor.
 const establishedVeteranQB=pos==='QB'&&+currentAge>=29&&+value>=1800&&age>=34&&age<=39;
 const talent=establishedVeteranQB?Math.max(anchor*readiness,21.5):anchor*readiness;
 return clamp(talent,.02,pos==='QB'?44:36);
}
function breakoutProbability(pos,age,value){
 const until=PEAK[pos]-age;
 if(!POS.has(pos)||until<=0)return 0;
 const youth=clamp(until/6,0,1),market=clamp(Math.sqrt(Math.max(0,value)/10000),0,1);
 return clamp(.035+.115*youth+.085*market,.025,.26);
}
function makeIncumbent(p,values,r){
 const id=String(p.player_id),pos=p.position,raw=values.players?.[id]?.value;
 const value=raw===undefined||raw===null?null:Number(raw);
 const age=Number(p.age);
 if(!POS.has(pos)||!Number.isFinite(age)||age<17||age>46)return null;
 const valid=value!==null&&Number.isFinite(value)&&value>=0;
 const chance=valid?breakoutProbability(pos,age,value):0;
 // One career-long breakthrough event per trial. Young players need time
 // to develop into the improvement; it cannot appear fully in 2027.
 const breakout=valid&&r.u()<chance ?
  clamp((STAR[pos]-marketPpg(pos,value))*(.5+.45*r.u()),0,18):0;
 return {id,name:p.player_name||'Unknown',team:+p.franchise_id,pos,age,
  value:valid?value:null,baseYear:2026,rookie:false,breakout};
}
function draftAssetValue(pick,tier,values){
 const tierKey=tier=== 'early'?'early':tier==='late'?'late':'mid';
 // Same draft-year market lens: use RosterAudit near-future (2027)
 // rookie pick levels to value a selection at the time it is made.
 // Never extrapolate a long-dated *2026 price* as 2032 player talent.
 const raw=values.future_picks?.['2027:'+pick.round+':'+tierKey];
 return Number.isFinite(+raw)&&+raw>0?+raw:null;
}
function makeFuturePick(pick,r,rank,values){
 // rank 1 is the weakest originating team: it earns an EARLY pick.
 // rank 10 is the strongest originating team: it earns a LATE pick.
 const tier=rank<=3?'early':rank>=8?'late':'mid';
 const value=draftAssetValue(pick,tier,values);
 // A pick does not have a known NFL player or position. These are
 // hypothetical positions, NOT forecasts of draft selections.
 const x=r.u(),pos=x<.18?'QB':x<.43?'RB':x<.81?'WR':'TE';
 const age=21.5, id='pick:'+pick.year+':'+pick.round+':'+pick.origin;
 // First-round selections have materially more starter / breakout potential
 // than later rounds. Convert 65% of R1 pick value to hypothetical talent,
 // versus 35% for R2-R4; none is a guaranteed star or known NFL player.
 // The original franchise's rank determines early/mid/late draft quality,
 // while the CURRENT owner receives the player. E.g. Fru owns James 2028/29 R1s.
 const scaled=value===null?null:value*(pick.round===1?.65:.35);
 const chance=scaled===null?0:breakoutProbability(pos,age,scaled);
 const breakout=scaled!==null&&r.u()<chance?
  clamp((STAR[pos]-marketPpg(pos,scaled))*(.5+.45*r.u()),0,18):0;
 return {id,name:pick.year+' R'+pick.round+' · '+TEAMS[pick.origin]+' original pick',
  team:pick.owner,pos,age,value:scaled,baseYear:pick.year,
  rookie:true,breakout,pick_year:pick.year,pick_round:pick.round,pick_origin:pick.origin};
}
function project(p,year,r){
 if(p.value===null)return null;
 const expected=projectedPotential(p.pos,p.age,p.value,year,p.baseYear);
 const age=p.age+(year-p.baseYear),prime=PEAK[p.pos];
 // Breakouts emerge gradually. An unproven 22-year-old can reach elite
 // PPG in their mid-20s, but not every 22-year-old becomes a star.
 const progress=age>=prime?1:clamp((age-p.age)/Math.max(1,prime-p.age),0,1);
 const upside=p.breakout*progress*Math.min(1,maturity(p.pos,age)/maturity(p.pos,prime));
 const devYears=Math.max(0,prime-p.age);
 const sigma=.12+Math.min(.14,Math.max(0,devYears)*.015)+
   Math.min(.08,Math.max(0,year-p.baseYear)*.012);
 const talent=Math.exp(r.normal()*sigma-.5*sigma*sigma);
 // QB age-related availability risk rises more gradually than for RB/WR/TE.
 const injuryChance=clamp(.08+(p.pos==='RB'?.04:0)+
  Math.max(0,age-29)*(p.pos==='QB'?.012:.027),.07,.65);
 const availability=r.u()<injuryChance? .40+.43*r.u():1;
 return clamp((expected+upside)*talent*availability,0,p.pos==='QB'?45:38);
}
function runModel({roster,values,picks,runs=1500,seed=20261030}){
 if(!Array.isArray(roster)||!roster.length||!values?.players||!Array.isArray(picks)||!picks.length)
  throw Error('Missing value-only model inputs: roster, RosterAudit values, picks');
 if(!Number.isInteger(runs)||runs<1||runs>20000)throw Error('Invalid number of simulations');
 const current=roster.filter(x=>POS.has(x.position));
 const matched=current.filter(p=>Number.isFinite(+values.players?.[String(p.player_id)]?.value)&&
  values.players?.[String(p.player_id)]?.value!==null&&
  values.players?.[String(p.player_id)]?.value!==undefined).length;
 const coverage=100*matched/current.length;
 if(coverage<95)throw Error('RosterAudit value coverage below 95%');
 const future=makePicks(picks),r=random(seed);
 const teamSamples=Object.fromEntries(YEARS.map(y=>[y,Object.fromEntries(IDS.map(id=>[id,[]]))]));
 const playerSamples=Object.fromEntries(YEARS.map(y=>[y,Object.fromEntries(IDS.map(id=>[id,new Map()]))]));
 const leaderCounts=Object.fromEntries(IDS.map(id=>[id,[]]));
 for(let iteration=0;iteration<runs;iteration++){
  const players=current.map(p=>makeIncumbent(p,values,r)).filter(Boolean);
  // Initial draft-position tiers depend on MARKET-ONLY team lineup,
  // never the teams' past observed PPG or the scoring of named players.
  const marketTeam=Object.fromEntries(IDS.map(id=>[id,legalLineup(players.filter(p=>p.team===id&&p.value!==null)
   .map(p=>({pos:p.pos,ppg:projectedPotential(p.pos,p.age,p.value,2026)})))]));
  let last=marketTeam;
  const first=Object.fromEntries(IDS.map(id=>[id,0]));
  for(const year of YEARS){
   const order=teamRank(last);
   for(const pick of future[year])players.push(makeFuturePick(pick,r,order[pick.origin]||5,values));
   const annual={};
   for(const id of IDS){
    const lineup=[];
    for(const p of players){
     if(p.team!==id)continue;
     const ppg=project(p,year,r);
     const key=p.id;
     const tracked=playerSamples[year][id];
     if(!tracked.has(key))tracked.set(key,{
      id:key,name:p.name,pos:p.rookie?'TBD':p.pos,rookie:p.rookie,
      age:p.age+year-p.baseYear,pick_year:p.pick_year||null,pick_round:p.pick_round||null,
      pick_origin:p.pick_origin||null,total:0,n:0,draws:[]});
     const row=tracked.get(key);
     // A missing RosterAudit quote is unknown, not a zero-value player.
     if(ppg!==null){row.total+=ppg;row.n++;row.draws.push(ppg);lineup.push({pos:p.pos,ppg});}
    }
    annual[id]=legalLineup(lineup);
    teamSamples[year][id].push(annual[id]);
   }
   const highest=Math.max(...Object.values(annual));
   for(const id of IDS)if(annual[id]===highest)first[id]++;
   last=annual;
  }
  for(const id of IDS)leaderCounts[id].push(first[id]);
 }
 const leagueScaleByYear=calibrateLeagueScoring(teamSamples,playerSamples);
 const seasons={};
 for(const year of YEARS){
  const scores=teamSamples[year];
  const player_projections=Object.fromEntries(IDS.map(id=>[id,
   [...playerSamples[year][id].values()].map(p=>({
    id:p.id,name:p.name,pos:p.pos,rookie:p.rookie,age:rnd(p.age,1),
    pick_year:p.pick_year,pick_round:p.pick_round,pick_origin:p.pick_origin,
    ppg:p.n?rnd(p.total/p.n):null,
    p10:p.n?rnd(pct(p.draws,.1)):null,p90:p.n?rnd(pct(p.draws,.9)):null
   })).sort((a,b)=>(b.ppg??-1)-(a.ppg??-1)||a.name.localeCompare(b.name))
  ]));
  const ranking=IDS.map(id=>{
   const arr=scores[id],wins=arr.reduce((n,value,i)=>n+Number(IDS.every(other=>other===id||value>=scores[other][i])),0);
   const top3=arr.reduce((n,value,i)=>n+Number(IDS.filter(other=>other!==id&&scores[other][i]>value).length<3),0);
   return {id,name:TEAMS[id],ppg:rnd(mean(arr)),p10:rnd(pct(arr,.1)),p90:rnd(pct(arr,.9)),
    best_pct:rnd(100*wins/runs),top3_pct:rnd(100*top3/runs)};
  }).sort((a,b)=>b.ppg-a.ppg);
  const book=scores[1],comparisons=IDS.filter(id=>id!==1).map(id=>{
   const gap=book.map((v,i)=>v-scores[id][i]);
   return {id,name:TEAMS[id],gap_ppg:rnd(mean(gap)),p10:rnd(pct(gap,.1)),p90:rnd(pct(gap,.9)),
    boek_stronger_pct:rnd(100*gap.filter(v=>v>0).length/runs)};
  }).sort((a,b)=>a.gap_ppg-b.gap_ppg);
  const bestOther=book.map((v,i)=>v-Math.max(...IDS.filter(id=>id!==1).map(id=>scores[id][i])));
  seasons[year]={ranking,player_projections,boek_vs_teams:comparisons,
   boek_vs_leagues_best_opponent:{gap_ppg:rnd(mean(bestOther)),p10:rnd(pct(bestOther,.1)),
    p90:rnd(pct(bestOther,.9)),boek_stronger_pct:rnd(100*bestOther.filter(v=>v>0).length/runs)}};
 }
 const whole_horizon=IDS.map(id=>({id,name:TEAMS[id],
  expected_years_best:rnd(mean(leaderCounts[id]),2),
  chance_best_at_least_three_years_pct:rnd(100*leaderCounts[id].filter(x=>x>=3).length/runs)
 })).sort((a,b)=>b.expected_years_best-a.expected_years_best);
 return {version:'experimental-v3.7-qb-scoring-and-r1-draft-order',status:'research_only',years:YEARS,runs,seed,
  league_scoring_calibration:{baseline_ppg:LEAGUE_BASELINE_PPG,target_range_ppg:LEAGUE_RANGE_PPG,
   retained_raw_trend_fraction:LEAGUE_RAW_TREND_SHARE,by_year:leagueScaleByYear},
  inputs:{current_rostered_players:current.length,market_coverage_pct:rnd(coverage),
   known_2027_2029_picks:YEARS.slice(0,3).reduce((sum,y)=>sum+future[y].filter(p=>!p.assumed).length,0),
   known_2030_2032_picks:YEARS.slice(3).reduce((sum,y)=>sum+future[y].filter(p=>!p.assumed).length,0),
   assumed_2030_2032_picks:YEARS.slice(3).reduce((sum,y)=>sum+future[y].filter(p=>p.assumed).length,0)},
  seasons,whole_horizon,limitations:[
   'Individual incumbent PPG uses only RosterAudit value, player age, and position; no player or franchise historical scoring or PPG calibration.',
   'Quarterbacks have a longer prime into the mid-30s, a QB-specific market-value curve, and partial veteran dynasty-price age relief. Maturity, aging, breakout, and injury parameters remain exploratory, not historically calibrated.',
   'Market pricing is a present-day dynasty opinion, not the NFL scoring outcome; a price does not guarantee star production.',
   'Hypothetical rookies use an age-position development curve and RosterAudit pick tiers; 65% of R1 asset value versus 35% for R2-R4 maps into scoring talent. Weak original franchises earn early-tier prospects; actual pick owners receive them. No historical rookie scoring is imported.',
   'Position scoring is uniformly normalized league-wide after simulation toward 1,600 combined PPG (1,570–1,630 target range). Historical player and team scoring do not determine the position/age/value talent model.',
   'All current rosters held constant; no manager trading ability, future trades, waivers or unowned acquisitions are invented.',
   'Missing price data generate unknown PPG rather than substituting scoring history.',
   'Nominal simulation ranges and ranking frequencies are not statistically calibrated.'
  ]};
}
module.exports={runModel,makePicks,projectedPotential,maturity,marketPpg,legalLineup,breakoutProbability,makeIncumbent,makeFuturePick,project,draftAssetValue};
