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
assert.ok(team.includes("const view='Regular Season';"));
assert.ok(!team.includes("['Regular Season','Playoffs'].flatMap(view"));
assert.ok(!team.includes("cleanTeamRecordRows('All-Time Combined')"));
assert.ok(!team.includes('All-Time%20Combined'));
assert.ok(!team.includes("r.view==='Playoffs'?'PLAYOFFS':'REGULAR SEASON'"));
// Execute both franchise-record builders to guarantee playoffs cannot leak into
// the team snapshot. A previous mistaken flatMap invocation also crashed Teams.
const coreStart=team.indexOf(" const view='Regular Season';");
const coreEnd=team.indexOf(' // Preserve secondary leaderboard placements',coreStart);
assert.ok(coreStart>=0&&coreEnd>coreStart);
const runCore=new Function('DATA','id','num','sameRecordValue','cleanTeamRecordRows',
 team.slice(coreStart,coreEnd)+'; return {careerTopRecords,scopedSpecialRows};');
const data={
 standingsCareer:[{franchise_id:1,owner_name:'Boek'},{franchise_id:6,owner_name:'Hayden'}],
 games:[
  {season:2026,week:1,game_type:'Regular Season',franchise_1:1,owner_1:'Boek',score_1:225,franchise_2:6,owner_2:'Hayden',score_2:198},
  {season:2025,week:15,game_type:'Playoffs',franchise_1:1,owner_1:'Boek',score_1:280,franchise_2:6,owner_2:'Hayden',score_2:202}
 ]
};
const recordFixtures=[
 {category:'Regular High Points',rank:1,value:300,franchise_id:1,record_holder:'Boek',scoring_view:'Regular Season'},
 {category:'Playoff High Points',rank:1,value:350,franchise_id:1,record_holder:'Boek',scoring_view:'Playoffs'}
];
const snapshot=runCore(data,1,n=>Number(n||0),(a,b)=>Number(a)===Number(b),
 view=>recordFixtures.filter(x=>x.scoring_view===view));
assert.equal(snapshot.careerTopRecords.length,1);
assert.equal(snapshot.careerTopRecords[0].label,'Regular High Points');
assert.ok(snapshot.careerTopRecords.every(x=>x.view==='Regular Season'));
assert.ok(snapshot.scopedSpecialRows.length>0);
assert.ok(snapshot.scopedSpecialRows.every(x=>x.view==='Regular Season'));
assert.ok(snapshot.scopedSpecialRows.every(x=>!String(x.href).includes('Playoffs')));
const highs=snapshot.scopedSpecialRows.filter(x=>x.label==='HIGHEST SCORING WEEK');
const lows=snapshot.scopedSpecialRows.filter(x=>x.label==='LOWEST SCORING WEEK');
assert.equal(highs[0].value,280); // A playoff score is the #1 all-game team performance.
assert.equal(highs[0].game_type,'Playoffs');
assert.equal(highs[0].rank,1);
assert.equal(highs[0].href,'#/special/teamweeks/Regular%20Season');
assert.ok(highs.some(x=>x.game_type==='Regular Season'));
assert.ok(lows.every(x=>x.game_type!=='Playoffs'));
assert.ok(lows.every(x=>x.value!==280));
assert.ok(snapshot.scopedSpecialRows.filter(x=>x.label==='WEEKLY HIGH SCORES').every(x=>x.value<=1));
// The Records podium shares the exception, but not the low-score or weekly-count categories.
const podiumStart=records.indexOf(' const renderSpecialRecords=()=>{');
const podiumEnd=records.indexOf(' const renderSingleSeason=()=>{',podiumStart);
assert.ok(podiumStart>=0&&podiumEnd>podiumStart);
const renderSpecial=new Function('DATA','view','gamesForView','weeklySummary','recordPodiumCard','money','num',
 records.slice(podiumStart,podiumEnd)+';return renderSpecialRecords();');
const podiums=[];
renderSpecial(data,'Regular Season',()=>data.games.filter(g=>g.game_type==='Regular Season'),
 ()=>[{id:1,owner:'Boek',high:1,top3:1}],
 card=>{podiums.push(card);return '';},n=>String(n),n=>Number(n||0));
const highCard=podiums.find(x=>x.title==='HIGHEST SCORING WEEK');
const lowCard=podiums.find(x=>x.title==='LOWEST SCORING WEEK');
assert.equal(highCard.leaders[0].value,280);
assert.ok(highCard.leaders.some(x=>x.game_type==='Playoffs'));
assert.match(highCard.note,/PLAYOFFS/);
assert.ok(lowCard.leaders.every(x=>x.game_type!=='Playoffs'));
// The full leaderboard must include playoff scores in Regular Season mode,
// but the Playoffs view itself stays playoff-only.
const specialSource=segment('async function specialRecord(kind,viewEnc)','function gamesForFranchise(');
assert.ok(specialSource.includes("const allGamesHighest=kind==='teamweeks'&&view==='Regular Season'"));
assert.ok(specialSource.includes('allGamesHighest||'));


// Rank ordering must be #1, T1, #2, T2, #3, T3 in each team list.
const rankStart=app.indexOf('function figTeamSnapshotRankCompare(');
const rankEnd=app.indexOf('function sameRecordValue(',rankStart);
assert.ok(rankStart>0&&rankEnd>rankStart);
const compare=new Function('num',app.slice(rankStart,rankEnd)+';return figTeamSnapshotRankCompare;')(
 n=>Number(n||0));
const values=[
 {rank:3,tied:true,label:'T3'},{rank:1,tied:true,label:'T1'},
 {rank:2,tied:true,label:'T2'},{rank:3,tied:false,label:'#3'},
 {rank:1,tied:false,label:'#1'},{rank:2,tied:false,label:'#2'}
];
assert.deepEqual(values.sort(compare).map(x=>x.label),['#1','T1','#2','T2','#3','T3']);
assert.deepEqual(values.map(x=>({ _rank:x.rank,_tied:x.tied,label:x.label }))
 .reverse().sort(compare).map(x=>x.label),['#1','T1','#2','T2','#3','T3']);
assert.ok(team.includes('figTeamSnapshotRankCompare(a,b)||String(a.label)'));
assert.ok(team.includes('streakUnique.sort((a,b)=>figTeamSnapshotRankCompare(a,b)'));
assert.ok(team.includes('figTeamSnapshotRankCompare(a,b)||num(b.season)'));

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
assert.ok(index.includes('app.js?v=146'));
assert.ok(index.includes('record-break-watch-v133.js?v=139'));
assert.ok(sw.includes('app.js?v=146'));
assert.ok(sw.includes('record-break-watch-v133.js?v=139'));
console.log('Regular-season-only team snapshot, rank ordering, and scoped record views passed.');
