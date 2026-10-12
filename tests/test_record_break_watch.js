/* Regression checks: six-game records (125+/150+ next-game only) and three-game ended streaks.
   Run with node tests/test_record_break_watch.js. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('record-break-watch-v133.js','utf8');
const teamRows=[
 {category:'Career 200+ Point Games',metric:'games_200',scoring_view:'Playoffs',franchise_id:6,record_holder:'HaydenM',value:12},
 {category:'Career 200+ Point Games',metric:'games_200',scoring_view:'Playoffs',franchise_id:1,record_holder:'jackboek1',value:11},
 {category:'Career Points Scored',metric:'total_points',scoring_view:'Playoffs',franchise_id:6,record_holder:'HaydenM',value:10000},
 {category:'Career Points Scored',metric:'total_points',scoring_view:'Playoffs',franchise_id:1,record_holder:'jackboek1',value:9200},
 {category:'Career 125+ Point Games',metric:'games_125',scoring_view:'Regular Season',franchise_id:6,record_holder:'HaydenM',value:40},
 {category:'Career 125+ Point Games',metric:'games_125',scoring_view:'Regular Season',franchise_id:1,record_holder:'jackboek1',value:34},
 {category:'Career 150+ Point Games',metric:'games_150',scoring_view:'Regular Season',franchise_id:6,record_holder:'HaydenM',value:40},
 {category:'Career 150+ Point Games',metric:'games_150',scoring_view:'Regular Season',franchise_id:1,record_holder:'jackboek1',value:33},
 // A tie at the top can be broken with one qualifying game. Both leaders qualify.
 {category:'Career 125+ Point Games',metric:'games_125',scoring_view:'Playoffs',franchise_id:6,record_holder:'HaydenM',value:45},
 {category:'Career 125+ Point Games',metric:'games_125',scoring_view:'Playoffs',franchise_id:1,record_holder:'jackboek1',value:45},
 {category:'Career 150+ Point Games',metric:'games_150',scoring_view:'Playoffs',franchise_id:6,record_holder:'HaydenM',value:40},
 {category:'Career 150+ Point Games',metric:'games_150',scoring_view:'Playoffs',franchise_id:1,record_holder:'jackboek1',value:40},
 {category:'Career 175+ Point Games',metric:'games_175',scoring_view:'Regular Season',franchise_id:6,record_holder:'HaydenM',value:30},
 {category:'Career 175+ Point Games',metric:'games_175',scoring_view:'Regular Season',franchise_id:1,record_holder:'jackboek1',value:25},
 {category:'20 BOMBS',metric:'b20',scoring_view:'Regular Season',franchise_id:6,record_holder:'HaydenM',value:125},
 {category:'20 BOMBS',metric:'b20',scoring_view:'Regular Season',franchise_id:1,record_holder:'jackboek1',value:123},
 {category:'Career Median Score',metric:'median_points',scoring_view:'Regular Season',franchise_id:6,record_holder:'HaydenM',value:200},
 {category:'Career Median Score',metric:'median_points',scoring_view:'Regular Season',franchise_id:1,record_holder:'jackboek1',value:199}
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
 {franchise_id:6,owner:'HaydenM',streak_type:'125+ Points',streak_mode:'Career Games',length:53,active:true,start_season:'2023',start_week:1,end_season:'2026',end_week:4},
 {franchise_id:7,owner:'LionelColl',streak_type:'125+ Points',streak_mode:'Career Games',length:40,active:false,start_season:'2023',start_week:1,end_season:'2025',end_week:1},
 {franchise_id:1,owner:'jackboek1',streak_type:'Losing',streak_mode:'Career Games',length:15,active:true,start_season:'2025',start_week:1,end_season:'2026',end_week:4},
 {franchise_id:6,owner:'HaydenM',streak_type:'Losing',streak_mode:'Career Games',length:17,active:false,start_season:'2024',start_week:1,end_season:'2024',end_week:17},
 {franchise_id:1,owner:'jackboek1',streak_type:'Winning',streak_mode:'Career Games',length:13,active:true,start_season:'2025',start_week:1,end_season:'2026',end_week:4},
 {franchise_id:6,owner:'HaydenM',streak_type:'Winning',streak_mode:'Career Games',length:16,active:false,start_season:'2024',start_week:1,end_season:'2024',end_week:16}
];
const streakWatch=context.figBuildStreakRecordWatch(streaks);
assert.equal(streakWatch.length,3);
const boek200=streakWatch.find(x=>x.team==='Boek'&&x.title==='200+ Points');
assert.equal(boek200.record,6); // Hayden's ENDED record, not Boek's active one.
assert.equal(boek200.recordHolder,'Hayden');
assert.equal(boek200.gamesNeeded,1);
assert.equal(boek200.status,'BREAK');
assert.equal(streakWatch.find(x=>x.team==='Line').gamesNeeded,2);
assert.equal(streakWatch.find(x=>x.title==='Losing').gamesNeeded,3);
assert.equal(streakWatch.some(x=>x.title==='125+ Points'),false); // Active holder already passed ended mark.
assert.equal(streakWatch.some(x=>x.title==='Winning'),false); // Would take four games.
assert.equal(streakWatch.every(x=>x.status==='BREAK'&&x.gamesNeeded<=3),true);
const recordWatch=context.figBuildTeamRecordWatch();
assert.equal(recordWatch.length,7);
assert.equal(context.figWatchHorizon('games_125'),1);
assert.equal(context.figWatchHorizon('games_150'),1);
assert.equal(context.figWatchHorizon('games_175'),6);
assert.equal(recordWatch.filter(x=>x.metric==='games_125').length,2);
assert.equal(recordWatch.filter(x=>x.metric==='games_150').length,2);
assert.ok(recordWatch.filter(x=>x.metric==='games_125'||x.metric==='games_150').every(x=>x.gamesNeeded===1&&x.status==='BREAK'));
assert.equal(recordWatch.some(x=>x.metric==='games_125'&&x.scope==='REGULAR SEASON'),false);
assert.equal(recordWatch.some(x=>x.metric==='games_150'&&x.scope==='REGULAR SEASON'),false);
assert.equal(recordWatch.find(x=>x.title==='Career 200+ Point Games').gamesNeeded,2);
assert.equal(recordWatch.find(x=>x.title==='20 BOMBS').scope,'REGULAR SEASON');
assert.equal(recordWatch.some(x=>x.title==='Career 125+ Point Games'&&x.scope==='REGULAR SEASON'),false); // Needs seven net 125+ games.
assert.equal(recordWatch.some(x=>x.title==='Career Points Scored'),false);
assert.equal(recordWatch.some(x=>x.title==='Career 150+ Point Games'&&x.scope==='REGULAR SEASON'),false);
assert.equal(recordWatch.find(x=>x.title==='Career 175+ Point Games').gamesNeeded,6);
assert.equal(recordWatch.some(x=>x.title==='Career Median Score'),false);
assert.equal(recordWatch.every(x=>x.status==='BREAK'&&x.gamesNeeded<=6),true);
assert.equal(recordWatch.some(x=>x.scope==='ALL-TIME'),false);
assert.equal(recordWatch.some(x=>x.scope==='PLAYOFFS'),true);
assert.match(context.figWatchRow(recordWatch.find(x=>x.metric==='games_125'),false),/NEXT GAME/);
assert.equal(context.figWatchLatestWeek([{season:'2026',week:3}],streaks),'Through 2026 W4');
const html=context.figWatchSection('streaks',streakWatch,'Through 2026 W4');
assert.match(html,/RECORD BREAK WATCH/);
assert.match(html,/Ended record/);
assert.doesNotMatch(html,/>TIE</);
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
assert.ok(index.includes('record-break-watch-v133.js?v=135'));
assert.ok(index.includes('record-break-watch-v133.css?v=135'));
assert.ok(app.includes("figWatchSection('records',figBuildTeamRecordWatch()"));
assert.ok(app.includes("figWatchSection('streaks',figBuildStreakRecordWatch(DATA.websiteStreaks)"));
console.log('Record and streak break-watch regression checks passed.');
