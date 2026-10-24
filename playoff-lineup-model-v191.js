/* Active week only: compare starters with each team's usual starting group.
   Player PPG is always 70% last eight + 30% last three archived games,
   including fantasy bench scores. No positional or prior-season pseudo-starts. */
(function(global) {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function calculate({year,week,matchups,playerScores}) {
    const rows=Array.isArray(matchups)?matchups:[];
    const currentYear=Number(year), activeWeek=Number(week);
    if(!playerScores||Number(playerScores.season)!==currentYear||
      Number(playerScores.through_week)!==activeWeek-1||
      !playerScores.players||!playerScores.previous_lineups||
      !Number.isInteger(activeWeek)||activeWeek<2||rows.length!==10)return {};

    const projections=playerScores.players,previous=playerScores.previous_lineups;
    function projectedTotal(ids) {
      if(!Array.isArray(ids)||ids.length!==10||new Set(ids).size!==10)return null;
      let total=0;
      for(const player of ids) {
        const score=projections[String(player)];
        // Missing NFL scoring history must not be interpreted as 0 PPG.
        if(!score||!Number.isFinite(Number(score.projection))||!(score.games>0))return null;
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
      const current=projectedTotal(starters);
      const priorTotals=past.map(ids=>projectedTotal(ids));
      const complete=past.length>=2&&current!==null&&priorTotals.every(v=>v!==null);
      if(!complete) {
        adjusted[team]={delta:0,historyWeeks:past.length,available:false};
        continue;
      }
      const typical=priorTotals.reduce((sum,v)=>sum+v,0)/priorTotals.length;
      // This is the existing conservative TEAM-level adjustment, separate
      // from the 70/30 player projection formula.
      const delta=clamp(0.7*(current-typical),-30,30);
      adjusted[team]={delta,starterTotal:current,typicalTotal:typical,
        historyWeeks:past.length,available:true};
    }
    return seen.size===10?adjusted:{};
  }

  const api={calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(global)global.figPlayoffLineupModel=api;
})(typeof window!=='undefined'?window:null);
