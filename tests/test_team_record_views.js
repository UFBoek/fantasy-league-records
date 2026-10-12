/* Regression checks for restoring all-time standings but no combined all-time TEAM record views.
   Player career stats and the streak archive intentionally remain intact. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const engine=fs.readFileSync('record-break-watch-v133.js','utf8');
const segment=(begin,end)=>{
 const i=app.indexOf(begin),j=app.indexOf(end,i+begin.length);
 assert.ok(i>=0&&j>i,'Missing section: '+begin);
 return app.slice(i,j);
};
const records=segment('async function records(){','async function recordDetail(');
assert.ok(records.includes("let view='Regular Season'"));
assert.ok(records.includes("{value:'Regular Season',label:'REGULAR SEASON'}"));
assert.ok(records.includes("{value:'Playoffs',label:'PLAYOFFS'}"));
assert.ok(records.includes("{value:'Single Season',label:'SINGLE SEASON'}"));
assert.ok(!records.includes("{value:'All-Time Combined',label:'ALL-TIME'}"));
assert.ok(records.includes("section('ALL-TIME STANDINGS'"));
assert.ok(records.includes('hallBoard+'));
assert.ok(records.includes("figSingleSeasonWatchSection(figBuildSingleSeasonWatch("));
const team=segment('async function team(id,selectedTab,selectedDraftYear){','async function records(){');
assert.ok(team.includes("cleanTeamRecordRows(view)"));
assert.ok(team.includes("['Regular Season','Playoffs'].flatMap(view"));
assert.ok(!team.includes("cleanTeamRecordRows('All-Time Combined')"));
assert.ok(!team.includes('All-Time%20Combined'));
assert.ok(team.includes("r.view==='Playoffs'?'PLAYOFFS':'REGULAR SEASON'"));
// Execute the exact scoped team-record projection: a prior edit accidentally
// appended () after flatMap(), crashing every team profile.
const specialStart=team.indexOf(" const scopedSpecialRows=['Regular Season','Playoffs'].flatMap(view=>{");
const specialEnd=team.indexOf(' // Preserve secondary leaderboard placements',specialStart);
assert.ok(specialStart>=0&&specialEnd>specialStart);
const specialSource=team.slice(specialStart,specialEnd);
const runSpecial=new Function('DATA','num',specialSource+'; return scopedSpecialRows;');
const data={
 standingsCareer:[{franchise_id:1,owner_name:'Boek'},{franchise_id:6,owner_name:'Hayden'}],
 games:[
  {season:2026,week:1,game_type:'Regular Season',franchise_1:1,owner_1:'Boek',score_1:225,franchise_2:6,owner_2:'Hayden',score_2:198},
  {season:2025,week:15,game_type:'Playoffs',franchise_1:1,owner_1:'Boek',score_1:189,franchise_2:6,owner_2:'Hayden',score_2:202}
 ]
};
const specialRows=runSpecial(data,n=>Number(n||0));
assert.ok(Array.isArray(specialRows));
assert.ok(specialRows.some(x=>x.view==='Regular Season'&&x.label==='HIGHEST SCORING WEEK'));
assert.ok(specialRows.some(x=>x.view==='Playoffs'&&x.label==='HIGHEST SCORING WEEK'));
assert.ok(specialRows.every(x=>!String(x.href).includes('All-Time')));

const teamDetail=segment('async function recordDetail(', 'function figActiveStreakOrder(');
assert.ok(teamDetail.includes("const teamView=view==='All-Time Combined'?'Regular Season':view"));
assert.ok(teamDetail.includes('cleanTeamRecordRows(teamView)'));
const special=segment('async function specialRecord(', 'function gamesForFranchise(');
assert.ok(special.includes("const view=requestedView==='Playoffs'?'Playoffs':'Regular Season'"));
const watch=engine.slice(engine.indexOf('function figBuildTeamRecordWatch()'),engine.indexOf('function figStreakCondition('));
assert.ok(watch.includes("['Regular Season']"));
assert.ok(!watch.includes("['Regular Season','Playoffs']"));
assert.ok(!watch.includes("scope:'PLAYOFFS'"));
assert.ok(!watch.includes('All-Time Combined'));
assert.ok(!watch.includes("scope:'ALL-TIME'"));
const streaks=segment('async function streaks(){','async function streakDetail(');
assert.ok(streaks.includes("section('ALL-TIME STREAK RECORDS'"));
assert.ok(streaks.includes('figBuildStreakRecordWatch(DATA.websiteStreaks)'));
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.ok(index.includes('app.js?v=140'));
assert.ok(index.includes('record-break-watch-v133.js?v=139'));
assert.ok(sw.includes('app.js?v=140'));
assert.ok(sw.includes('record-break-watch-v133.js?v=139'));
console.log('Regular-season and playoff-only team records checks passed.');
