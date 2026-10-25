const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate}=require('../playoff-lineup-model-v191.js');
const {startedTeams,teamGameStates,getLiveOverrides,projectedContribution}
  =require('../playoff-live-points-v195.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

const game=(teams,state,period,clock,extra={})=>({
  competitions:[{
    status:{type:{state,completed:state==='post'},period,
      displayClock:clock,...extra},
    competitors:teams.map(abbreviation=>({team:{abbreviation}}))
  }]
});
const games={events:[
 game(['PHI','DAL'],'pre',0,'15:00'),
 game(['WAS','NYG'],'in',1,'15:00'),
 game(['KC','DEN'],'in',2,'00:00'),
 game(['LAR','SF'],'post',4,'0:00'),
 game(['GB','CHI'],'in',3,'12:00'),
 game(['LV','SEA'],'in',1,'12:00',{clock:0})
]};
const phases=startedTeams(games),status=teamGameStates(games);
assert.equal(phases.PHI,'PRE');
assert.equal(phases.WSH,'LIVE');
assert.equal(phases.LAR,'FINAL');
assert.equal(status.WSH.progress,0,'at kickoff zero regulation time has elapsed');
assert.equal(status.KC.progress,.5,'at halftime exactly half the game remains');
assert.equal(status.LAR.progress,1,'final is actual only');
assert.ok(Math.abs(status.GB.progress-.55)<1e-9,'3Q 12m = 55% played');
assert.ok(Math.abs(status.LV.progress-.05)<1e-9,
  'prefer display clock when the alternate numeric field is stale');

const roster=[
 {season:2026,player_id:'aj',current_nfl_team:'PHI'},
 {season:2026,player_id:'startedzero',current_nfl_team:'WAS'},
 {season:2026,player_id:'halftime',current_nfl_team:'KC'},
 {season:2026,player_id:'finished',current_nfl_team:'LA'},
 {season:2026,player_id:'unknown',current_nfl_team:null}
];
const matchups=[{roster_id:1,starters:['aj','startedzero','halftime','finished','unknown'],
 players_points:{aj:0,startedzero:0,halftime:6,finished:11.5,unknown:7.5}}];
const actual=getLiveOverrides({matchups,roster,scoreboard:games,season:2026});
assert.equal(actual.aj,undefined,'before kickoff zero must not count as actual');
assert.deepEqual(actual.startedzero,{points:0,phase:'LIVE',progress:0});
assert.deepEqual(actual.halftime,{points:6,phase:'LIVE',progress:.5});
assert.deepEqual(actual.finished,{points:11.5,phase:'FINAL',progress:1});
assert.deepEqual(actual.unknown,{points:7.5,phase:'LIVE',progress:null},
  'nonzero score without known clock must not be treated as finished game');
assert.deepEqual(getLiveOverrides({matchups,roster,scoreboard:null,season:2026}).startedzero,undefined,
  'unknown kickoff status cannot overwrite baseline with zero');

assert.equal(projectedContribution(20,undefined),20,'pregame full projection');
assert.equal(projectedContribution(20,actual.startedzero),20,'kickoff zero remains 20');
assert.equal(projectedContribution(20,actual.halftime),16,'6 scored plus half of 20');
assert.equal(projectedContribution(20,actual.finished),11.5,'final equals actual score');
assert.equal(projectedContribution(20,actual.unknown),20,'no game clock means no forecast penalty');
assert.equal(projectedContribution(null,actual.finished),11.5,'final actual works for unknown player');
assert.equal(projectedContribution(null,actual.startedzero),null,
  'missing pregame model is not invented as 0');
assert.equal(projectedContribution(20,{points:-2,phase:'LIVE',progress:.5}),8,
  'genuine negative points remain valid');

const score={season:2026,through_week:6,players:{},previous_lineups:{}},rows=[];
for(let tid=1;tid<=10;tid++){
  const ids=Array.from({length:10},(_,i)=>tid+'-'+i);
  ids.forEach(id=>score.players[id]={projection:20,games:5});
  score.previous_lineups[String(tid)]=[ids,ids,ids];
  rows.push({roster_id:tid,starters:ids});
}
const normal=calculate({year:2026,week:7,matchups:rows,playerScores:score});
assert.equal(normal[1].delta,0);

const nineKickoff={};
for(let i=0;i<9;i++) {
  const live={points:0,phase:'LIVE',progress:0};
  nineKickoff['1-'+i]={...live,expected:projectedContribution(20,live)};
}
let result=calculate({year:2026,week:7,matchups:rows,playerScores:score,liveOverrides:nineKickoff});
assert.equal(result[1].starterTotal,200,'nine kickoff zeros do not erase 180 projected points');
assert.equal(result[1].delta,0,'nine players starting is not an immediate penalty');
assert.equal(result[1].liveActualCount,9);
assert.equal(result[1].liveActualSum,0);
assert.equal(result[2].delta,0);

const mixed={
 '1-0':{...actual.startedzero,expected:projectedContribution(20,actual.startedzero)},
 '1-1':{...actual.halftime,expected:projectedContribution(20,actual.halftime)},
 '1-2':{...actual.finished,expected:projectedContribution(20,actual.finished)}
};
result=calculate({year:2026,week:7,matchups:rows,playerScores:score,liveOverrides:mixed});
assert.equal(result[1].starterTotal,187.5,'20 kickoff +16 halftime+11.5 final+seven projected');
assert.ok(Math.abs(result[1].delta+8.75)<1e-9,
  'lineup adjustment uses the very same remaining-time forecasts as UI');
assert.equal(result[1].typicalTotal,200,'prior lineup strength stays historical');
assert.equal(result[1].liveActualCount,3);
assert.equal(result[1].liveActualSum,17.5);
const clockUnavailable={
 '1-0':{points:0,phase:'LIVE',progress:null},
 '1-1':{points:8,phase:'LIVE',progress:null}
};
result=calculate({year:2026,week:7,matchups:rows,playerScores:score,liveOverrides:clockUnavailable});
assert.equal(result[1].starterTotal,200,
  'an unsynchronized live override must never replace full projection with raw points');

const app=read('playoff-calculator-v167.js');
assert.match(app,/liveOverrides:liveActuals/);
assert.match(app,/projectedContribution\(/,'browser must share same live-game formula');
assert.match(app,/setInterval\(pollCurrentMatchup,30000\)/);
assert.match(app,/Object\.keys\(liveActuals\|\|\{\}\)\.length/);
assert.match(app,/LIVE EST\. FINAL/,'visible projection is expected final, not just score');
assert.match(app,/SCORED/,'current points separately visible to users');
assert.match(app,/data\/playoff_player_scores\.json/);
const home=read('live-matchups.js');
assert.match(home,/#\/playoff-calculator\/matchup\//);
assert.match(home,/VIEW MODEL PROJECTIONS/);
assert.match(home,/LIVE LINEUPS/);
const index=read('index.html');
assert.ok(index.indexOf('playoff-live-points-v195.js')<index.indexOf('playoff-calculator-v167.js'));
assert.match(index,/live-matchups\.js\?v=195/);
console.log('Live projected remainder, kickoff zero and home route tests passed');
