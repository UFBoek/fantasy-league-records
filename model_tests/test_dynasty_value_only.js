'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const model=require('../scripts/dynasty_value_only_model');
const read=n=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',n+'.json'),'utf8'));
const input={roster:read('current_roster'),values:read('rosteraudit_values'),picks:read('current_future_picks')};
for(const pos of ['QB','RB','WR','TE']){
 assert.ok(model.projectedPotential(pos,23,9000,2030)>model.projectedPotential(pos,23,9000,2026),
  'Young high-value '+pos+' should naturally mature into a better scorer');
 assert.ok(model.projectedPotential(pos,32,5000,2032)<model.projectedPotential(pos,32,5000,2027),
  'Age decline must reduce veteran '+pos+' output');
 assert.ok(model.projectedPotential(pos,23,9000,2030)>model.projectedPotential(pos,23,1000,2030),
  'Higher RosterAudit value must produce stronger modeled '+pos+' talent');
}
assert.ok(model.projectedPotential('WR',21,8500,2026)<model.projectedPotential('WR',21,8500,2029)*.85,
 'High-valued 21-year-old WR must have substantial development runway');
assert.ok(model.projectedPotential('TE',22,3500,2026)<model.projectedPotential('TE',22,3500,2032)*.85,
 'Young TE needs real development runway');
assert.ok(model.breakoutProbability('WR',21,1000)>0,
 'Low-valued young WR must retain a nonzero possibility of breaking out');
assert.equal(model.breakoutProbability('WR',31,8000),0,
 'Veterans cannot receive fictional early-career breakout opportunities');
assert.equal(model.projectedPotential('WR',23,NaN,2030),null);
const r=()=>({u:()=>0,normal:()=>0});
const p1=model.makeIncumbent({player_id:'A',player_name:'Player A',position:'WR',age:22,franchise_id:1},
 {players:{A:{value:2500}}},r());
const p2=model.makeIncumbent({player_id:'B',player_name:'Player B',position:'WR',age:22,franchise_id:9},
 {players:{B:{value:2500}}},r());
assert.equal(model.project(p1,2029,r()),model.project(p2,2029,r()),
 'Same age/position/value receives identical scores regardless of team or player name');
const noQuote=model.makeIncumbent({player_id:'C',position:'WR',age:22,franchise_id:1},
 {players:{}},r());
assert.equal(model.project(noQuote,2029,r()),null,'Never backfill unknown RosterAudit value using past PPG');
const initial=model.runModel({...input,runs:20,seed:1107});
assert.equal(initial.status,'research_only');
assert.equal(initial.version,'experimental-v3-value-position-age-only');
assert.deepEqual(initial.years,[2027,2028,2029,2030,2031,2032]);
assert.ok(initial.inputs.market_coverage_pct>=95);
assert.deepEqual(initial,model.runModel({...input,runs:20,seed:1107}),'Model must be deterministic');
for(const year of initial.years){
 const s=initial.seasons[year];
 assert.equal(s.ranking.length,10);
 assert.ok(s.ranking.every(t=>Number.isFinite(t.ppg)&&t.ppg>=0));
 for(let id=1;id<=10;id++){
  const cohort=s.player_projections[id];
  const actual=input.roster.filter(p=>+p.franchise_id===id&&['QB','RB','WR','TE'].includes(p.position));
  assert.equal(cohort.filter(p=>!p.rookie).length,actual.length);
  assert.equal(new Set(cohort.map(p=>p.id)).size,cohort.length);
  assert.ok(cohort.every(p=>p.ppg===null||(p.ppg>=0&&p.p10>=0&&p.p90>=p.p10)));
 }
}
assert.throws(()=>model.runModel({...input,values:{players:{}},runs:2}),/coverage/);
// Input features are *exclusively* player position/age, current market
// value, team ownership and owned future picks. Modifying player names,
// 2026 game scores, prior NFL scoring or actual league outcomes must
// never alter the generated scoring draws.
const polluted={...input,weekly:read('weekly_scoring_ranks'),
 logs:read('player_game_log'),nflCurrent:read('playoff_nfl_weekly_scores'),
 nflHistory:read('dynasty_nfl_history'),drafts:read('draft_picks')};
polluted.weekly=polluted.weekly.map(x=>({...x,points_for:99999}));
polluted.logs=polluted.logs.map(x=>({...x,starter_points:9999}));
assert.deepEqual(model.runModel({...polluted,runs:20,seed:1107}),initial,
 'Scoring history and franchise performance are not legal value-only model inputs');
const market=JSON.parse(JSON.stringify(input.values));market.players={...market.players};
const example=input.roster.find(x=>x.position==='WR'&&market.players[x.player_id]?.value!=null);
market.players[example.player_id]={...market.players[example.player_id],value:1};
const altered=model.runModel({...input,values:market,runs:20,seed:1107});
assert.notDeepEqual(altered.seasons[2029].player_projections[example.franchise_id],
 initial.seasons[2029].player_projections[example.franchise_id],
 'Market value must affect future player output');
console.log('Value-only player scoring, young growth, veteran decline, breakout uncertainty, missing-price guard and no-scoring-history leakage tests passed');
