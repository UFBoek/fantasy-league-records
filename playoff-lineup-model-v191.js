/* Current-week only: estimate a starter-change adjustment from finalized FIG league scoring. */
(function(global) {
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const positionMax={QB:52,RB:40,WR:40,TE:38};
  const defaultPosition={QB:24,RB:12,WR:13,TE:11};

  function calculate({year,week,matchups,playerLog,currentRoster}) {
    const rows=Array.isArray(matchups)?matchups:[];
    const targetYear=Number(year), targetWeek=Number(week);
    if(!Number.isInteger(targetYear)||!Number.isInteger(targetWeek)||targetWeek<2||rows.length!==10||!Array.isArray(playerLog))return {};
    const positions={}, performances=new Map(), positionTotals={};
    (Array.isArray(currentRoster)?currentRoster:[]).forEach(row=>{
      if(Number(row.season)===targetYear&&row.player_id&&row.position)positions[String(row.player_id)]=String(row.position).toUpperCase();
    });
    const previousByTeam=new Map();
    for(const row of playerLog) {
      const season=Number(row.season), w=Number(row.week), team=Number(row.franchise_id), id=String(row.player_id??'');
      if(row.game_type!=='Regular Season'||!id||id==='0'||!Number.isFinite(w)||
        !Number.isInteger(team)||team<1||team>10||
        !(season===targetYear&&w>=1&&w<targetWeek||season===targetYear-1&&w>=1&&w<=14))continue;
      const points=Number(row.starter_points);
      if(!Number.isFinite(points))continue;
      const pos=String(row.position||'').toUpperCase();
      if(pos&&!positions[id])positions[id]=pos;
      if(!performances.has(id))performances.set(id,{current:[],prior:[]});
      performances.get(id)[season===targetYear?'current':'prior'].push({week:w,points});
      if(season===targetYear) {
        if(!positionTotals[pos])positionTotals[pos]={sum:0,count:0};
        positionTotals[pos].sum+=points;positionTotals[pos].count++;
        if(!previousByTeam.has(team))previousByTeam.set(team,new Map());
        const weekly=previousByTeam.get(team);
        if(!weekly.has(w))weekly.set(w,[]);
        weekly.get(w).push(id);
      }
    }
    const positionAverage={};
    for(const pos of Object.keys(defaultPosition)) {
      const data=positionTotals[pos];
      positionAverage[pos]=data&&data.count>=12?clamp(data.sum/data.count,4,35):defaultPosition[pos];
    }
    const projected=new Map();
    function rate(id) {
      if(projected.has(id))return projected.get(id);
      const p=performances.get(id)||{current:[],prior:[]};
      const pos=positions[id]||'WR';
      const baseline=positionAverage[pos]||defaultPosition[pos]||12;
      const current=p.current.sort((a,b)=>b.week-a.week).slice(0,8);
      const previous=p.prior.sort((a,b)=>b.week-a.week).slice(0,6);
      // Previous-season starts are weak priors; two positional pseudo-starts
      // prevent one unusually high performance from dominating the forecast.
      const priorWeight=.45, pseudoStarts=2;
      const score=current.reduce((s,x)=>s+x.points,0)+
        previous.reduce((s,x)=>s+priorWeight*x.points,0)+pseudoStarts*baseline;
      const count=current.length+priorWeight*previous.length+pseudoStarts;
      const estimate=clamp(score/count,0,positionMax[pos]||40);
      projected.set(id,estimate);
      return estimate;
    }
    const adjusted={};
    const used=new Set();
    for(const row of rows) {
      const team=Number(row.roster_id);
      const ids=Array.isArray(row.starters)?row.starters.map(String):[];
      if(!Number.isInteger(team)||team<1||team>10||used.has(team)||
        ids.length!==10||new Set(ids).size!==10||ids.some(id=>!id||id==='0'||id==='null'))return {};
      used.add(team);
      const weeks=previousByTeam.get(team);
      if(!weeks)continue;
      const past=[...weeks.entries()]
        .filter(([w,starting])=>w<targetWeek&&starting.length===10&&new Set(starting).size===10)
        .sort((a,b)=>b[0]-a[0]).slice(0,3);
      if(past.length<2)continue;
      const currentValue=ids.reduce((s,id)=>s+rate(id),0);
      const typical=past.reduce((s,[,starting])=>s+starting.reduce((sum,id)=>sum+rate(id),0),0)/past.length;
      // Compare against this team's OWN recent starters, not league PPG:
      // prevents giving elite teams a second bonus for already being elite.
      const delta=clamp(.7*(currentValue-typical),-30,30);
      adjusted[team]={delta,starterTotal:currentValue,typicalTotal:typical,historyWeeks:past.length};
    }
    return used.size===10?adjusted:{};
  }
  const api={calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(global)global.figPlayoffLineupModel=api;
})(typeof window!=='undefined'?window:null);
