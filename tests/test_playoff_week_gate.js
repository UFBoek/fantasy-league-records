const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {weekStatus}=require('../playoff-week-gate-v205.js');
const {calculate}=require('../playoff-lineup-model-v191.js');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const status=(done,leg)=>weekStatus({lastCompletedWeek:done,activeSleeperWeek:leg});

assert.deepEqual(status(7,7),{ready:true,early:true,week:8},
 'verified week 7 plus Sleeper still showing leg 7 must allow provisional W8 forecasts');
assert.deepEqual(status(7,8),{ready:true,early:false,week:8},
 'week 8 model remains available after Sleeper advances to leg 8');
assert.deepEqual(status(7,6),{ready:false,early:false,week:8},
 'two-week-stale league marker should not create fabricated lineups');
assert.deepEqual(status(7,9),{ready:false,early:false,week:8},
 'website data lagging two weeks must not present old starters as current');
assert.deepEqual(status(14,14),{ready:false,early:false,week:null},
 'no regular-season lineup projections after week 14');
assert.deepEqual(status(7,null),{ready:false,early:false,week:null},
 'missing provider marker must not unlock a speculative week');
assert.equal(status(6,7).ready,true,'normal in-season current league week remains supported');

const ranks=JSON.parse(read('data/weekly_scoring_ranks.json')).filter(x=>+x.season===2026);
const lastCompleted=Math.max(...ranks.map(x=>+x.week));
const league=JSON.parse(read('data/league_settings.json')).find(x=>+x.season===2026);
const settings=JSON.parse(league.settings_json);
const playerScores=JSON.parse(read('data/playoff_player_scores.json'));
if(lastCompleted===7&&settings.leg===7){
 assert.equal(status(lastCompleted,settings.leg).week,8,
   'live published Week 7 archives immediately authorize provisional Week 8 player models');
 assert.equal(playerScores.through_week,7,
   'Week 8 player model uses verified Week 7 history');
}
const archivedRoster=JSON.parse(read('data/current_roster.json'));
const snapshots=[];
for(let id=1;id<=10;id++){
 const starters=archivedRoster.filter(r=>+r.season===2026&&+r.franchise_id===id&&r.is_starter)
   .sort((a,b)=>+a.lineup_order-+b.lineup_order)
   .map(r=>String(r.player_id));
 snapshots.push({roster_id:id,starters});
}
const simulated=calculate({
 year:2026,week:8,matchups:snapshots,playerScores,allowIncomplete:true
});
assert.equal(Object.keys(simulated).length,10,
 'even partial historical roster backup must return a model state for every franchise');
const valid=snapshots.filter(x=>x.starters.length===10).length;
assert.ok(valid>=8,'snapshot should provide most teams with a full current-roster lineup');
assert.equal(simulated[10].available,false,
 'James with only 8 current starters must not be given fabricated points');
assert.ok(Object.values(simulated).some(x=>x.available===true),
 'provisional Week 8 adjustments must become active rather than all teams falling back');
assert.deepEqual(calculate({year:2026,week:8,matchups:snapshots,playerScores}),{},
 'real/live feed must still reject incomplete full-lineup inputs');
assert.deepEqual(calculate({
 year:2026,week:9,matchups:snapshots,playerScores,allowIncomplete:true
}),{},'do not use Week 7 player history as the Week 9 form model');

const calc=read('playoff-calculator-v167.js');
assert.match(calc,/function modelWeekStatus\(\)/);
assert.match(calc,/lastCompletedWeek:firstWeek-1/);
assert.match(calc,/if\(!currentWeekLineups\|\|!modelWeekIsReady\(\)/,
 'pre-Sleeper-transition Week 8 must apply current provisional starters');
assert.match(calc,/w===firstWeek&&modelWeekIsReady\(\)&&pairs/,
 'Week 8 feed must be accepted based on verified archive, not the old Sleeper leg');
assert.match(calc,/!currentWeekLineups&&modelWeekIsReady\(\)/,
 'published roster fallback must work while Sleeper still reports Week 7');
assert.match(calc,/backup\.some\(function\(r\)/,
 'one manager with missing starters should not block everyone');
assert.match(calc,/allowIncomplete:lineupSource==='ROSTER SNAPSHOT'/);
assert.match(calc,/document\.hidden\|\|!modelWeekIsReady\(\)/,
 'live model refresh should continue before Sleeper leg transitions');
assert.match(calc,/var inspect=selectedWeek===firstWeek&&modelWeekIsReady\(\)/,
 'next-week starter detail links are enabled early');
assert.match(calc,/!game\|\|!modelWeekIsReady\(\)/,
 'starter detail route no longer incorrectly says next week has expired');
assert.match(calc,/PRELIMINARY · SUBJECT TO LINEUP CHANGES/,
 'early-week projections must clearly disclose unconfirmed starters');
assert.match(calc,/PREVIOUS LINEUP SNAPSHOT · PROVISIONAL/,
 'prior-week roster fallback must never be presented as a confirmed lineup');

const html=read('index.html'),sw=read('sw.js');
assert.ok(html.indexOf('playoff-week-gate-v205.js')<
 html.indexOf('playoff-calculator-v167.js'),'week gate must load first');
assert.match(html,/playoff-lineup-model-v191\.js\?v=205/);
assert.match(html,/playoff-calculator-v167\.js\?v=206/);
assert.match(sw,/playoff-week-gate-v205\.js\?v=205/);
assert.match(sw,/fig-league-shell-v\d+/,'service worker has a versioned cache');
console.log('Verified archive unlocks Week 8 preview, partial-roster safety and 2026 model regression passed');
