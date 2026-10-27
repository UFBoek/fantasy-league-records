/* Live score bounds for matchup probabilities and Monte Carlo draws.
   Final score draws must not discard points that Sleeper has already counted.
   The limited in-progress deduction allowance models a couple of turnovers
   per unfinished starter; rare corrections beyond it are not modeled. */
(function(global){
 'use strict';
 const MAX_LOSS_PER_ACTIVE_STARTER=4;
 const numeric=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
 const round=x=>Math.round(x*100)/100;
 function scoreStates(matchups,live){
   const states={},overrides=live||{};
   for(const row of (Array.isArray(matchups)?matchups:[])){
     const id=Number(row.roster_id),starters=Array.isArray(row.starters)?row.starters.map(String):[];
     if(!Number.isInteger(id)||starters.length!==10||new Set(starters).size!==10)continue;
     const points=row.players_points&&typeof row.players_points==='object'?row.players_points:{};
     const slots=Array.isArray(row.starters_points)?row.starters_points:[];
     let sum=0,known=0,active=0,finalCount=0;
     for(let i=0;i<starters.length;i++){
       const pid=starters[i];
       const raw=Object.prototype.hasOwnProperty.call(points,pid)?points[pid]:slots[i];
       const value=numeric(raw);
       if(value!==null){sum+=value;known++;}
       const l=overrides[pid];
       if(l&&l.phase==='FINAL')finalCount++;
       if(l&&l.phase==='LIVE')active++;
     }
     const official=numeric(row.points);
     const earned=official!==null?official:known===10?round(sum):null;
     if(earned===null)continue;
     // Use the actively reported lineups, not the published daily roster
     // snapshot, for the earned point totals and final-state confirmation.
     states[id]={earned,liveCount:active,finalCount,
       allFinal:finalCount===10,
       // A tiny, explicit downside allowance for turnovers/negative plays.
       // No normal draw can erase 8 already-earned points from one active player.
       floor:Math.max(0,earned-MAX_LOSS_PER_ACTIVE_STARTER*active)};
   }
   return states;
 }
 function sample({mean,sd,state,rng,normal}){
   const mu=numeric(mean),sigma=numeric(sd);
   if(mu===null||sigma===null)return null;
   if(state&&state.allFinal)return state.earned;
   const draw=Math.max(0,mu+Math.max(0,sigma)*(normal?normal(rng):0));
   return round(state?Math.max(state.floor,draw):draw);
 }
 function winChance({a,b,aMean,bMean,aSd,bSd,seed=0xD00DFEED,draws=6000}){
   const diff=numeric(aMean)-numeric(bMean);
   const sa=numeric(aSd),sb=numeric(bSd);
   if(!Number.isFinite(diff)||sa===null||sb===null)return null;
   // Hard resolution cases need no simulation and must return exact 0%/100%.
   if(a&&b){
     if(a.allFinal&&b.allFinal)return a.earned>b.earned?1:a.earned<b.earned?0:.5;
     if(b.allFinal&&a.floor>b.earned)return 1;
     if(a.allFinal&&b.floor>a.earned)return 0;
   }
   let s=seed>>>0;
   const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return(s+.5)/4294967296;};
   const norm=rng=>Math.sqrt(-2*Math.log(Math.max(1e-9,rng())))*Math.cos(6.283185307179586*rng());
   let wins=0;
   for(let i=0;i<draws;i++){
     const x=sample({mean:aMean,sd:sa,state:a,rng:rand,normal:norm});
     const y=sample({mean:bMean,sd:sb,state:b,rng:rand,normal:norm});
     wins+=x>y?1:x===y?.5:0;
   }
   return wins/draws;
 }
 const api={scoreStates,sample,winChance,MAX_LOSS_PER_ACTIVE_STARTER};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figPlayoffScoreBounds=api;
})(typeof window!=='undefined'?window:null);
