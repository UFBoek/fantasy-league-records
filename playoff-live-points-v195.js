/* Live projections: earned fantasy points + expected scoring for remaining NFL time.
   A kickoff zero is not a full-game zero. Final games use exact Sleeper points.
   Game-clock outages retain the full pregame projection rather than deleting it.
   No in-progress results are ever entered into official historical records. */
(function(global) {
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const norm=team=>{
    const key=String(team||'').toUpperCase().trim();
    return ({WAS:'WSH',JAC:'JAX',LA:'LAR',STL:'LAR',OAK:'LV',SD:'LAC'})[key]||key;
  };
  const finite=value=>{
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  };
  function clockSeconds(status) {
    const numeric=finite(status&&status.clock);
    if(numeric!==null)return clamp(numeric,0,900);
    const match=String(status&&status.displayClock||'').match(/^(\d+):(\d{2})$/);
    if(!match)return null;
    return clamp(Number(match[1])*60+Number(match[2]),0,900);
  }
  function teamGameStates(scoreboard) {
    const statuses={};
    for(const event of (Array.isArray(scoreboard&&scoreboard.events)?scoreboard.events:[])) {
      const game=Array.isArray(event.competitions)?event.competitions[0]:null;
      const status=(game&&game.status)||(event.status)||{};
      const type=status.type||{};
      const state=String(type.state||'').toLowerCase();
      const completed=type.completed===true||state==='post';
      const started=completed||state==='in';
      const phase=completed?'FINAL':started?'LIVE':'PRE';
      // Regulation quarters are 15 minutes. Do not infer a played percentage
      // from a missing clock, because treating an unknown clock as 0 remaining
      // can severely under-project all starters immediately after kickoff.
      let progress=phase==='FINAL'?1:phase==='PRE'?0:null;
      if(phase==='LIVE') {
        const period=finite(status.period);
        const remaining=clockSeconds(status);
        if(period!==null&&period>=5)progress=1; // overtime, regulation elapsed
        else if(period!==null&&period>=1&&period<=4&&remaining!==null)
          progress=clamp(((period-1)*900+(900-remaining))/3600,0,1);
      }
      const teams=game&&Array.isArray(game.competitors)?game.competitors:[];
      for(const competitor of teams) {
        const abbreviation=norm(competitor.team&&competitor.team.abbreviation);
        if(abbreviation)statuses[abbreviation]={phase,progress};
      }
    }
    return statuses;
  }
  function startedTeams(scoreboard) {
    const results={};
    for(const [team,status] of Object.entries(teamGameStates(scoreboard)))
      results[team]=status.phase;
    return results;
  }
  // The only calculation for a starter's in-progress expected final total.
  // Shared by the simulation and the visible per-player detail breakdown.
  function projectedContribution(pregame, live) {
    const baseline=finite(pregame);
    const points=live&&finite(live.points);
    if(points===null||!live)return baseline;
    const phase=live.phase;
    if(phase==='FINAL')return points;
    const progress=finite(live.progress);
    if(phase!=='LIVE'||progress===null) {
      // An NFL clock outage is not evidence that the player has finished.
      return baseline;
    }
    if(baseline===null)return progress>=1?points:null;
    return points + baseline*(1-clamp(progress,0,1));
  }
  function getLiveOverrides({matchups,roster,scoreboard,season}) {
    const states=teamGameStates(scoreboard),teams={};
    for(const p of (Array.isArray(roster)?roster:[])) {
      if(+p.season!==+season||!p.player_id)continue;
      teams[String(p.player_id)]=norm(p.current_nfl_team||p.nfl_team);
    }
    const result={};
    for(const row of (Array.isArray(matchups)?matchups:[])) {
      const starters=Array.isArray(row.starters)?row.starters:[];
      const points=row.players_points&&typeof row.players_points==='object'?row.players_points:{};
      const positional=Array.isArray(row.starters_points)?row.starters_points:[];
      for(let i=0;i<starters.length;i++) {
        const id=String(starters[i]||'');
        if(!id||id==='0')continue;
        const raw=Object.prototype.hasOwnProperty.call(points,id)?points[id]:positional[i];
        const scored=finite(raw);
        if(scored===null)continue;
        const status=states[teams[id]];
        // Nonzero Sleeper points imply live play even when ESPN's status lags,
        // but without a clock we must retain the pregame expected total.
        if((!status||status.phase==='PRE')&&scored===0)continue;
        const phase=status&&status.phase!=='PRE'?status.phase:'LIVE';
        result[id]={points:scored,phase,progress:status&&status.phase!=='PRE'?status.progress:null};
      }
    }
    return result;
  }
  const api={startedTeams,teamGameStates,getLiveOverrides,projectedContribution};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(global)global.figPlayoffLivePoints=api;
})(typeof window!=='undefined'?window:null);
