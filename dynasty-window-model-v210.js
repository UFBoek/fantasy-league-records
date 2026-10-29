/* Dynasty Window Index v210 — deterministic, schedule-independent 0–100 composites.
   Values by RosterAudit; player ages from the current Sleeper NFL player directory.
   These are transparent relative rankings, never projected championship odds. */
(function(global) {
 'use strict';
 const weights = Object.freeze({
   current:{ppg:0.55,starter:0.20,consistency:0.15,depth:0.10},
   future:{total:0.30,picks:0.25,ageCore:0.25,youngCore:0.20}
 });
 const N=10;
 function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
 function validAge(v){const n=Number(v);return v!==null&&v!==undefined&&v!==''&&Number.isFinite(n)&&n>=18&&n<=50?n:null;}
 function isTrue(v){return v===true||String(v).toLowerCase()==='true';}
 function mean(values){return values.reduce((a,b)=>a+b,0)/Math.max(values.length,1);}
 function sd(values){const avg=mean(values);return Math.sqrt(mean(values.map(v=>(v-avg)**2)));}
 function ageFactor(position,age){
   if(validAge(age)===null)return null;
   const p=String(position||'').toUpperCase(),a=Number(age);
   if(p==='QB')return a<=24?.98:a<=29?1.08:a<=32?1:a<=35?.88:.72;
   if(p==='RB')return a<=23?1.08:a<=25?1:a===26?.90:a===27?.78:.62;
   if(p==='WR')return a<=24?1.04:a<=27?1.08:a<=29?1:a<=31?.88:.74;
   if(p==='TE')return a<=25?1:a<=29?1.08:a<=31?1:.84;
   return null;
 }
 function isYoung(position,age){
   const a=validAge(age);
   if(a===null)return false;
   const cutoff={QB:27,RB:24,WR:25,TE:26}[String(position||'').toUpperCase()];
   return cutoff!==undefined&&a<=cutoff;
 }
 function projected(scores,prevScores){
   if(scores.length<5)return null;
   const full=mean(scores),recent=mean(scores.slice(-3));
   const ppg=Math.max(35,Math.min(300,.65*full+.35*recent));
   const recentWindow=scores.slice(-8),need=Math.max(0,8-recentWindow.length);
   const priorWindow=need?prevScores.slice(-need):[];
   const varianceTotal=recentWindow.reduce((sum,v)=>sum+(v-mean(recentWindow))**2,0)+
      priorWindow.reduce((sum,v)=>sum+(v-mean(prevScores))**2,0);
   const sdVal=Math.sqrt(varianceTotal/Math.max(recentWindow.length+priorWindow.length,1));
   return {ppg,sd:sdVal,cv:ppg>0?sdVal/ppg:0,sample:recentWindow.length+priorWindow.length};
 }
 function normalize(rows,key,invert){
   const observed=rows.map(r=>r.raw[key]).filter(v=>Number.isFinite(v)),lo=Math.min(...observed),hi=Math.max(...observed);
   rows.forEach(r=>{
     const v=r.raw[key];
     r.components[key]=!Number.isFinite(v)?null:hi===lo?50:Math.max(0,Math.min(100,100*(invert?(hi-v):(v-lo))/(hi-lo)));
   });
 }
 function rawData(input){
   const {teams,weeklyRanks=[],season,playerValue}=input;
   if(!Array.isArray(teams)||teams.length!==N)throw Error('Championship Window requires all 10 franchises');
   if(typeof playerValue!=='function')throw Error('A validated RosterAudit value lookup is required');
   const knownIds=new Set(teams.map(t=>Number(t.id)));
   if(knownIds.size!==N)throw Error('Duplicate or missing franchise IDs');
   const seasons=weeklyRanks.filter(r=>Number(r.season)===Number(season)&&Number(r.week)>=1&&Number(r.week)<=14&&Number.isFinite(Number(r.points_for)));
   const previous=weeklyRanks.filter(r=>Number(r.season)===Number(season)-1&&Number(r.week)>=1&&Number(r.week)<=14&&Number.isFinite(Number(r.points_for)));
   return teams.map(t=>{
     const id=Number(t.id);
     const teamScores=seasons.filter(r=>+r.franchise_id===id).sort((a,b)=>+a.week-+b.week).map(r=>+r.points_for);
     const priorScores=previous.filter(r=>+r.franchise_id===id).sort((a,b)=>+a.week-+b.week).map(r=>+r.points_for);
     const model=projected(teamScores,priorScores);
     const roster=[...new Map((t.roster||[]).map(p=>[String(p.player_id),p])).values()].map(p=>({
       ...p,position:String(p.position||'').toUpperCase(),
       value:Math.max(0,num(playerValue(p.player_id))),age:validAge(p.age)
     }));
     const playable=roster.filter(p=>!isTrue(p.is_taxi)&&!isTrue(p.is_reserve)&&['QB','RB','WR','TE'].includes(p.position));
     const official=playable.filter(p=>isTrue(p.is_starter));
     const sorted=playable.slice().sort((a,b)=>b.value-a.value);
     const starters=official.length===10?official:sorted.slice(0,10);
     const starterIds=new Set(starters.map(p=>String(p.player_id)));
     const bench=sorted.filter(p=>!starterIds.has(String(p.player_id))).slice(0,5);
     const eligible=roster.filter(p=>['QB','RB','WR','TE'].includes(p.position));
     const knownAgeValue=eligible.filter(p=>p.age!==null).reduce((a,p)=>a+p.value,0);
     const ageValue=eligible.reduce((a,p)=>a+p.value,0);
     const ageCoverage=ageValue>0?knownAgeValue/ageValue:0;
     const readyAge=ageCoverage>=.90 && eligible.filter(p=>p.value>0&&p.age!==null).length>=5;
     const ageCore=readyAge?eligible.map(p=>({value:p.value* (ageFactor(p.position,p.age)||0)})).sort((a,b)=>b.value-a.value).slice(0,8).reduce((a,p)=>a+p.value,0):null;
     const youngCore=readyAge?eligible.filter(p=>isYoung(p.position,p.age)).sort((a,b)=>b.value-a.value).slice(0,5).reduce((a,p)=>a+p.value,0):null;
     const pickValue=Math.max(0,num(t.picks));
     const totalValue=Math.max(0,num(t.value));
     const raw={
       ppg:model?model.ppg:null, consistency:model?model.cv:null,
       starter:starters.reduce((a,p)=>a+p.value,0),
       depth:bench.reduce((a,p)=>a+p.value,0),
       total:totalValue,picks:pickValue,
       ageCore,youngCore
     };
     return {id,team:t,raw,model,ageCoverage,readyAge,starterFallback:official.length!==10,
       topStarters:starters.length,youngAssetCount:eligible.filter(p=>isYoung(p.position,p.age)).length,
       components:{},current:null,future:null,label:'',klass:'neutral'};
   });
 }
 function rank(rows,key){
   rows.slice().sort((a,b)=>num(b[key])-num(a[key])||a.id-b.id).forEach((r,i)=>{r[key+'Rank']=i+1;});
 }
 function classify(row){
   if(row.current===null||row.future===null)return ['Awaiting verified data','neutral'];
   const c=row.currentRank,f=row.futureRank;
   if(c<=4&&f<=4)return ['Dynasty Juggernaut','elite'];
   if(c<=4&&f>=7)return ['Fragile Contender','fragile'];
   if(c<=4)return ['Win-Now Contender','now'];
   if(c>=8&&f<=4)return ['Rebuilder','rise'];
   if(f<=4)return ['Rising Contender','rise'];
   if(c<=6&&f<=6)return ['Balanced Playoff Team','balanced'];
   if(c>=8&&f>=8)return ['Rebuild Needed','rebuild'];
   return ['Stuck in the Middle','neutral'];
 }
 function calculate(input){
   const rows=rawData(input);
   ['ppg','starter','consistency','depth','total','picks','ageCore','youngCore'].forEach(k=>normalize(rows,k,k==='consistency'));
   rows.forEach(row=>{
     if(row.model){
       row.current=Math.round(100*Object.keys(weights.current).reduce((s,k)=>s+weights.current[k]*row.components[k],0))/100;
     }
     if(row.readyAge&&['total','picks','ageCore','youngCore'].every(k=>row.components[k]!==null)){
       row.future=Math.round(100*Object.keys(weights.future).reduce((s,k)=>s+weights.future[k]*row.components[k],0))/100;
     }
   });
   rank(rows,'current');rank(rows,'future');
   rows.forEach(r=>{[r.label,r.klass]=classify(r)});
   rows.sort((a,b)=>(b.current??-1)-(a.current??-1)||a.id-b.id);
   const available=rows.every(r=>r.current!==null&&r.future!==null);
   return {rows,available,weights,season:input.season};
 }
 const api={calculate,ageFactor,isYoung,projected,weights};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figDynastyWindowModel=api;
})(typeof window!=='undefined'?window:null);
