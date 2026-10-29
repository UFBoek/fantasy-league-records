const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {sundayNoonEastern,expectedWeeklyMean,firstSunday}
  =require('../playoff-weekly-odds-v206.js');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');

assert.equal(firstSunday(2026).toISOString().slice(0,10),'2026-09-13');
assert.equal(firstSunday(2025).toISOString().slice(0,10),'2025-09-07');
const view=(when,week=8,year=2026)=>sundayNoonEastern({year,week,now:when});
assert.equal(view('2026-10-29T23:00:00Z'),false,'Thursday night is still pre-Sunday');
assert.equal(view('2026-11-01T16:59:00Z'),false,
 'before 12pm Eastern Sunday in daylight saving transition week');
assert.equal(view('2026-11-01T17:00:00Z'),true,
 '12pm EST Sunday is the exact live-presentation cutoff after DST fall back');
assert.equal(view('2026-11-01T19:00:00Z'),true);
assert.equal(view('2026-11-02T19:00:00Z'),true,
 'Monday remains expected-only until next week starts');
assert.equal(view('2026-10-25T15:59:00Z',7),false,'Week 7 11:59am EDT still preweek');
assert.equal(view('2026-10-25T16:00:00Z',7),true,'Week 7 12pm EDT flips');
assert.equal(view('2026-11-01T17:00:00Z',9),false,
 'next NFL week must not switch to live a week early');
assert.equal(view('2025-09-07T16:00:00Z',1,2025),true);
assert.equal(view('2026-10-20T12:00:00Z',19),false,'invalid week is not live');

assert.equal(expectedWeeklyMean({expected:235,simulated:210,baseline:190}),235,
 'expected starters take priority over simulated historical PPG');
assert.equal(expectedWeeklyMean({expected:0,simulated:210,baseline:190}),0,
 'finished zero points must not be replaced with historical projection');
assert.equal(expectedWeeklyMean({expected:null,simulated:210,baseline:190}),210,
 'missing or incomplete lineup uses simulated estimate first');
assert.equal(expectedWeeklyMean({expected:undefined,simulated:undefined,baseline:190}),190,
 'historic baseline is retained when all lineup data is missing');
assert.equal(expectedWeeklyMean({expected:NaN,simulated:205,baseline:190}),205);
assert.equal(expectedWeeklyMean({expected:null,simulated:null,baseline:null}),null);

const calc=read('playoff-calculator-v167.js'),html=read('index.html'),sw=read('sw.js'),
  css=read('playoff-calculator-v167.css');
assert.match(calc,/s\.weekExpected=result\.starterTotal/,
 'expected final scores are saved separately from pregame historical preview mean');
assert.match(calc,/s\.weekMean=forecast\?forecast\.mean:pregameMean/,
 'the historical preview mean is retained for pre-Sunday comparisons only');
assert.match(calc,/var aMean=weeklyScoringMean\(g\.a,g\.week\)/,
 'the Monte Carlo uses the expected means for the current week');
assert.match(calc,/var bMean=weeklyScoringMean\(g\.b,g\.week\)/);
assert.match(calc,/var aMean=weeklyScoringMean\(a,week\),bMean=weeklyScoringMean\(b,week\)/,
 'the H2H comparison uses exactly the same expected mean');
assert.match(calc,/aMean:aMean,bMean:bMean/,
 'earned-score-bounded live win probabilities use expected starter scoring');
assert.match(calc,/if\(week!==firstWeek\)return s\.mean/,
 'future weeks continue to use the 65-35 team historical model');
assert.match(calc,/weekExpected\+'\/'\+s\.weekMean\+'\/'\+s\.weekSd/,
 'changes to expected players bust cached 8,000-simulation odds');
assert.match(calc,/return weeklyScoringMean\(id,firstWeek\)/,
 'provisional PF column is consistent with expected-score-based weekly odds');
assert.match(calc,/var pregame=showPregameComparisons\(\)/);
assert.match(calc,/pregame\?' pcl-model-pregame'/,
 'historical preview cards switch based on Sunday noon flag');
assert.match(calc,/\(pregame\?\s*'<span class="pcl-model-score-card"><small>SIMULATED WEEK /,
 'simulated preview card only appears before noon');
assert.match(calc,/'<span class="pcl-model-score-card"><small>USUAL LINEUP</,
 'usual lineup preview card also appears only before noon');
assert.doesNotMatch(calc,/HOW THE NUMBERS CONNECT/,
 'verbose model explanation has been removed without changing pregame controls');
assert.match(calc,/pcl-model-score-card pcl-model-score-primary"><small>EXPECTED STARTER TOTAL/,
 'the expected total remains visible and primary all week');
assert.match(calc,/s\.weekSd=forecast\?forecast\.sd:s\.sd/,
 'weekly scoring uncertainty still decreases as playing time resolves');
assert.match(calc,/window\.figPlayoffScoreBounds\.winChance/,
 'already-scored points are still protected from impossible negative draws');
assert.match(css,/pcl-model-live-only/,'one-card view is styled for Sunday and later');
assert.match(css,/pcl-model-pregame/,'three-card pregame context is responsive');
assert.ok(html.indexOf('playoff-weekly-odds-v206.js')<html.indexOf('playoff-calculator-v167.js'));
assert.match(sw,/playoff-weekly-odds-v206\.js\?v=206/);
assert.match(sw,/fig-league-shell-v\d+/,'service worker has a versioned cache');
console.log('Week 8 expected-only odds and Sunday-noon matchup display checks passed');
