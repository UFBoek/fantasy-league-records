/* Weeks in the FIG record book are authoritative for MODEL timing.
   Sleeper can keep its old 'leg' number for hours after those games finish.
   Never replace official records or invent a locked starting lineup. */
(function(global){
 'use strict';
 function weekStatus({lastCompletedWeek,activeSleeperWeek,regularSeasonEnd=14}){
   const done=Number(lastCompletedWeek),active=activeSleeperWeek===null||
     activeSleeperWeek===undefined?NaN:Number(activeSleeperWeek);
   if(!Number.isInteger(done)||done<0||!Number.isInteger(active)||
      !Number.isInteger(regularSeasonEnd)||done>=regularSeasonEnd)
     return {ready:false,early:false,week:null};
   const week=done+1;
   const early=active===done;
   return {ready:early||active===week,early,week};
 }
 const api={weekStatus};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figPlayoffWeekGate=api;
})(typeof window!=='undefined'?window:null);
