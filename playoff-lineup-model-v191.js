/* Active-week starters compared with prior complete starting groups.
   Before a player's NFL game, use current-season 70/30 full-game PPG.
   Live games use earned fantasy points PLUS projected remainder. Never
   substitute a kickoff score of zero for a full-game PPG forecast. */
(function(global) {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function calculate({year,week,matchups,playerScores,liveOverrides,allowIncomplete=false}) {
    const rows=Array.isArray(matchups)?matchups:[];
    const currentYear=Number(year), activeWeek=Number(week);
    if(!playerScores||Number(playerScores.season)!==currentYear||
      Number(playerScores.through_week)!==activeWeek-1||
      !playerScores.players||!playerScores.previous_lineups||
      !Number.isInteger(activeWeek)||activeWeek<2||rows.length!==10)return {};

    const projections=playerScores.players,previous=playerScores.previous_lineups;
    const live=liveOverrides&&typeof liveOverrides==='object'?liveOverrides:{};
    const empty=id=>id===null||id===undefined||['','0','null','undefined'].includes(String(id).trim().toLowerCase());
    function normalize(ids){
      if(!Array.isArray(ids)||!ids.length||ids.length>10)return null;
      const slots=ids.map(id=>empty(id)?'':String(id));
      if(new Set(slots.filter(Boolean)).size!==slots.filter(Boolean).length)return null;
      while(slots.length<10)slots.push('');
      return slots;
    }
    function projectedTotal(ids,useLive){
      const starters=normalize(ids);
      if(!starters)return null;
      let total=0;
      for(const player of starters){
        if(!player)continue;
        const override=useLive?live[player]:null;
        if(override){
          const expected=override.expected!==null&&override.expected!==undefined?Number(override.expected):NaN;
          if(Number.isFinite(expected)){total+=expected;continue;}
          if(override.phase==='FINAL'&&override.points!==null&&override.points!==undefined&&Number.isFinite(Number(override.points))){
            total+=Number(override.points);continue;
          }
        }
        const score=projections[player];
        // No NFL scoring history: zero, even if a Sleeper forecast exists.
        if(!score||!(Number(score.games)>0))continue;
        const value=score.projection===null||score.projection===undefined?NaN:Number(score.projection);
        if(!Number.isFinite(value))return null;
        total+=value;
      }
      return total;
    }

    const adjusted={},seen=new Set();
    for(const row of rows) {
      const team=Number(row.roster_id),starters=normalize(row.starters);
      if(!Number.isInteger(team)||team<1||team>10||seen.has(team))return {};
      seen.add(team);
      if(!starters){
        if(!allowIncomplete)return {};
        adjusted[team]={delta:0,historyWeeks:0,available:false,starters:[]};
        continue;
      }
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
        starterTotal:current,typicalTotal:typical,starters,
        historyWeeks:past.length,available:true,
        liveActualCount:actualStarters.length,liveActualSum};
    }
    return seen.size===10?adjusted:{};
  }

  const api={calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(global)global.figPlayoffLineupModel=api;
})(typeof window!=='undefined'?window:null);
