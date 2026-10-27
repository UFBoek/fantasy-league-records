/* A single full-season bracket draw.
   Use the same sampled match scores and W-L -> Points For tiebreaker as
   the 8,000-run playoff calculator. Unlike the projected-mean bracket,
   every click can produce a different five-team playoff field. */
(function(global){
 'use strict';
 function simulateSeason({standings,games,scoreGame}){
   if(!Array.isArray(standings)||standings.length!==10||
      !Array.isArray(games)||typeof scoreGame!=='function')
     throw new Error('Full 10-team standings and remaining schedule required');
   const rows=standings.map(row=>({
     id:Number(row.id),wins:Number(row.wins),losses:Number(row.losses),
     ties:Number(row.ties),pf:Number(row.pf)
   }));
   const byId={};
   for(const team of rows){
     if(!Number.isInteger(team.id)||byId[team.id]||
        ![team.wins,team.losses,team.ties,team.pf].every(Number.isFinite))
       throw new Error('Invalid or duplicated official team standings');
     byId[team.id]=team;
   }
   const outcomes=[];
   for(const game of games){
     const a=byId[game.a],b=byId[game.b];
     if(!a||!b||a===b)throw new Error('Remaining matchup must use two valid teams');
     const points=scoreGame(game);
     if(!Array.isArray(points)||points.length!==2||
        !points.every(value=>Number.isFinite(Number(value))))
       throw new Error('Unusable weekly fantasy scores');
     const pa=Number(points[0]),pb=Number(points[1]);
     a.pf+=pa;b.pf+=pb;
     if(pa>pb){a.wins++;b.losses++;}
     else if(pb>pa){b.wins++;a.losses++;}
     else {a.ties++;b.ties++;}
     outcomes.push({week:game.week,a:a.id,b:b.id,aPts:pa,bPts:pb,
       winner:pa>pb?a.id:pb>pa?b.id:null});
   }
   // Same exact convention as the existing Monte Carlo standingsSort.
   rows.sort((a,b)=>(b.wins+b.ties*.5)-(a.wins+a.ties*.5)||
     b.pf-a.pf||a.id-b.id);
   return {seeds:rows.slice(0,5).map(row=>row.id),
     standings:rows.map((row,i)=>({...row,seed:i<5?i+1:null,qualifies:i<5})),
     games:outcomes};
 }
 const api={simulateSeason};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.figPlayoffSeasonDraw=api;
})(typeof window!=='undefined'?window:null);
