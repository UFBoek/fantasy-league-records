/* Active-week starters compared with prior complete starting groups.
   Before a player's NFL game, use current-season 70/30 full-game PPG.
   Live games use earned fantasy points PLUS projected remainder. Never
   substitute a kickoff score of zero for a full-game PPG forecast. */
(function(global) {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function calculate({year,week,matchups,playerScores,liveOverrides}) {
    const rows=Array.isArray(matchups)?matchups:[];
    const currentYear=Number(year), activeWeek=Number(week);
    if(!playerScores||Number(playerScores.season)!==currentYear||
      Number(playerScores.through_week)!==activeWeek-1||
      !playerScores.players||!playerScores.previous_lineups||
      !Number.isInteger(activeWeek)||activeWeek<2||rows.length!==10)return {};

    const projections=playerScores.players,previous=playerScores.previous_lineups;
    const live=liveOverrides&&typeof liveOverrides==='object'?liveOverrides:{};
    function projectedTotal(ids,useLive) {
      if(!Array.isArray(ids)||ids.length!==10||new Set(ids).size!==10)return null;
      let total=0;
      for(const player of ids) {
        const override=useLive?live[String(player)]:null;
        if(override) {
          // Only completed NFL games may replace full-game projections with
          // raw Sleeper points. In-progress games contribute ACTUAL +
          // PROJECTED REMAINDER, supplied by the shared clock-aware helper.
          const expected=override.expected!==null&&override.expected!==undefined?
            Number(override.expected):NaN;
          if(Number.isFinite(expected)){total+=expected;continue;}
          if(override.phase==='FINAL'&&override.points!==null&&
             override.points!==undefined&&Number.isFinite(Number(override.points))){
            total+=Number(override.points);continue;
          }
        }
        const score=projections[String(player)];
        // Missing NFL scoring history must not be interpreted as 0 PPG.
        // Sleeper's current-week forecast is an explicit backup only when a
        // player has no played NFL games this season.
        const projected=score&&score.projection!==null?Number(score.projection):NaN;
        const played=score&&Number(score.games)>0;
        const sleeperOnly=score&&score.source==='sleeper_projection';
        if(!Number.isFinite(projected)||(!played&&!sleeperOnly))return null;
        total+=Number(score.projection);
      }
      return total;
    }

    const adjusted={},seen=new Set();
    for(const row of rows) {
      const team=Number(row.roster_id),starters=Array.isArray(row.starters)?row.starters.map(String):[];
      if(!Number.isInteger(team)||team<1||team>10||seen.has(team)||
        starters.length!==10||new Set(starters).size!==10||
        starters.some(id=>!id||id==='0'||id==='null'))return {};
      seen.add(team);
      const past=Array.isArray(previous[String(team)])?previous[String(team)].slice(0,3):[];
      const current=projectedTotal(starters,true);
      const pregame=projectedTotal(starters,false);
      const priorTotals=past.map(ids=>projectedTotal(ids));
      const complete=past.length>=2&&current!==null&&pregame!==null&&priorTotals.every(v=>v!==null);
      if(!complete) {
        adjusted[team]={delta:0,historyWeeks:past.length,available:false};
        continue;
      }
      const typical=priorTotals.reduce((sum,v)=>sum+v,0)/priorTotals.length;
      const actualStarters=starters.filter(id=>live[id]&&
        live[id].points!==null&&Number.isFinite(Number(live[id].points)));
      const liveActualSum=actualStarters.reduce((s,id)=>s+Number(live[id].points),0);
      // This is the existing conservative TEAM-level adjustment, separate
      // from the 70/30 player projection formula.
      const delta=clamp(0.7*(current-typical),-30,30);
      const pregameDelta=clamp(0.7*(pregame-typical),-30,30);
      adjusted[team]={delta,pregameDelta,pregameStarterTotal:pregame,
        starterTotal:current,typicalTotal:typical,
        historyWeeks:past.length,available:true,
        liveActualCount:actualStarters.length,liveActualSum};
    }
    return seen.size===10?adjusted:{};
  }

  const api={calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(global)global.figPlayoffLineupModel=api;
})(typeof window!=='undefined'?window:null);
