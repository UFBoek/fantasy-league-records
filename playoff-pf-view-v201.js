/* Presentation-only Points For through the active NFL week.
   Playoff Monte Carlo already samples and adds each week's points exactly
   once; never inject these projected points into official standings or
   simulation starting PF. */
(function(global){
 'use strict';
 function liveWeekUnderway({lineupActive,activeWeek,verifiedNextWeek,liveActuals}){
   if(!lineupActive||Number(activeWeek)!==Number(verifiedNextWeek)||
      !Number.isInteger(Number(activeWeek))||Number(activeWeek)<1)return false;
   return Object.values(liveActuals||{}).some(function(row){
     return row&&(row.phase==='LIVE'||row.phase==='FINAL');
   });
 }
 function projectedPointsFor(official,weekEstimate,underway){
   const pf=Number(official);
   if(!Number.isFinite(pf))return null;
   const estimate=weekEstimate===null||weekEstimate===undefined?NaN:Number(weekEstimate);
   if(!underway||!Number.isFinite(estimate))
     return {official:pf,total:pf,projected:0,includesCurrentWeek:false};
   return {official:pf,total:pf+estimate,projected:estimate,includesCurrentWeek:true};
 }
 const api={liveWeekUnderway,projectedPointsFor};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figPlayoffPFView=api;
})(typeof window!=='undefined'?window:null);
