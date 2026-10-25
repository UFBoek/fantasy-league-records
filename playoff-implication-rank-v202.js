/* Rank only consequential remaining games for the selected manager.
   The user's playoff, first-seed and top-three-bye probabilities all come
   from the SAME schedule-aware Monte Carlo samples. No arbitrary filler. */
(function(global){
 'use strict';
 const MIN_SWING=0.01; // 1.0 percentage point: don't display 0.0pp noise.
 const MIN_SAMPLES=150;
 const MAX_GAMES=3;
 const METRICS=[
   {key:'made',label:'PLAYOFF ODDS'},
   {key:'one',label:'1 SEED ODDS'},
   {key:'bye',label:'TOP-3 BYE ODDS'}
 ];
 function probability(game,metric,side,team){
   const sample=game.count[side],success=game[metric]&&game[metric][side];
   return (success&&Number(success[team])||0)/sample;
 }
 function rankGames(impacts,teamId){
   const own=[],others=[];
   for(const game of Object.values(impacts||{})){
     if(!game||game.locked||+game.a===10||+game.b===10||
        !Array.isArray(game.count)||game.count[0]<MIN_SAMPLES||
        game.count[1]<MIN_SAMPLES)continue;
     let best=null;
     for(const metric of METRICS){
       const forA=probability(game,metric.key,0,teamId);
       const forB=probability(game,metric.key,1,teamId);
       const swing=Math.abs(forA-forB);
       if(swing>=MIN_SWING&&(!best||swing>best.swing+1e-12))
         best={metric:metric.key,metricLabel:metric.label,forA,forB,swing};
     }
     if(!best)continue;
     const participants=[game.a,game.b].map((id,index)=>{
       const win=probability(game,best.metric,index,id);
       const loss=probability(game,best.metric,1-index,id);
       return {id,win,loss,swing:Math.abs(win-loss)};
     });
     const entry={game,...best,participants};
     if(+game.a===+teamId||+game.b===+teamId)own.push(entry);
     else others.push(entry);
   }
   const sorter=(a,b)=>b.swing-a.swing||+a.game.week-+b.game.week||
     String(a.game.key).localeCompare(String(b.game.key));
   return {own:own.sort(sorter).slice(0,MAX_GAMES),
           others:others.sort(sorter).slice(0,MAX_GAMES)};
 }
 const api={rankGames,MIN_SWING,MIN_SAMPLES};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figPlayoffImplicationRanking=api;
})(typeof window!=='undefined'?window:null);
