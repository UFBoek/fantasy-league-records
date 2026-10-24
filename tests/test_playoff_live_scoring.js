const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate}=require('../playoff-lineup-model-v191.js');
const {startedTeams,getLiveOverrides}=require('../playoff-live-points-v195.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

const games={events:[
 {competitions:[{status:{type:{state:'pre',completed:false}},competitors:[{team:{abbreviation:'PHI'}},{team:{abbreviation:'DAL'}}]}]},
 {competitions:[{status:{type:{state:'in',completed:false}},competitors:[{team:{abbreviation:'WAS'}},{team:{abbreviation:'NYG'}}]}]},
 {competitions:[{status:{type:{state:'post',completed:true}},competitors:[{team:{abbreviation:'LAR'}},{team:{abbreviation:'SF'}}]}]}
]};
const state=startedTeams(games);
assert.equal(state.PHI,'PRE');
assert.equal(state.WSH,'LIVE');
assert.equal(state.LAR,'FINAL');
const roster=[
 {season:2026,player_id:'aj',current_nfl_team:'PHI'},
 {season:2026,player_id:'startedzero',current_nfl_team:'WAS'},
 {season:2026,player_id:'finished',current_nfl_team:'LA'},
 {season:2026,player_id:'unknown',current_nfl_team:null},
];
const matchups=[{roster_id:1,starters:['aj','startedzero','finished','unknown'],
 players_points:{aj:0,startedzero:0,finished:11.5,unknown:7.5}}];
let actual=getLiveOverrides({matchups,roster,scoreboard:games,season:2026});
assert.equal(actual.aj,undefined,'do not turn pre-kickoff DNP-like zeros into live 0');
assert.deepEqual(actual.startedzero,{points:0,phase:'LIVE'},'game started with 0 must be actual 0');
assert.deepEqual(actual.finished,{points:11.5,phase:'FINAL'});
assert.deepEqual(actual.unknown,{points:7.5,phase:'LIVE'},'nonzero NFL points prove actual play');
assert.deepEqual(getLiveOverrides({matchups,roster,scoreboard:null,season:2026}).startedzero,undefined,
 'unknown kickoff status must not incorrectly replace projection with zero');
const score={season:2026,through_week:6,players:{},previous_lineups:{}},rows=[];
for(let tid=1;tid<=10;tid++){
 const ids=Array.from({length:10},(_,i)=>tid+'-'+i);
 ids.forEach(id=>score.players[id]={projection:20,games:5});
 score.previous_lineups[String(tid)]=[ids,ids,ids];
 rows.push({roster_id:tid,starters:ids});
}
let normal=calculate({year:2026,week:7,matchups:rows,playerScores:score});
assert.equal(normal[1].delta,0);
const current={'1-0':{points:0,phase:'LIVE'},'1-1':{points:35,phase:'FINAL'}};
let live=calculate({year:2026,week:7,matchups:rows,playerScores:score,liveOverrides:current});
assert.equal(live[1].starterTotal,195);
assert.equal(live[1].typicalTotal,200,'historical lineup should not be rewritten with in-progress points');
assert.ok(Math.abs(live[1].delta+3.5)<1e-6,'model must use the same mixed actual/forecast points displayed');
assert.equal(live[1].liveActualCount,2);
assert.equal(live[1].liveActualSum,35);
assert.equal(live[2].delta,0,'other team unaffected');
const app=read('playoff-calculator-v167.js');
assert.match(app,/liveOverrides:liveActuals/);
assert.match(app,/setInterval\(pollCurrentMatchup,30000\)/);
assert.match(app,/Object\.keys\(liveActuals\|\|\{\}\)\.length/);
assert.match(app,/ACTUAL.*phase/);
assert.match(app,/data\/playoff_player_scores\.json/);
const home=read('live-matchups.js');
assert.match(home,/#\/playoff-calculator\/matchup\//);
assert.match(home,/VIEW MODEL PROJECTIONS/);
assert.match(home,/LIVE LINEUPS/);
const index=read('index.html');
assert.ok(index.indexOf('playoff-live-points-v195.js')<index.indexOf('playoff-calculator-v167.js'));
assert.match(index,/live-matchups\.js\?v=195/);
console.log('DNP aware live starter model and home matchup routing tests passed');
