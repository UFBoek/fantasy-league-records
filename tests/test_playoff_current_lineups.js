const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate}=require('../playoff-lineup-model-v191.js');

function fixture() {
  const playerScores={season:2026,through_week:6,players:{},previous_lineups:{}},matchups=[];
  for(let team=1;team<=10;team++) {
    const starting=[];
    for(let slot=0;slot<10;slot++) {
      const id=team+'-'+slot;
      starting.push(id);
      playerScores.players[id]={projection:slot===0?28:12,games:8};
    }
    playerScores.previous_lineups[String(team)]=[starting.slice(),starting.slice(),starting.slice()];
    matchups.push({roster_id:team,starters:starting.slice()});
  }
  playerScores.players['replacement-qb']={projection:8,games:8};
  return {year:2026,week:7,matchups,playerScores};
}

const unchanged=calculate(fixture());
assert.equal(Object.keys(unchanged).length,10);
for(let team=1;team<=10;team++) {
  assert.equal(unchanged[team].delta,0,'same lineup should have no adjustment');
  assert.equal(unchanged[team].available,true);
}

const changed=fixture();
changed.matchups[0].starters[0]='replacement-qb';
const adjusted=calculate(changed);
assert.ok(Math.abs(adjusted[1].delta-(-14))<0.000001,'QB replacement should change Week 7 PPG');
assert.equal(adjusted[2].delta,0,'untouched roster should remain unchanged');
assert.equal(adjusted[1].historyWeeks,3);

const unknown=fixture();
unknown.matchups[0].starters[0]='rookie-with-no-games';
const uncertain=calculate(unknown);
assert.equal(uncertain[1].delta,0,'unknown player should not be treated as zero PPG');
assert.equal(uncertain[1].available,false);
assert.equal(uncertain[2].available,true,'other teams still get valid adjustments');

const invalid=fixture();
invalid.matchups[0].starters.pop();
assert.deepEqual(calculate(invalid),{},'incomplete Sleeper lineups fall back');
assert.deepEqual(calculate({...fixture(),week:8}),{},'stale week snapshot must be rejected');
assert.deepEqual(calculate({...fixture(),matchups:fixture().matchups.slice(1)}),{});

const source=fs.readFileSync(path.resolve(__dirname,'../playoff-calculator-v167.js'),'utf8');
assert.match(source,/g\.week===firstWeek&&Number\.isFinite\(a\.weekMean\)/);
assert.match(source,/week===firstWeek&&Number\.isFinite\(ax\.weekMean\)/);
assert.match(source,/activeSleeperWeek!==firstWeek/);
assert.match(source,/data\/playoff_player_scores\.json/);
assert.match(source,/lineupSource='ROSTER SNAPSHOT'/,'confirmed Sleeper roster snapshot can be used if live matchup request fails');
assert.match(source,/LINEUPS /,'current-week lineup availability is visible');
assert.match(source,/LINEUP-ADJUSTED/,'week-specific matchup odds should be labeled');
assert.match(source,/NOT APPLIED/,'team page must disclose fallback for missing lineup projections');
assert.doesNotMatch(source,/await load\(\['playerLog','currentRoster'\]\)/);
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
assert.ok(html.indexOf('playoff-lineup-model-v191.js')<html.indexOf('playoff-calculator-v167.js'),
  'player model must load before playoff calculator');
console.log('70/30 starter-informed playoff simulation tests passed');
