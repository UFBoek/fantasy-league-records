/* Verify completed-game full-season projections against finalized season records. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('single-season-watch-v136.js','utf8');
const context={
 money:v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:2}),
 displayOwnerName:(n,id)=>({1:'Boek',6:'Hayden',10:'James'})[Number(id)]||n,
 esc:s=>String(s),
 ownerAvatar:()=>'<img>',
 figRecordAllowed:()=>true
};
vm.createContext(context);
vm.runInContext(source,context);
const oldSeason={season:2025,franchise_id:6,owner_name:'HaydenM',games:14,season_complete:true};
const current={season:2026,franchise_id:1,owner_name:'jackboek1',games:4,season_complete:false,
 points_for:920,point_differential:260,losses:0,wins:4,max_pf:1000,
 median_score:220,all_play_win_pct:95,weekly_high_scores:2,weekly_top_3_finishes:4};
const records=[
 {season:2025,franchise_id:6,owner_name:'HaydenM',record_category:'Points For',value:3000},
 {season:2025,franchise_id:6,owner_name:'HaydenM',record_category:'Wins',value:12},
 {season:2025,franchise_id:6,owner_name:'HaydenM',record_category:'Median Score',value:210},
 {season:2025,franchise_id:6,owner_name:'HaydenM',record_category:'All-Play Win Percentage',value:90},
 {season:2025,franchise_id:6,owner_name:'HaydenM',record_category:'Weekly High Scores',value:7},
 {season:2025,franchise_id:6,owner_name:'HaydenM',record_category:'Max PF',value:3500},
 // Incomplete current-season rows must never become the historical target.
 {season:2026,franchise_id:6,owner_name:'HaydenM',record_category:'Points For',value:99999}
];
const settings=[{season:2026,settings_json:JSON.stringify({start_week:1,playoff_week_start:15})}];
const bombs=[{season:2025,franchise_id:6,owner_name:'HaydenM',record_category:'30 BOMBS',value:19}];
const bombBoard=()=>[{franchise_id:1,b5:9,b20:13,b30:8,b40:3,b50:0}];
const input=[oldSeason,current];
const watch=context.figBuildSingleSeasonWatch(input,records,settings,bombs,bombBoard);
assert.equal(watch.season,2026);
assert.equal(watch.completedGames,4);
assert.equal(watch.targetGames,14);
const find=category=>watch.entries.find(x=>x.category===category);
assert.equal(find('Points For').projected,3220);
assert.equal(find('Points For').record,3000);
assert.equal(find('Wins').projected,14);
assert.equal(find('Median Score').projected,220);
assert.equal(find('All-Play Win Percentage').projected,95);
assert.equal(find('30 BOMBS').projected,28);
assert.equal(find('Weekly High Scores'),undefined); // Two / four projects seven: only a tie.
assert.equal(find('Max PF'),undefined); // 1000 / four projects 3500: only a tie.
assert.equal(watch.entries.every(x=>x.projected>x.record),true);
assert.equal(watch.entries.every(x=>x.weeksPlayed===4&&x.targetGames===14),true);
assert.match(context.figSingleSeasonWatchSection(watch),/SINGLE-SEASON RECORD WATCH/);
assert.match(context.figSingleSeasonWatchSection(watch),/PROJECTED FINISH/);
assert.match(context.figSingleSeasonWatchSection(watch),/ON PACE/);
assert.match(context.figSingleSeasonWatchSection(watch),/2026 SEASON/);
assert.ok(context.figSingleSeasonWatchSection(watch).includes('#/singleseasons/Points%20For'));
assert.equal(context.figBuildSingleSeasonWatch([oldSeason,{...current,games:0}],records,settings,bombs,bombBoard).entries.length,0);
assert.equal(context.figBuildSingleSeasonWatch([oldSeason,{...current,season_complete:true,games:14}],records,settings,bombs,bombBoard).entries.length,0);
const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
assert.ok(app.includes("figSingleSeasonWatchSection(figBuildSingleSeasonWatch("));
assert.ok(app.includes("figWireWatch('figSeasonRecordWatch')"));
assert.match(index, /single-season-watch-v136\.js\?v=\d+/);
assert.ok(index.includes('single-season-watch-v136.css?v=136'));
console.log('Single-season record watch regression checks passed.');
