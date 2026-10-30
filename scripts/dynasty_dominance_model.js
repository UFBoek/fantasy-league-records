'use strict';
/* FIG Dynasty Dominance experiment. Read-only Node.js model.
   node scripts/dynasty_dominance_model.js --runs 5000 --out /tmp/report.json
   Probabilities are exploratory and have NOT been empirically calibrated. */
const fs=require('node:fs'),path=require('node:path');
const TEAMS={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
const IDS=Object.keys(TEAMS).map(Number),YEARS=[2027,2028,2029,2030,2031,2032];
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rnd=(x,d=1)=>Number(x.toFixed(d));
const pct=(a,p)=>{let v=[...a].sort((x,y)=>x-y);return v[Math.floor((v.length-1)*p)];};
function random(seed){
 let state=seed>>>0,spare=null;
 const u=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return(state+.5)/4294967296;};
 const normal=()=>{if(spare!==null){let x=spare;spare=null;return x;}
   let r=Math.sqrt(-2*Math.log(Math.max(1e-10,u()))),theta=2*Math.PI*u();
   spare=r*Math.sin(theta);return r*Math.cos(theta);};
 return {u,normal};
}
function ageCurve(pos,age){
 const curves={
 QB:[[20,.84],[23,.93],[26,.99],[29,1],[31,.99],[33,.94],[35,.83],[37,.62],[39,.38],[42,.12]],
 RB:[[20,.83],[22,.92],[24,1],[26,1],[27,.95],[28,.86],[29,.74],[30,.59],[31,.43],[32,.30],[34,.09],[36,.02]],
 WR:[[20,.82],[22,.91],[24,.98],[26,1],[28,1],[29,.98],[30,.92],[31,.83],[32,.70],[33,.55],[34,.40],[36,.16],[38,.04]],
 TE:[[20,.80],[22,.86],[24,.94],[26,1],[29,1],[30,.97],[31,.91],[32,.82],[33,.70],[34,.55],[35,.40],[37,.17],[39,.05]]
 }[pos];
 if(!curves)return .01;
 if(age<=curves[0][0])return curves[0][1];
 for(let i=1;i<curves.length;i++)if(age<=curves[i][0]){
   const [a,v]=curves[i-1],[b,w]=curves[i];return v+(w-v)*(age-a)/(b-a);
 }
 return .02;
}
function marketPpg(pos,value){
 // Position-specific scale checked against the 2026 current NFL scoring
 // cross-section. This is not a time-separated out-of-sample calibration.
 const f={QB:[3,10.5,800,37],RB:[1,12,1800,28],WR:[1,12,1600,30],TE:[1,10,1600,26]}[pos];
 return f?clamp(f[0]+f[1]*Math.log1p(Math.max(0,+value||0)/f[2]),.2,f[3]):0;
}
function nflScoringSamples(nflCurrent,nflHistory,cutoff=17){
 const data=new Map();
 const put=(pid,year,weekly,limit)=>{
  if(!Array.isArray(weekly))return;
  const key=String(pid)+':'+year;
  const seen=new Set(),scores=[];
  for(const row of weekly){
   if(!Array.isArray(row)||row.length!==2)continue;
   const week=+row[0],score=+row[1];
   if(!Number.isInteger(week)||week<1||week>limit||!Number.isFinite(score)||seen.has(week))continue;
   scores.push(score);seen.add(week);
  }
  if(scores.length)data.set(key,scores);
 };
 for(const [year,season] of Object.entries(nflHistory?.seasons||{})){
  if(![2023,2024,2025].includes(+year)||!season||!season.players)continue;
  for(const [pid,rec] of Object.entries(season.players))put(pid,+year,rec.weekly,17);
 }
 if(nflCurrent?.season===2026&&nflCurrent?.weeks&&+nflCurrent.through_week>=1){
  for(const [week,players] of Object.entries(nflCurrent.weeks)){
   if(+week>cutoff||+week<1||!players)continue;
   for(const [pid,val] of Object.entries(players)){
    if(!/^\d+$/.test(pid)||!Number.isFinite(+val))continue;
    const key=pid+':2026';
    const row=data.get(key)||[];row.push(+val);data.set(key,row);
   }
  }
 }
 return data;
}
function rookieOutcomes(draft,archive){
 const byRound={1:[],2:[],3:[],4:[]};
 if(!draft?.length||!archive?.seasons)return byRound;
 const samples=nflScoringSamples(null,archive);
 for(const pick of draft){
  const year=+pick.draft_season,round=+pick.round,pos=pick.draft_position||pick.position;
  if(![2024,2025].includes(year)||!byRound[round]||!['QB','RB','WR','TE'].includes(pos)||pick.draft_class!=='Rookie')continue;
  const scores=samples.get(String(pick.player_id)+':'+year)||[];
  byRound[round].push({player_id:String(pick.player_id),name:pick.draft_full_name||pick.player_name||'',
   season:year,round,pos,games:scores.length,
   full_week_ppg:scores.reduce((a,b)=>a+b,0)/17,
   healthy_ppg:mean(scores),
   second_year_ppg:year===2024?(samples.get(String(pick.player_id)+':2025')||[]).reduce((a,b)=>a+b,0)/17:null});
 }
 return byRound;
}

