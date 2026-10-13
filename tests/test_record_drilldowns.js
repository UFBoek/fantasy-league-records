/* Regression: every record and streak identity links to specific evidence. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('app.js','utf8');
const boot=source.indexOf("const mb=$('#menuButton');");
assert.ok(boot>0,'main app boot marker must exist');
const root={innerHTML:''};
const document={
 querySelector:selector=>selector==='#app'?root:null,
 querySelectorAll:()=>[],addEventListener(){},getElementById:()=>null,
};
const api=new Function('document','window','location','setInterval','fetch','setTimeout',
 source.slice(0,boot)+
 '\nreturn {DATA,specialRecord,breakdown,recordDetail,streakDetail,singleSeasonRecords,figWeeklyRecordEntries};'
)(document,{addEventListener(){}},{hash:'#/special/highscores/Regular%20Season'},
 ()=>{},()=>{},()=>{});
for(const [key,filename] of [
 ['games','games'],['weeklyRanks','weekly_scoring_ranks'],
 ['standingsCareer','standings_career'],['standingsSeasons','standings_seasons'],
 ['records','records'],['websiteStreaks','website_streaks'],
 ['singleSeasonRecords','single_season_records'],
 ['teamSeasonMaster','team_season_master']]){
 api.DATA[key]=JSON.parse(fs.readFileSync('data/'+filename+'.json','utf8'));
}
api.DATA.playerLog=[];
assert.ok(source.includes("$$('tbody tr[data-href]',t).forEach"),
 'Non-frozen click handler must select ALL rows');
assert.ok(source.includes("leftBody.addEventListener('keydown',keyboardOpen)"),
 'Frozen click handler should also support keyboard access');
assert.ok(source.includes('fig-team-stat-link'),'Career stats must be navigable');
assert.ok(source.includes('figArchivedGameLink(x.season,x.week,x.franchise_id)'),
 'Player performance records must link to their source games');
(async()=>{
 await api.specialRecord('highscores','Regular%20Season');
 assert.match(root.innerHTML, /fig-owner-link fig-owner-drilldown/);
 for(const id of [1,6]){
  const href='#/breakdown/weekly/highscores/Regular%20Season/'+id;
  assert.ok(root.innerHTML.includes('href="'+href+'"'),'Weekly highs owner '+id+' should open breakdown');
  const expected=api.DATA.weeklyRanks.filter(x=>Number(x.franchise_id)===id&&x.weekly_high_score===true).length;
  const rows=api.figWeeklyRecordEntries(api.DATA.weeklyRanks,api.DATA.games,id,true);
  assert.equal(rows.length,expected);
  assert.ok(rows.every(x=>x.matchup),'Every qualifying score should have a real matchup');
  await api.breakdown('weekly','highscores','Regular%20Season',String(id));
  const games=(root.innerHTML.match(/VIEW GAME →/g)||[]).length;
  assert.equal(games,expected,'Every qualifying score needs a game link');
 }
 await api.breakdown('weekly','top3','Regular%20Season','6');
 assert.equal((root.innerHTML.match(/VIEW GAME →/g)||[]).length,
  api.DATA.weeklyRanks.filter(x=>Number(x.franchise_id)===6&&x.weekly_top_3===true).length);
 await api.recordDetail('team','Career 125+ Point Games','Regular%20Season');
 assert.match(root.innerHTML,/fig-owner-link fig-owner-drilldown/);
 await api.streakDetail('Winning','Career%20Games');
 assert.match(root.innerHTML,/fig-owner-link fig-owner-drilldown/);
 const seasons=new Set(api.DATA.teamSeasonMaster.filter(x=>x.season_complete===true).map(x=>String(x.season)));
 if(seasons.size){
  const first=api.DATA.singleSeasonRecords.find(x=>seasons.has(String(x.season))&&x.record_category&&Number(x.value)>0);
  if(first){
   await api.singleSeasonRecords(encodeURIComponent(first.record_category));
   assert.match(root.innerHTML,/fig-owner-link fig-owner-drilldown/);
  }
 }
 console.log('Record, streak and per-week matchup drilldown regression checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
