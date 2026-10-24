const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate}=require('../playoff-lineup-model-v191.js');

function fixture() {
  const playerLog=[],currentRoster=[],matchups=[];
  for(let team=1;team<=10;team++) {
    const starters=[];
    for(let slot=0;slot<10;slot++) {
      const id=team+'-'+slot;
      const position=slot===0?'QB':slot===1?'TE':'WR';
      starters.push(id);
      currentRoster.push({season:2026,franchise_id:team,player_id:id,position,is_starter:true});
      for(let week=1;week<=3;week++) {
        playerLog.push({season:'2026',week,game_type:'Regular Season',franchise_id:team,player_id:id,position,starter_points:slot===0?36:12});
      }
    }
    matchups.push({roster_id:team,starters});
  }
  // Long-term low-scoring replacement QB has prior-season data but was
  // on the bench in 2026. The comparison is to this team's own prior starters.
  for(let week=1;week<=6;week++) {
    playerLog.push({season:'2025',week,game_type:'Regular Season',franchise_id:1,player_id:'replacement-qb',position:'QB',starter_points:2});
  }
  currentRoster.push({season:2026,player_id:'replacement-qb',position:'QB',is_starter:false});
  return {year:2026,week:4,matchups,playerLog,currentRoster};
}

const same=fixture();
const unchanged=calculate(same);
assert.equal(Object.keys(unchanged).length,10);
for(let team=1;team<=10;team++)assert.ok(Math.abs(unchanged[team].delta)<1e-8,
  'unchanged starting group should have zero delta');

const replaced=fixture();
replaced.matchups[0].starters[0]='replacement-qb';
const different=calculate(replaced);
assert.ok(different[1].delta< -5,'bench replacement QB should lower this week\'s forecast');
assert.ok(different[1].delta>=-30,'adjustments must be capped');
assert.ok(Math.abs(different[2].delta)<1e-8,'other franchises should not change');
assert.equal(different[1].historyWeeks,3);
assert.equal(calculate({...replaced,week:1}).constructor,Object);

const incomplete=fixture();
incomplete.matchups[0].starters.pop();
assert.deepEqual(calculate(incomplete),{},'incomplete live lineup must fall back to season model');
assert.deepEqual(calculate({...same,matchups:same.matchups.slice(1)}),{});

const source=fs.readFileSync(path.resolve(__dirname,'../playoff-calculator-v167.js'),'utf8');
assert.match(source,/g\.week===firstWeek&&Number\.isFinite\(a\.weekMean\)/);
assert.match(source,/week===firstWeek&&Number\.isFinite\(ax\.weekMean\)/);
assert.match(source,/activeSleeperWeek!==firstWeek/);
assert.match(source,/lineupActive\?' · W'/);
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
assert.ok(html.indexOf('playoff-lineup-model-v191.js')<html.indexOf('playoff-calculator-v167.js'),
  'lineup estimator must be loaded before the playoff calculator');
console.log('Starter-adjusted current-week simulation tests passed');
