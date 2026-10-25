/* Live matchup forecast: smoothly transfer team-level pregame confidence to
   observed NFL scoring as game minutes resolve. Independent pure module used
   by both the matchup page and season playoff Monte Carlo. */
(function(global){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const numeric=v=>v===null||v===undefined||v===''?null:
   Number.isFinite(Number(v))?Number(v):null;
 function estimate({pregameMean,baselineSD,starterTotal,starters,players,live,actualSum}){
   const start=numeric(pregameMean),sd=numeric(baselineSD),total=numeric(starterTotal);
   if(start===null||sd===null||total===null||!Array.isArray(starters)||starters.length!==10)
     return null;
   const scores=players||{},current=live||{};
   let resolved=0,weight=0,valid=0,count=0;
   for(const id of starters){
     const key=String(id);
     const player=scores[key]||{};
     const projection=numeric(player.projection);
     // Avoid negative projection weights; zero-value starters still contribute
     // by headcount when the whole lineup has zero estimated workload.
     const importance=projection===null?0:Math.max(0,projection);
     const info=current[key];
     const progress=info&&info.phase==='FINAL'?1:
       info&&info.phase==='LIVE'?numeric(info.progress):null;
     const fraction=progress===null?0:clamp(progress,0,1);
     weight+=importance;
     resolved+=importance*fraction;
     count+=fraction;
     valid++;
   }
   const progress=clamp(weight>0?resolved/weight:count/Math.max(1,valid),0,1);
   // At zero game time, preserve the established pregame team model. With
   // all players final, the estimate must equal the observed lineup exactly.
   const mean=(1-progress)*start+progress*total;
   // Remaining uncertainty falls with unplayed expected offensive workload,
   // rather than remaining at a full game's SD until Monday night.
   const remainingSD=Math.max(0,sd)*Math.sqrt(Math.max(0,1-progress));
   return {mean:progress===1?total:mean,sd:remainingSD,progress,
     actualSum:numeric(actualSum)||0};
 }
 const api={estimate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figPlayoffLiveForecast=api;
})(typeof window!=='undefined'?window:null);
