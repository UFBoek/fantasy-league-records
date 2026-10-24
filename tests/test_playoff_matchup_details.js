/* Current-week starter matchup inspection must show exact forecast inputs. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const calc=file('playoff-calculator-v167.js');
const css=file('playoff-calculator-v167.css');
const html=file('index.html');
const sw=file('sw.js');
const scores=JSON.parse(file('data/playoff_player_scores.json'));
const rosters=JSON.parse(file('data/current_roster.json'));
const settings=JSON.parse(file('data/league_settings.json'));
const {calculate}=require('../playoff-lineup-model-v191.js');

assert.match(calc,/function renderMatchupRoute\(\)/,'dedicated drilldown renderer exists');
assert.match(calc,/routeType==='matchup'\?'matchup'/,'deep-link routes into inspection');
assert.match(calc,/routeMode==='matchup'\)\{renderMatchupRoute\(\);return;\}/,'route renders its dedicated page');
assert.match(calc,/allGames\(\)\.find\(function\(g\)\{return g\.week===firstWeek&&g\.key===selectedMatchupKey;/,
 'old or invalid weeks are not treated as current');
assert.match(calc,/VIEW STARTER PROJECTIONS/,'current matchup has explicit inspect link');
assert.match(calc,/selectedWeek===firstWeek&&activeSleeperWeek===firstWeek/,
 'only current league week offers inspection');
assert.match(calc,/pcl-model-player-averages/,'each starter displays individual scoring history');
assert.match(calc,/score\.last8_avg/,'last eight average shown');
assert.match(calc,/score\.last3_avg/,'last three average shown');
assert.match(calc,/score\.projection/,'weighted player PPG displayed');
assert.match(calc,/adjustment\.starterTotal/,'starting lineup total matches actual shared model');
assert.match(calc,/adjustment\.typicalTotal/,'usual lineup used in sim displayed');
assert.match(calc,/strength\[id\]\.lineupDelta/,'same lineup adjustment as sim displayed');
assert.match(calc,/strength\[id\]\.weekMean/,'simulated adjusted week mean displayed');
assert.match(calc,/lineupSnapshot=snapshot;lineupAdjustments=adjustments;/,
 'details reuse the exact scored model snapshot rather than duplicating calculations');
assert.match(calc,/return \[round\(pa\),round\(pb\)\]/);
assert.match(css,/\.pcl-model-teams\{/);
assert.match(css,/@media\(max-width:699px\)/);
assert.match(html,/playoff-calculator-v167\.js\?v=195/);
assert.match(html,/playoff-calculator-v167\.css\?v=195/);
assert.match(sw,/fig-league-shell-v195/);

assert.equal(scores.season,Math.max(...settings.map(x=>+x.season)));
const rates=Object.values(scores.players);
assert.ok(rates.length>100);
for(const p of rates) {
  assert.ok(p.games>0&&p.games<=Math.min(scores.through_week,8),'only current season samples included');
  assert.ok(Math.abs(p.projection-(0.7*p.last8_avg+0.3*p.last3_avg))<0.0002,
   'each displayed projection follows the exact 70/30 formula');
}
const teamRows=[];
for(let id=1;id<=10;id++){
 const ids=rosters.filter(x=>+x.season===scores.season&&+x.franchise_id===id&&x.is_starter)
   .sort((a,b)=>+a.lineup_order-(+b.lineup_order)).map(x=>String(x.player_id));
 if(ids.length!==10)break;
 teamRows.push({roster_id:id,starters:ids});
}
if(teamRows.length===10&&scores.through_week>=1){
 const outputs=calculate({year:scores.season,week:scores.through_week+1,matchups:teamRows,playerScores:scores});
 assert.equal(Object.keys(outputs).length,10);
 for(const [tid,result] of Object.entries(outputs)){
   if(!result.available)continue;
   const team=teamRows.find(x=>String(x.roster_id)===tid);
   const total=team.starters.reduce((sum,id)=>sum+scores.players[id].projection,0);
   assert.ok(Math.abs(total-result.starterTotal)<1e-5,'all ten visible starter PPGs sum exactly');
   assert.ok(Math.abs(result.delta-Math.max(-30,Math.min(30,.7*(result.starterTotal-result.typicalTotal))))<1e-5,
     'drilldown adjustment equals the existing simulation');
 }
}
console.log('Current matchup starter drilldown and real scoring inputs passed');
