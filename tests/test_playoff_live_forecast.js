const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {estimate}=require('../playoff-live-forecast-v199.js');
const {calculate}=require('../playoff-lineup-model-v191.js');
const {projectedContribution}=require('../playoff-live-points-v195.js');
const js=fs.readFileSync(path.resolve(__dirname,'../playoff-calculator-v167.js'),'utf8');

const starters=Array.from({length:10},(_,i)=>'starter-'+i);
const players={};
starters.forEach(p=>{players[p]={projection:20,games:6};});
const baseline={pregameMean:238,baselineSD:28,starterTotal:200,starters,players};
const near=(actual,wanted,what)=>assert.ok(Math.abs(actual-wanted)<1e-8,what+': '+actual+' vs '+wanted);

let result=estimate({...baseline,live:{}});
near(result.mean,238,'pregame team PPG is still historical team model');
near(result.sd,28,'full SD is retained before kickoff');
near(result.progress,0,'no football played');

const nineKickoff={};
for(let i=0;i<9;i++){
 const v={points:0,phase:'LIVE',progress:0};
 nineKickoff[starters[i]]={...v,expected:projectedContribution(20,v)};
}
result=estimate({...baseline,live:nineKickoff,starterTotal:200});
near(result.mean,238,'nine kickoff zeros must not lower team PPG');
near(result.sd,28,'nine kickoff zeros must not shrink variance');
near(result.progress,0,'nine players at kickoff still zero game-time progress');

const halftime={};
starters.forEach(pid=>{
 const v={points:6,phase:'LIVE',progress:.5};
 halftime[pid]={...v,expected:projectedContribution(20,v)};
});
result=estimate({...baseline,live:halftime,starterTotal:160,actualSum:60});
near(result.progress,.5,'all starters at halftime yields half the season weighting');
near(result.mean,199,'blend 238 pregame and 160 expected final at half');
near(result.sd,28*Math.sqrt(.5),'SD shrinks as remaining playtime decreases');
near(result.actualSum,60,'actual points remain separately available');

const finishes={};
starters.forEach(pid=>finishes[pid]={points:18,phase:'FINAL',progress:1,expected:18});
result=estimate({...baseline,live:finishes,starterTotal:180,actualSum:180});
near(result.progress,1,'all games finished');
near(result.mean,180,'historical mean has no role after all games finish');
near(result.sd,0,'no residual scoring uncertainty after final');
near(result.actualSum,180,'all scores official from Sleeper');

const oneFinished={};
oneFinished[starters[0]]={points:30,phase:'FINAL',progress:1,expected:30};
result=estimate({...baseline,live:oneFinished,starterTotal:210});
near(result.progress,.1,'one of ten equally weighted starters resolved');
near(result.mean,.9*238+.1*210,'only one tenth transferred to live points');
near(result.sd,28*Math.sqrt(.9),'most uncertainty remains');

const missingClock={};
starters.forEach(pid=>missingClock[pid]={points:0,phase:'LIVE',progress:null,expected:20});
result=estimate({...baseline,live:missingClock});
near(result.mean,238,'missing ESPN clock leaves original projection intact');
near(result.sd,28,'clock outages do not create unwarranted certainty');

// The lineup model must retain a separate pregame delta when live games start.
const playerScores={season:2026,through_week:6,players:{},previous_lineups:{}},rows=[];
for(let team=1;team<=10;team++){
 const list=Array.from({length:10},(_,i)=>team+'-'+i);
 list.forEach(id=>playerScores.players[id]={projection:20,games:6});
 playerScores.previous_lineups[String(team)]=[list,list,list];
 rows.push({roster_id:team,starters:list});
}
const oneActual={'1-0':{points:25,phase:'FINAL',progress:1,expected:25}};
const modeled=calculate({year:2026,week:7,matchups:rows,playerScores,liveOverrides:oneActual});
near(modeled[1].pregameDelta,0,'pregame lineup adjustment remains fixed');
near(modeled[1].delta,3.5,'live starter total still available for breakdown');
near(modeled[1].pregameStarterTotal,200,'pregame total is separate from live total');
near(modeled[1].starterTotal,205,'live expected final used for current starter total');

// Win probabilities and Monte Carlo draws must BOTH use diminishing SD.
assert.match(js,/g\.week===firstWeek&&Number\.isFinite\(a\.weekSd\)\?a\.weekSd:a\.sd/);
assert.match(js,/g\.week===firstWeek&&Number\.isFinite\(b\.weekSd\)\?b\.weekSd:b\.sd/);
assert.match(js,/week===firstWeek&&Number\.isFinite\(ax\.weekSd\)\?ax\.weekSd:ax\.sd/);
assert.match(js,/week===firstWeek&&Number\.isFinite\(bx\.weekSd\)\?bx\.weekSd:bx\.sd/);
assert.match(js,/spread<1e-8\)return diff>0\?1:diff<0\?0:0\.5/,
 'if both teams final, H2H probability must be decisive');
assert.match(js,/weekMean\+'\/'\+s\.weekSd/,
 'the odds cache must invalidate if remaining SD changes even when mean stays fixed');
assert.match(js,/window\.figPlayoffLiveForecast\.estimate/);
assert.match(js,/s\.weekMean=forecast\?forecast\.mean:pregameMean/);
assert.match(js,/s\.weekSd=forecast\?forecast\.sd:s\.sd/);
assert.match(js,/\['matchup','main','team'\]\.includes\(routeMode\)/,
 'main odds and team route should receive live refresh');
assert.match(js,/renderOdds\(\);\s*renderBracket\(oddsResults\)/,
 'main odds and playoff bracket should recalculate without resetting What-If entries');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
assert.ok(html.indexOf('playoff-live-forecast-v199.js')<
  html.indexOf('playoff-calculator-v167.js'),'pure live forecast must load before calculator');
console.log('Live matchup convergence, decreasing uncertainty, final probabilities and simulations passed');
