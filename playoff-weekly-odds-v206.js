/* Current-week odds center on the 70/30 starter forecast, not the team's
   historical 65/35 scoring mean. Before Sunday noon Eastern, expose the
   historical comparisons; from Sunday noon on, keep only the live starter
   expectation. The week dates follow the NFL regular-season Sunday calendar
   (first Sunday after Labor Day) and use the New York timezone across DST. */
(function(global){
 'use strict';
 function firstSunday(year){
   if(!Number.isInteger(year)||year<2020||year>2100)return null;
   const septFirst=new Date(Date.UTC(year,8,1)).getUTCDay();
   const laborDay=1+(8-septFirst)%7;
   return new Date(Date.UTC(year,8,laborDay+6));
 }
 function sundayNoonEastern({year,week,now=Date.now()}){
   year=Number(year);week=Number(week);
   if(!Number.isInteger(week)||week<1||week>18)return false;
   const first=firstSunday(year);
   if(!first)return false;
   const target=new Date(first.getTime()+(week-1)*7*86400000);
   const parts=Object.fromEntries(
     new Intl.DateTimeFormat('en-US',{
       timeZone:'America/New_York',year:'numeric',month:'2-digit',
       day:'2-digit',hour:'2-digit',hourCycle:'h23'
     }).formatToParts(new Date(now)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)])
   );
   const localNow=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour);
   const cutoff=Date.UTC(target.getUTCFullYear(),target.getUTCMonth(),target.getUTCDate(),12);
   return localNow>=cutoff;
 }
 function expectedWeeklyMean({expected,simulated,baseline}){
   // Zero is legitimate for a fully scored lineup. Null/missing is not.
   for(const value of [expected,simulated,baseline]){
     if(value===null||value===undefined||value==='')continue;
     if(Number.isFinite(Number(value)))return Number(value);
   }
   return null;
 }
 // Treat this week's projected final score as ONE additional result when
 // forecasting future weeks and the title. Recompute the standard 65% season
 // and 35% last-three average instead of repeating this lineup indefinitely.
 function projectedModelMean({completedScores,currentEstimate,leagueAverage}){
   const estimate=expectedWeeklyMean({expected:currentEstimate,simulated:null,baseline:null});
   if(estimate===null||!Array.isArray(completedScores))return null;
   const scores=[];
   for(const score of completedScores){
     if(score===null||score===undefined||score===''||!Number.isFinite(Number(score)))
       return null;
     scores.push(Number(score));
   }
   const all=scores.concat(estimate);
   const season=all.reduce((sum,v)=>sum+v,0)/all.length;
   const lastThree=all.slice(-3);
   const recent=lastThree.reduce((sum,v)=>sum+v,0)/lastThree.length;
   let mean=Math.max(35,Math.min(300,.65*season+.35*recent));
   if(all.length<3){
     const league=leagueAverage!==null&&leagueAverage!==undefined&&
       Number.isFinite(Number(leagueAverage))?Number(leagueAverage):season;
     mean=league+(mean-league)*all.length/3;
   }
   return mean;
 }
 const api={sundayNoonEastern,expectedWeeklyMean,projectedModelMean,firstSunday};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figPlayoffWeeklyOdds=api;
})(typeof window!=='undefined'?window:null);
