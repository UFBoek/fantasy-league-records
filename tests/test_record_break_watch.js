/* Offline regression coverage for both watch sections. Run with node tests/test_record_break_watch.js. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('record-break-watch-v133.js','utf8');
const teamRows=[
 {category:'Career 200+ Point Games',metric:'games_200',scoring_view:'All-Time Combined',franchise_id:6,record_holder:'HaydenM',value:12},
 {category:'Career 200+ Point Games',metric:'games_200',scoring_view:'All-Time Combined',franchise_id:1,record_holder:'jackboek1',value:11},
 {category:'Career Points Scored',metric:'total_points',scoring_view:'All-Time Combined',franchise_id:6,record_holder:'HaydenM',value:10000},
 {category:'Career Points Scored',metric:'total_points',scoring_view:'All-Time Combined',franchise_id:1,record_holder:'jackboek1',value:9200},
 {category:'20 BOMBS',metric:'b20',scoring_view:'Regular Season',franchise_id:6,record_holder:'HaydenM',value:125},
 {category:'20 BOMBS',metric:'b20',scoring_view:'Regular Season',franchise_id:1,record_holder:'jackboek1',value:123}
];
const owners={1:'Boek',6:'Hayden',7:'Line'};
const context={
 cleanTeamRecordRows:view=>teamRows.filter(x=>x.scoring_view===view),
 displayOwnerName:(name,id)=>owners[id]||name,
 money:n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2}),
 esc:s=>String(s),
 ownerAvatar:()=>'<img>'
};
vm.createContext(context);
vm.runInContext(source,context);
const streaks=[
 {franchise_id:1,owner:'jackboek1',streak_type:'200+ Points',streak_mode:'Career Games',length:6,active:true,start_season:'2025',start_week:16,end_season:'2026',end_week:4},
 {franchise_id:6,owner:'HaydenM',streak_type:'200+ Points',streak_mode:'Career Games',length:6,active:false,start_season:'2025',start_week:14,end_season:'2026',end_week:3},
 {franchise_id:7,owner:'LionelColl',streak_type:'200+ Points',streak_mode:'Career Games',length:5,active:true,start_season:'2026',start_week:1,end_season:'2026',end_week:4},
 {franchise_id:1,owner:'jackboek1',streak_type:'200+ Points',streak_mode:'Career Games',length:4,active:false,start_season:'2025',start_week:1,end_season:'2025',end_week:4}
];
const streakWatch=context.figBuildStreakRecordWatch(streaks);
assert.equal(streakWatch.length,2);
assert.equal(streakWatch.find(x=>x.team==='Boek').status,'BREAK');
assert.equal(streakWatch.find(x=>x.team==='Boek').next,7);
assert.equal(streakWatch.find(x=>x.team==='Boek').requirement,'Score 200+ points');
assert.equal(streakWatch.find(x=>x.team==='Line').status,'TIE');
assert.equal(streakWatch.some(x=>x.team==='Hayden'),false);
const recordWatch=context.figBuildTeamRecordWatch();
assert.equal(recordWatch.length,2);
assert.equal(recordWatch.find(x=>x.title==='Career 200+ Point Games').status,'TIE');
assert.equal(recordWatch.find(x=>x.title==='20 BOMBS').status,'BREAK');
assert.equal(recordWatch.find(x=>x.title==='20 BOMBS').scope,'REGULAR SEASON');
assert.equal(recordWatch.some(x=>x.title==='Career Points Scored'),false);
assert.equal(context.figWatchLatestWeek([{season:'2026',week:3}],streaks),'Through 2026 W4');
assert.match(context.figWatchSection('streaks',streakWatch,'Through 2026 W4'),/RECORD BREAK WATCH/);
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
assert.match(index,/record-break-watch-v133\.js\?v=133/);
assert.match(index,/record-break-watch-v133\.css\?v=133/);
assert.match(app,/figWatchSection\('records',figBuildTeamRecordWatch\(\)/);
assert.match(app,/figWatchSection\('streaks',figBuildStreakRecordWatch\(DATA.websiteStreaks\)/);
console.log('Record and streak break-watch regression checks passed.');
