'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const player=require('../scripts/backtest_dynasty_players');
const team=require('../scripts/backtest_dynasty_franchise');
const load=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data',f+'.json'),'utf8'));
const archive=load('dynasty_nfl_history'),roster=load('current_roster'),
 drafts=load('draft_picks'),franchises=load('team_season_master');
assert.equal(archive.scoring_season,2026);
const results=player.backtest({nflHistory:archive,roster,draft:drafts});
assert.equal(results.train_transition,'2023->2024');
assert.equal(results.holdout_transition,'2024->2025');
assert.ok(results.training_cases>=600);
assert.ok(results.holdout_cases>=600);
assert.equal(results.trained_parameters.alpha,.8);
assert.ok(results.holdout.at_least_8_games.trained_shrinkage.mae<
 results.holdout.at_least_8_games.naive.mae,
 'Cross-season PPG regression must beat naive persistence on real holdout');
assert.ok(results.holdout.established_15_plus_ppg.trained_shrinkage.mae<
 results.holdout.established_15_plus_ppg.naive.mae);
assert.equal(results.rookies.train_n,40);
assert.equal(results.rookies.holdout_n,40);
assert.equal(results.rookies.second_year_holdout_available,false);
assert.equal(results.age_curve_subset.current_2026_roster_only,true);
assert.ok(results.age_curve_subset.known_age_count>=100);
assert.ok(results.caveats.some(s=>s.includes('six-year')));
const rookieHoldout=trainArchive=>{
 const r=player.rookieBacktest(drafts,trainArchive);
 return r.round_means;
};
const altered=JSON.parse(JSON.stringify(archive));
for(const r of Object.values(altered.seasons['2025'].players)){
 r.total_points=0;r.mean_ppg=0;
}
const earlier=player.fitPersistence(player.seasonTransition(archive,2023));
const later=player.fitPersistence(player.seasonTransition(altered,2023));
assert.deepEqual(later,earlier,'Future 2025 results cannot enter 2023->2024 training');
assert.deepEqual(rookieHoldout(altered),rookieHoldout(archive),
 '2025 class outcomes cannot enter 2024 rookie training');
const prior=player.seasonTransition(archive,2024);
assert.ok(prior.some(x=>x.target===0&&x.prior>0),
 'Inactive following-season players are included rather than dropping losers');
assert.throws(()=>player.seasonTransition({...archive,seasons:{...archive.seasons,'2024':null}},2023));
const teams=team.backtest(franchises);
assert.equal(teams.holdout.unchanged.n,10);
assert.equal(teams.holdout.trained.n,10);
assert.equal(teams.holdout.unchanged.actual_leader,6);
assert.ok(teams.holdout.trained.mae>teams.holdout.unchanged.mae,
 'Franchise shrinkage tuned on 2023->24 must not be advertised as a 2025 win');
console.log('Time-sliced player, rookie, and franchise historical validations passed');