function playerBaselines(roster,values,logs,nflCurrent=null,nflHistory=null,cutoff=17){
 const history=new Map();
 const nfl=nflScoringSamples(nflCurrent,nflHistory,cutoff);
 for(const p of logs){
  if(p.game_type!=='Regular Season'||![2024,2025,2026].includes(+p.season)||!Number.isFinite(+p.starter_points))continue;
  const key=p.player_id+':'+p.season;
  if(!history.has(key))history.set(key,[]);
  history.get(key).push(+p.starter_points);
 }
 return roster.filter(x=>['QB','RB','WR','TE'].includes(x.position)).map(x=>{
  const id=String(x.player_id),knownMarket=values.players[id]?.value!=null,
   value=knownMarket?+values.players[id].value:0,prior=marketPpg(x.position,value);
  let numerator=0,denominator=0,samples=0;
  for(const [year,weight] of [[2026,.6],[2025,.28],[2024,.12]]){
   const scores=nfl.get(id+':'+year)||history.get(id+':'+year)||[];
   if(!scores.length)continue;
   const w=weight*scores.length/(scores.length+3);
   numerator+=mean(scores)*w;denominator+=w;samples+=scores.length;
  }
  const observed=denominator?numerator/denominator:prior,credibility=Math.min(.84,samples/(samples+9));
  const nflStarts=[2024,2025,2026].reduce((sum,year)=>sum+(nfl.get(id+':'+year)||[]).length,0);
  return {id,team:+x.franchise_id,name:x.player_name,pos:x.position,age:+x.age||25,
    baseYear:2026,marketValue:knownMarket?value:null,
   basePpg:clamp((1-credibility)*prior+credibility*observed,.2,x.position==='QB'?39:34),
    samples,nflStarts,rookie:false};
 });
}
function legalLineup(players){
 const g={QB:[],RB:[],WR:[],TE:[]};
 for(const p of players)if(g[p.pos]&&p.ppg>0)g[p.pos].push(p.ppg);
 for(const pos of ['QB','RB','WR','TE'])g[pos].sort((a,b)=>b-a);
 function take(pos,n){let v=0;for(let i=0;i<n;i++)v+=g[pos].shift()||0;return v;}
 let score=take('QB',1)+take('RB',2)+take('WR',3)+take('TE',1);
 const flex=[...g.RB,...g.WR,...g.TE].sort((a,b)=>b-a);
 score+=(flex.shift()||0)+(flex.shift()||0);
 return score+Math.max(g.QB[0]||0,flex[0]||0);
}
function getForm(weekly){
 const result={};
 for(const id of IDS){
  const scores=weekly.filter(x=>+x.season===2026&&+x.franchise_id===id)
   .sort((a,b)=>+a.week-+b.week).map(x=>+x.points_for);
  // Tested Weeks 5/7/10 in 2023-25: a full-season mean outperformed
  // the 65/35 recent-form blend in this limited retrospective sample.
  result[id]=mean(scores);
 }
 return result;
}
function makePicks(data){
 const byYear=Object.fromEntries(YEARS.map(y=>[y,[]]));
 const actual=new Map();
 for(const x of data){
  const year=+x.pick_season,round=+x.round,origin=+x.original_franchise_id,
    owner=+x.current_franchise_id;
  if(!YEARS.includes(year)||round<1||round>4||!IDS.includes(origin)||!IDS.includes(owner))continue;
  const key=year+':'+round+':'+origin;
  if(actual.has(key))throw Error('Duplicate draft pick '+key);
  actual.set(key,{year,round,owner,origin,assumed:false});
 }
 for(const year of YEARS)for(const id of IDS)for(let round=1;round<=4;round++){
  const key=year+':'+round+':'+id;
  if(year<=2029&&!actual.has(key))throw Error('Missing verified draft pick '+key);
  byYear[year].push(actual.get(key)||{year,round,owner:id,origin:id,assumed:true});
 }
 return byYear;
}
function ranks(scores){
 const ids=[...IDS].sort((a,b)=>(scores[a]||0)-(scores[b]||0));
 return Object.fromEntries(ids.map((id,i)=>[id,i+1]));
}
function rookie(r,pick,rank,trial,rookieMultiplier=1,empirical=null){
 let pos,quality,empiricalRookie=false,rookieYearTwoShift=0;
 if(empirical?.[pick.round]?.length>=15){
  const row=empirical[pick.round][Math.floor(r.u()*empirical[pick.round].length)];
  pos=row.pos;
  // Directly sample 2024–25 FIG-league drafted rookie outcomes, including
  // players who earned zero NFL points. Their first 17 NFL weeks are the
  // denominator; do not turn limited appearances into 17 healthy games.
  quality=row.full_week_ppg;
  empiricalRookie=true;
  // Only the 2024 rookie class has a *completed* second season (2025).
  // When using a 2025 first-year player, sample the closest 2024 class
  // player's observed first-to-second-year change from the same round and
  // preferably the same position. Do not manufacture 2026 future points.
  const older=empirical[pick.round].filter(x=>x.season===2024&&x.second_year_ppg!==null);
  const matches=older.map(x=>({row:x,
   distance:Math.abs(x.full_week_ppg-row.full_week_ppg)+(x.pos===row.pos?0:8)
  })).sort((a,b)=>a.distance-b.distance).slice(0,3);
  const comparable=row.season===2024?row:matches.length?matches[Math.floor(r.u()*matches.length)].row:null;
  if(comparable){
   const delta=comparable.second_year_ppg-comparable.full_week_ppg;
   rookieYearTwoShift=clamp(delta,-14,16)*rookieMultiplier;
  }
 }else{
  // Explicit research fallback for data-provider outages or incomplete archives.
  const rates={
   1:[[.09,24],[.25,17],[.40,10],[.26,3]],
   2:[[.04,20],[.13,13],[.30,7],[.53,2]],
   3:[[.02,16],[.08,10],[.19,5],[.71,1]],
   4:[[.008,13],[.042,8],[.15,4],[.80,.7]]
  }[pick.round];
  let u=r.u();quality=1;
  for(const [prob,value] of rates){u-=prob;if(u<=0){quality=value;break;}}
  const d=r.u(),qb=pick.round===1?.23:.14;
  pos=d<qb?'QB':d<.51?'WR':d<.80?'RB':'TE';
 }
 const tier=rank>=8?1.17:rank<=3?.91:1;
 const posScale=empiricalRookie?1:{QB:1.34,RB:.98,WR:1,TE:.74}[pos];
 return {id:'R'+trial+':'+pick.year+':'+pick.round+':'+pick.origin,
  slot_id:'pick:'+pick.year+':'+pick.round+':'+pick.origin,
  name:pick.year+' R'+pick.round+' · '+TEAMS[pick.origin]+' original pick',
  pick_year:pick.year,pick_round:pick.round,pick_origin:pick.origin,
  team:pick.owner,pos,age:21.5,baseYear:pick.year,samples:0,rookie:true,
  basePpg:clamp(quality*tier*posScale*rookieMultiplier*(.8+.4*r.u()),.2,pos==='QB'?37:29),
  qualityShock:r.normal()*.13,empiricalRookie,rookieYearTwoShift:rookieYearTwoShift*tier};
}
function scorePlayer(p,year,r,calibration,options={}){
 const age=p.age+year-p.baseYear,ageFactor=Math.pow(ageCurve(p.pos,age)/ageCurve(p.pos,p.age),options.ageCurveExponent||1);
 const elapsed=Math.max(0,year-p.baseYear);
 // Empirical 2024 rookie-to-sophomore change replaces the fixed year-two
 // developmental bump. Later growth remains an explicit assumption.
 const baseline=p.rookie&&elapsed>=1?
  Math.max(.2,p.basePpg+(p.rookieYearTwoShift||0)):p.basePpg;
 // RosterAudit is a forward-looking dynasty asset ranking, not points
 // itself. For existing players, infer peak-ability scoring by position
 // from current value, then apply exactly ONE future-year age curve.
 // Blend more market weight at longer horizons because 2026 production
 // becomes less predictive, without awarding any manager trade skill.
 const historicalPath=baseline*ageFactor;
 const marketAvailable=!p.rookie&&p.marketValue!==null&&p.marketValue!==undefined;
 const marketPath=marketAvailable?
  marketPpg(p.pos,p.marketValue)*Math.pow(ageCurve(p.pos,age),options.ageCurveExponent||1):historicalPath;
 const horizon=Math.max(0,year-2026);
 const marketShare=marketAvailable?clamp((.25+.09*horizon)*Number(options.valuationBlendStrength??1),0,.9):0;
 const blendedPath=p.rookie?historicalPath:(1-marketShare)*historicalPath+marketShare*marketPath;
 const development=p.rookie?
  1+Math.min(2,Math.max(0,elapsed-1))*({QB:.06,RB:.025,WR:.08,TE:.10}[p.pos]):1;
 const sigma=(p.rookie?.27:p.samples<4?.24:p.samples<12?.17:.12)+Math.sqrt(Math.max(0,year-2026))*.028;
 const talent=Math.exp((p.qualityShock||0)+r.normal()*sigma-.5*sigma*sigma);
 const injury=clamp((.11+Math.max(0,age-29)*.027+(p.pos==='RB'?.035:0))*(options.injuryMultiplier||1),.08,.9);
 // Empirical first-year rookie PPG already includes missed weeks in 17-game denominator.
 const availability=p.empiricalRookie&&year===p.baseYear?1:(r.u()<injury?.47+.35*r.u():1);
 const playerMultiplier=options.playerMultipliers?.[p.id]??1;
 return clamp(blendedPath*development*talent*availability*
  clamp(1+r.normal()*.075,.72,1.27)*calibration*playerMultiplier,0,p.pos==='QB'?46:38);
}
function runModel({roster,values,logs,weekly,picks,nflCurrent=null,nflHistory=null,drafts=null,runs=5000,seed=20261030,scenario={}}){
 if(!roster?.length||!logs?.length||!weekly?.length||!picks?.length||!values?.players)throw Error('Missing input');
 if(!Number.isInteger(runs)||runs<1||runs>100000)throw Error('Invalid runs');
 const ageCurveExponent=Number(scenario.ageCurveExponent??1),injuryMultiplier=Number(scenario.injuryMultiplier??1),rookieMultiplier=Number(scenario.rookieMultiplier??1),valuationBlendStrength=Number(scenario.valuationBlendStrength??1);
 if(!Number.isFinite(ageCurveExponent)||ageCurveExponent<.4||ageCurveExponent>2||!Number.isFinite(injuryMultiplier)||injuryMultiplier<.5||injuryMultiplier>2||!Number.isFinite(rookieMultiplier)||rookieMultiplier<.4||rookieMultiplier>1.6||!Number.isFinite(valuationBlendStrength)||valuationBlendStrength<0||valuationBlendStrength>1.5)throw Error('Invalid research scenario');
 const playerMultipliers=scenario.playerMultipliers??{};
 if(!playerMultipliers||typeof playerMultipliers!=='object'||Array.isArray(playerMultipliers)||Object.values(playerMultipliers).some(x=>!Number.isFinite(x)||x<0||x>1.5))throw Error('Invalid research player multipliers');
 const officialCutoff=Math.max(...weekly.filter(x=>+x.season===2026).map(x=>+x.week));
 if(nflCurrent&&nflCurrent.season!==2026)throw Error('Wrong NFL season for current player samples');
 if(nflHistory&&nflHistory.scoring_season!==2026)throw Error('NFL history must be standardized to FIG 2026 scoring');
 const base=playerBaselines(roster,values,logs,nflCurrent,nflHistory,officialCutoff),matched=base.filter(p=>values.players[p.id]?.value!=null).length;
 if(!base.length||matched/base.length<.95)throw Error('RosterAudit coverage below 95%');
 const form=getForm(weekly),calibration={};
 for(const id of IDS){
  const current=legalLineup(base.filter(p=>p.team===id).map(p=>({pos:p.pos,ppg:p.basePpg})));
  calibration[id]=current?clamp((.75*current+.25*(form[id]||current))/current,.85,1.15):1;
 }
 const picksByYear=makePicks(picks),r=random(seed),empirical=rookieOutcomes(drafts,nflHistory);
 const samples=Object.fromEntries(YEARS.map(y=>[y,Object.fromEntries(IDS.map(id=>[id,[]]))]));
 const leaders=Object.fromEntries(IDS.map(id=>[id,[]]));
 // Track individual outputs from the same simulations as team strength.
 // Rookie trial IDs vary, so their original draft slot is the stable key.
 const playerSamples=Object.fromEntries(YEARS.map(y=>[y,Object.fromEntries(IDS.map(id=>[id,new Map()]))]));
 for(let t=0;t<runs;t++){
  const players=base.map(p=>({...p,qualityShock:r.normal()*.055}));
  let last={...form};
  const first=Object.fromEntries(IDS.map(id=>[id,0]));
  for(const year of YEARS){
   const order=ranks(last);
   for(const pick of picksByYear[year])players.push(rookie(r,pick,order[pick.origin]||5,t,rookieMultiplier,empirical));
   const annual={};
   for(const id of IDS){
    const arr=players.filter(p=>p.team===id).map(p=>{
     const ppg=scorePlayer(p,year,r,calibration[id],{ageCurveExponent,injuryMultiplier,valuationBlendStrength,playerMultipliers});
     const stableId=p.slot_id||p.id,tracked=playerSamples[year][id];
     if(!tracked.has(stableId))tracked.set(stableId,{
      id:stableId,name:p.name||'Future rookie',pos:p.rookie?'TBD':p.pos,rookie:!!p.rookie,
      age:p.age+year-p.baseYear,pick_year:p.pick_year||null,
      pick_round:p.pick_round||null,pick_origin:p.pick_origin||null,
      sum:0,values:[]});
     const item=tracked.get(stableId);
     item.sum+=ppg;item.values.push(ppg);
     return {pos:p.pos,ppg};
    });
    annual[id]=Math.max(0,legalLineup(arr)+5*r.normal());
    samples[year][id].push(annual[id]);
   }
   const best=Math.max(...Object.values(annual));
   for(const id of IDS)if(annual[id]===best)first[id]++;
   last=annual;
  }
  for(const id of IDS)leaders[id].push(first[id]);
 }
 const seasons={};
 for(const year of YEARS){
  const arr=samples[year];
  const player_projections=Object.fromEntries(IDS.map(id=>[id,[...playerSamples[year][id].values()].map(p=>({
   id:p.id,name:p.name,pos:p.pos,rookie:p.rookie,age:rnd(p.age,1),
   pick_year:p.pick_year,pick_round:p.pick_round,pick_origin:p.pick_origin,
   ppg:rnd(p.sum/runs),p10:rnd(pct(p.values,.1)),p90:rnd(pct(p.values,.9))
  })).sort((a,b)=>b.ppg-a.ppg||a.name.localeCompare(b.name))]));
  const ranking=IDS.map(id=>{
   let first=0,top3=0;
   for(let i=0;i<runs;i++){
    const better=IDS.filter(other=>other!==id&&arr[other][i]>arr[id][i]).length;
    if(better===0)first++;
    if(better<3)top3++;
   }
   return {id,name:TEAMS[id],ppg:rnd(mean(arr[id])),p10:rnd(pct(arr[id],.1)),p90:rnd(pct(arr[id],.9)),
     best_pct:rnd(100*first/runs),top3_pct:rnd(100*top3/runs)};
  }).sort((a,b)=>b.ppg-a.ppg);
  const boek=arr[1];
  const comparisons=IDS.filter(id=>id!==1).map(id=>{
   const gaps=boek.map((value,i)=>value-arr[id][i]);
   return {id,name:TEAMS[id],gap_ppg:rnd(mean(gaps)),p10:rnd(pct(gaps,.1)),p90:rnd(pct(gaps,.9)),
     boek_stronger_pct:rnd(100*gaps.filter(v=>v>0).length/runs)};
  }).sort((a,b)=>a.gap_ppg-b.gap_ppg);
  const bestOther=boek.map((value,i)=>value-Math.max(...IDS.filter(id=>id!==1).map(id=>arr[id][i])));
  seasons[year]={ranking,player_projections,boek_vs_leagues_best_opponent:{
   gap_ppg:rnd(mean(bestOther)),p10:rnd(pct(bestOther,.1)),p90:rnd(pct(bestOther,.9)),
   boek_stronger_pct:rnd(100*bestOther.filter(v=>v>0).length/runs)},boek_vs_teams:comparisons};
 }
 const whole_horizon=IDS.map(id=>({id,name:TEAMS[id],expected_years_best:rnd(mean(leaders[id]),2),
   chance_best_at_least_three_years_pct:rnd(100*leaders[id].filter(v=>v>=3).length/runs)
 })).sort((a,b)=>b.expected_years_best-a.expected_years_best);
 return {version:'experimental-v2.2-value-age',status:'research_only',seed,runs,years:YEARS,scenario:{ageCurveExponent,injuryMultiplier,rookieMultiplier,valuationBlendStrength,playerMultipliers},
  inputs:{observed_through_week:Math.max(...weekly.filter(x=>+x.season===2026).map(x=>+x.week)),
   current_rostered_players:base.length,market_coverage_pct:rnd(100*matched/base.length),
   historical_player_start_logs:logs.length,
   current_nfl_wide_rostered_players:base.filter(p=>p.nflStarts>0).length,
   observed_nfl_wide_rostered_games:base.reduce((sum,p)=>sum+p.nflStarts,0),
   empirical_rookie_samples:Object.fromEntries([1,2,3,4].map(round=>[round,empirical[round].length])),
   second_year_2024_class_samples:Object.values(empirical).flat().filter(x=>x.season===2024&&x.second_year_ppg!==null).length,
   known_2027_2029_picks:YEARS.slice(0,3).reduce((s,y)=>s+picksByYear[y].filter(p=>!p.assumed).length,0),
   known_2030_2032_picks:YEARS.slice(3).reduce((s,y)=>s+picksByYear[y].filter(p=>!p.assumed).length,0),
   assumed_2030_2032_picks:YEARS.slice(3).reduce((s,y)=>s+picksByYear[y].filter(p=>p.assumed).length,0)},
  current_form:IDS.map(id=>({id,name:TEAMS[id],form_ppg:rnd(form[id]),calibration:rnd(calibration[id],3)})),
  seasons,whole_horizon,
  limitations:[
   'Research only; future probabilities not historically validated or betting odds.',
   'RosterAudit age-and-position-adjusted market talent is blended into incumbent player PPG increasingly from 34% in 2027 to 79% in 2032. Current 2026 production anchors the rest. Future-age adjustment is applied only once per pathway.',
   'Market-to-PPG scale matches 2026 scoring cross-section but is not calibrated against an independent historical RosterAudit holdout. Future market prices themselves are NOT predicted.',
   'Prefer standardized NFL-wide 2023-2026 observed games; fall back to league started-player logs, then market-position priors for unobserved bench players.',
   'Empirical rookie year-one samples use 80 FIG rookies in 2024-25; sophomore development uses 40 FIG rookies selected in 2024. Later aging and injuries remain hypothetical.',
   'Real pick ownership for all seasons present in Sleeper; unlisted future years assume one original pick per round per team and may change with trades.',
   'Draft tier is inferred from previous simulated scoring, not guaranteed draft order.',
   'Season scoring is a stylized best legal lineup with availability penalties, not week-by-week injury-aware lineup optimization.',
   'No fabricated future trades or manager ability bonuses; schedule not used to measure scoring dominance.'
  ]};
}
function main(args){
 let runs=5000,out='',seed=20261030;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--runs')runs=+args[++i];
  else if(args[i]==='--seed')seed=+args[++i];
  else if(args[i]==='--out')out=args[++i];
  else throw Error('Unknown option '+args[i]);
 }
 const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f),'utf8'));
 const opt=f=>fs.existsSync(path.resolve(__dirname,'../data',f))?read(f):null;
 const m=runModel({roster:read('current_roster.json'),values:read('rosteraudit_values.json'),
  logs:read('player_game_log.json'),weekly:read('weekly_scoring_ranks.json'),
  picks:read('current_future_picks.json'),nflCurrent:opt('playoff_nfl_weekly_scores.json'),
  nflHistory:opt('dynasty_nfl_history.json'),drafts:opt('draft_picks.json'),runs,seed});
 if(out)fs.writeFileSync(out,JSON.stringify(m,null,2)+'\n');
 console.log('FIG Dynasty Dominance '+runs+' experimental simulations');
 for(const year of YEARS){
  const y=m.seasons[year],boek=y.ranking.find(x=>x.id===1),hayden=y.ranking.find(x=>x.id===6);
  console.log(year, 'Boek',boek.ppg,'PPG, #1',boek.best_pct+'%; Hayden',hayden.ppg,
    'PPG, #1',hayden.best_pct+'%; gap vs top opponent',y.boek_vs_leagues_best_opponent.gap_ppg);
 }
 console.log('Research-only; see JSON for limitations.');
}
if(require.main===module)main(process.argv.slice(2));
module.exports={random,ageCurve,marketPpg,nflScoringSamples,rookieOutcomes,playerBaselines,scorePlayer,legalLineup,getForm,makePicks,runModel};
