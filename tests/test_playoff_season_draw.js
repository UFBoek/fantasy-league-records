const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {simulateSeason}=require('../playoff-season-draw-v204.js');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');

// Teams six through ten are NOT locked out just because the bracket
// initially displays the five highest average projected finishes.
const base=Array.from({length:10},(_,i)=>({id:i+1,wins:5,losses:5,ties:0,pf:1000+(10-i)}));
const games=Array.from({length:5},(_,i)=>({week:11,a:i+1,b:i+6,key:'11_'+(i+1)+'_'+(i+6)}));
const forward=simulateSeason({standings:base,games,scoreGame:g=>[125,90]});
assert.deepEqual(forward.seeds,[1,2,3,4,5],
 'winning sides claim the five playoff seeds in one run');
assert.equal(forward.standings.filter(t=>t.qualifies).length,5);
assert.equal(forward.standings.filter(t=>!t.qualifies).length,5);
assert.deepEqual(forward.standings.map(t=>t.seed),[1,2,3,4,5,null,null,null,null,null]);
assert.equal(forward.standings[0].wins,6);
assert.equal(forward.standings[0].pf,1135);
const reverse=simulateSeason({standings:base,games,scoreGame:g=>[90,145]});
assert.deepEqual(reverse.seeds,[6,7,8,9,10],
 'teams previously projected to miss can ALL make playoffs in another run');
assert.notDeepEqual(forward.seeds,reverse.seeds,'qualification changes per simulation');
assert.equal(reverse.standings[0].wins,6);
assert.equal(base[0].wins,5,'simulations must not alter official standings');
assert.equal(base[0].pf,1010,'simulations must not alter official PF');
assert.equal(reverse.games.length,5);
assert.equal(reverse.games[0].winner,6);

const pfTie=simulateSeason({
 standings:Array.from({length:10},(_,i)=>({id:i+1,wins:6,losses:4,ties:0,pf:200+i})),
 games:[],scoreGame:()=>{throw Error('should not sample any games');}
});
assert.deepEqual(pfTie.seeds,[10,9,8,7,6],
 'equal wins must be broken by full-season Points For, not team-model strength');
const ties=simulateSeason({
 standings:Array.from({length:10},(_,i)=>({id:i+1,wins:6,losses:4,ties:0,pf:200})),
 games:[{week:11,a:1,b:2}],scoreGame:()=>[13,13]
});
assert.equal(ties.standings.find(x=>x.id===1).ties,1,'simulated ties add half-wins');
assert.equal(ties.standings.find(x=>x.id===2).ties,1);
assert.equal(ties.standings[0].id,1,
 'when all records and PF are tied, use permanent team ID as existing odds model');
assert.throws(()=>simulateSeason({standings:base.slice(1),games,scoreGame:()=>[1,0]}),
 /10-team/, 'require all official participants');
assert.throws(()=>simulateSeason({standings:base,games,scoreGame:()=>[null,null]}),
 /Unusable|Invalid/, 'never accept unverified fantasy scores');

const calc=read('playoff-calculator-v167.js');
assert.match(calc,/window\.figPlayoffSeasonDraw\.simulateSeason/,
 'SIMULATE must sample full regular-season qualification, not fixed top 5');
assert.match(calc,/standings:baseRows\(\),games:allGames\(\)/,
 'season draw must begin with official W-L and Points For');
assert.match(calc,/scoreGame:function\(g\)\{return pickScores\(g,picked\[g\.key\],rng\);\}/,
 'season draw uses same manual What-If picks, future projections and current-week score bounds');
assert.match(calc,/var sim=postSeason\(finish\.seeds,rng\)/,
 'postseason starts from the freshly sampled top five');
assert.match(calc,/bracketSeason=\{seeds:finish\.seeds,standings:finish\.standings/,
 'both sampled seeds and final standings persist as one scenario');
assert.match(calc,/bracketSeason\.sourceKey!==bracketScenarioKey\(\)/,
 'stale seeds must invalidate when scenario picks change');
assert.match(calc,/simulated\?bracketSeason\.seeds/,
 'drawn bracket must show drawn seeds, not the average projected teams');
assert.match(calc,/pcl-sim-qualified/,'the five qualifiers are visually identified');
assert.match(calc,/pcl-sim-eliminated/,'five teams missing playoffs are displayed');
assert.match(calc,/bracketSeason=null;saveBracket\(\);renderPlayoffSim\(\)/,
 'reset restores original projected bracket without modifying picks');
assert.match(calc,/bracketScores\[key\]/,'postseason hand picks continue to work');
const app=read('app.js');
assert.match(app,/href="#\/playoff-calculator" class="pcl-home-link"/,
 'home keeps the Playoff Calculator shortcut');
assert.doesNotMatch(app,/href="#\/historical-predictions" class="pcl-home-link"/,
 'home removes only the Historical Predictions shortcut');
assert.match(app,/href:'#\/historical-predictions'/,
 'Historical Predictions remains available through the main menu');
assert.match(app,/parts\[0\]==='historical-predictions'/,
 'Historical Predictions route is still available');
const html=read('index.html'),sw=read('sw.js'),css=read('playoff-calculator-v167.css');
assert.ok(html.indexOf('playoff-season-draw-v204.js')<
 html.indexOf('playoff-calculator-v167.js'),'draw helper loaded ahead of calculator');
assert.match(sw,/playoff-season-draw-v204\.js\?v=204/,'PWA precaches bracket simulator');
assert.match(sw,/fig-league-shell-v205/);
assert.match(css,/pcl-sim-standings-list/,'new final-standings layout exists');
console.log('Full-season qualification, dynamic seeding, bracket preservation, and home shortcut tests passed');
