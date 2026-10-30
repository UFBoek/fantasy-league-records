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
// QB pricing should distinguish genuine starters from backups, and a 32-year-old
// established QB should remain capable through age 35 before declining.
const startingQB=model.projectedPotential('QB',32,3500,2027);
assert.ok(startingQB>=27&&startingQB<=34,
 'Early-30s veteran QB with starter-level value should remain a ~30 PPG talent');
const veteranAt36=model.projectedPotential('QB',32,3500,2030);
assert.ok(veteranAt36>=startingQB*.79&&veteranAt36<=startingQB*.90,
 'A veteran QB should meaningfully decline from ages 33 to 36');
assert.ok(model.maturity('QB',34)>model.maturity('QB',36)&&model.maturity('QB',36)>model.maturity('QB',38),
 'Late-career QB scoring must progressively decline');
assert.ok(model.projectedPotential('QB',30,9000,2032)<model.projectedPotential('QB',30,9000,2028)*.9,
 'Even elite QBs should not retain 90% of peak potential at age 36');
assert.ok(model.projectedPotential('QB',32,3500,2032)<startingQB,
 'Older QB potential eventually declines; no indefinite prime');
assert.ok(model.projectedPotential('QB',30,9000,2032)>=26,
 'An elite 30-year-old QB can remain a high-scoring starter at age 36');
// Existing veteran starters should have plausible scoring if still active,
// without treating young developmental QBs, backups, or likely retired QBs as starters.
assert.equal(model.projectedPotential('QB',32,3016,2032),21.5,
 'Goff-like established QB at age 38 should keep a starter-quality talent floor');
assert.equal(model.projectedPotential('QB',33,2975,2032),21.5,
 'Dak-like veteran QB at age 39 should keep a starter-quality talent floor');
assert.ok(model.projectedPotential('QB',24,1350,2027)<21.5,
 'Developing young QBs are not assigned the veteran starter scoring floor');
assert.ok(model.projectedPotential('QB',36,299,2027)<21.5,
 'Low-valued QB with uncertain starting job cannot inherit a starter floor');
assert.ok(model.projectedPotential('QB',38,1816,2032)<21.5,
 'No automatic scoring floor after 39: retirement/role uncertainty remains');
assert.ok(model.marketPpg('QB',200)<10,
 'A backup-level market value must not turn into 25 starter PPG');
assert.ok(model.marketPpg('QB',5000)>30,
 'High-value QB market anchor should clear 30 fantasy points');
assert.ok(model.marketPpg('QB',10000)<=34,
 'Even elite QB pricing should not imply a 37-point future scoring average');
assert.ok(model.marketPpg('QB',10000)>model.marketPpg('QB',2000),
 'Elite QB talent must still exceed average QB talent');
const fixedPickRandom={u:()=>.5,normal:()=>0};
const jamesEarly={year:2028,round:1,origin:10,owner:2};
const jamesTop=model.makeFuturePick(jamesEarly,fixedPickRandom,1,input.values);
const jamesLate=model.makeFuturePick(jamesEarly,fixedPickRandom,10,input.values);
assert.equal(jamesTop.team,2,'Traded James first-rounder must belong to Fru');
assert.equal(jamesTop.pick_origin,10,'Original draft franchise must be preserved');
assert.equal(jamesTop.value,input.values.future_picks['2027:1:early']*.65,
 'Weak James franchise should confer EARLY first-round pick quality');
assert.equal(jamesLate.value,input.values.future_picks['2027:1:late']*.65,
 'Strong original franchise must confer LATE pick quality');
assert.ok(jamesTop.value>jamesLate.value,'Draft pick tiers must rank in the correct direction');
assert.ok(model.projectedPotential(jamesTop.pos,jamesTop.age,jamesTop.value,2032,2028)>
 model.projectedPotential(jamesTop.pos,jamesTop.age,jamesTop.value,2028,2028),
 'First-round rookie should gain ability as he matures');
const allFuturePicks=model.makePicks(input.picks);
for(const year of [2028,2029]){
 const jamesFirst=allFuturePicks[year].find(x=>x.origin===10&&x.round===1);
 assert.equal(jamesFirst.owner,2,'Fru must own James '+year+' first');
 assert.equal(jamesFirst.assumed,false,'James '+year+' first ownership is verified');
}
const lateFutureJames=allFuturePicks[2032].find(x=>x.origin===10&&x.round===1);
assert.equal(lateFutureJames.owner,10,
 'Do not fabricate a transfer of James 2032 first without actual ownership data');
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
assert.equal(initial.version,'experimental-v3.7-qb-scoring-and-r1-draft-order');
assert.equal(initial.league_scoring_calibration.baseline_ppg,1600);
assert.deepEqual(initial.years,[2027,2028,2029,2030,2031,2032]);
assert.ok(initial.inputs.market_coverage_pct>=95);
assert.deepEqual(initial,model.runModel({...input,runs:20,seed:1107}),'Model must be deterministic');
for(const year of initial.years){
 const s=initial.seasons[year];
 assert.equal(s.ranking.length,10);
 const leagueTotal=s.ranking.reduce((sum,team)=>sum+team.ppg,0);
 assert.ok(leagueTotal>=1569.5&&leagueTotal<=1630.5,
  'League-wide PPG should stay within the 1,570–1,630 historical target band');
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
