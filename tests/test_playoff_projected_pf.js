/* Regression: current-week estimated PF is a DISPLAY layer, not extra simulation PF. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {liveWeekUnderway,projectedPointsFor}=require('../playoff-pf-view-v201.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

const args={lineupActive:true,activeWeek:7,verifiedNextWeek:7,liveActuals:{}};
assert.equal(liveWeekUnderway(args),false,'pregame keeps official PF even with active lineups');
assert.equal(liveWeekUnderway({...args,liveActuals:{a:{phase:'LIVE',points:0}}}),true,
  'a starter kicking off at 0 starts the provisional PF display');
assert.equal(liveWeekUnderway({...args,liveActuals:{a:{phase:'FINAL',points:12}}}),true,
  'NFL game final before fantasy week finalization still counts');
assert.equal(liveWeekUnderway({...args,lineupActive:false,liveActuals:{a:{phase:'LIVE'}}}),false,
  'missing projection coverage does not fabricate projected PF');
assert.equal(liveWeekUnderway({...args,activeWeek:8,liveActuals:{a:{phase:'LIVE'}}}),false,
  'never carry an older week estimate into the newly finalized standings');
assert.equal(liveWeekUnderway({...args,verifiedNextWeek:8,liveActuals:{a:{phase:'LIVE'}}}),false,
  'official current week must match verified next week');
assert.equal(liveWeekUnderway({...args,liveActuals:{a:{phase:'PRE',points:0}}}),false,
  'pregame zero should not start live PF');

const before=projectedPointsFor(1418.4,239.94,false);
assert.deepEqual(before,{official:1418.4,total:1418.4,projected:0,includesCurrentWeek:false});
const after=projectedPointsFor(1418.4,239.94,true);
assert.ok(Math.abs(after.total-1658.34)<1e-9,'estimated PF = final W1-6 PF + forecast W7');
assert.equal(after.projected,239.94);
assert.equal(after.official,1418.4,'official PF source must remain untouched');
assert.ok(Math.abs(projectedPointsFor(1658.34,210,false).total-1658.34)<1e-9,
  'once Sleeper finalizes W7, W7 projection is dropped rather than counted again');
assert.equal(projectedPointsFor(100,null,true).total,100,
  'missing current-week forecast keeps official PF');
assert.equal(projectedPointsFor(100,0,true).total,100,'verified zero projection allowed');
assert.equal(projectedPointsFor(NaN,150,true),null,'invalid official PF remains unavailable');

const source=read('playoff-calculator-v167.js');
assert.match(source,/window\.figPlayoffPFView\.liveWeekUnderway/,'view checks a started NFL game');
assert.match(source,/window\.figPlayoffPFView\.projectedPointsFor\(t\.pf,estimate,livePF\)/,
  'display adds current week forecast to official PF');
assert.match(source,/currentWeekProjectedPF\(r\.id\)/,'each franchise uses its current model PPG');
assert.match(source,/return weeklyScoringMean\(id,firstWeek\)/,
  'model baseline is used only when a current lineups forecast is unavailable');
assert.match(source,/Number\.isFinite\(\+a\)&&Number\.isFinite\(\+b\)/,
  'manual what-if scores can override week PF same as simulations');
assert.match(source,/livePF\?'PROJ PF':'PF'/,'column label marks provisional, not official');
assert.match(source,/Official records unchanged/,'table explicitly distinguishes projections');
assert.match(source,/function baseRows\(\)\{\s*return standings\.map\(function\(t\)\{return \{id:t\.id,wins:t\.wins,losses:t\.losses,ties:t\.ties,pf:t\.pf\};\}\);/,
  'Monte Carlo always begins from the official PF alone');
assert.match(source,/a\.pf\+=pts\[0\];b\.pf\+=pts\[1\];/,
  'the current week is added to playoff PF once inside the existing games loop');
assert.doesNotMatch(source,/t\.pf\s*\+=\s*currentWeekProjectedPF/,
  'projections must never mutate official standings');
const html=read('index.html'),sw=read('sw.js');
assert.ok(html.indexOf('playoff-pf-view-v201.js')<html.indexOf('playoff-calculator-v167.js'),
  'view helper must load before the calculator');
assert.match(html,/playoff-calculator-v167\.js\?v=205/);
assert.match(sw,/fig-league-shell-v205/);
assert.match(sw,/playoff-pf-view-v201\.js\?v=201/);
console.log('Live PF projection, no-double-count, finalized week and tiebreaker tests passed');
