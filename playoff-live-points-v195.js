/* Current NFL game status + live Sleeper fantasy points for starting players.
   Only replace a player's projection after his NFL game is underway/final.
   Never use partial-game points to rewrite verified historical records. */
(function(global) {
  'use strict';
  const norm=team=>{
    const key=String(team||'').toUpperCase().trim();
    return ({WAS:'WSH',WSH:'WSH',JAC:'JAX',JAX:'JAX',LA:'LAR',STL:'LAR',
      LAR:'LAR',OAK:'LV',LV:'LV',SD:'LAC',LAC:'LAC'})[key]||key;
  };
  function startedTeams(scoreboard) {
    const statuses={};
    for(const event of (Array.isArray(scoreboard&&scoreboard.events)?scoreboard.events:[])) {
      const game=Array.isArray(event.competitions)?event.competitions[0]:null;
      const type=(game&&game.status&&game.status.type)||(event.status&&event.status.type)||{};
      const state=String(type.state||'').toLowerCase();
      const completed=type.completed===true||state==='post';
      const started=completed||state==='in';
      const phase=completed?'FINAL':started?'LIVE':'PRE';
      const teams=game&&Array.isArray(game.competitors)?game.competitors:[];
      for(const competitor of teams) {
        const abbreviation=norm(competitor.team&&competitor.team.abbreviation);
        if(abbreviation)statuses[abbreviation]=phase;
      }
    }
    return statuses;
  }
  function getLiveOverrides({matchups,roster,scoreboard,season}) {
    const states=startedTeams(scoreboard),teams={};
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
        const value=Object.prototype.hasOwnProperty.call(points,id)?points[id]:positional[i];
        if(value===null||value===undefined||value==='')continue;
        const scored=Number(value);
        if(!Number.isFinite(scored))continue;
        const state=states[teams[id]];
        // Non-zero points themselves prove a player has begun scoring, even
        // when NFL status is briefly delayed or the player-team map is stale.
        if(state!=='LIVE'&&state!=='FINAL'&&scored===0)continue;
        result[id]={points:scored,phase:state==='FINAL'?'FINAL':'LIVE'};
      }
    }
    return result;
  }
  const api={startedTeams,getLiveOverrides};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(global)global.figPlayoffLivePoints=api;
})(typeof window!=='undefined'?window:null);
