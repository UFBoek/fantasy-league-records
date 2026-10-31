'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'data',p+'.json'),'utf8'));
const api=new Function('window',fs.readFileSync(path.join(root,'hall-of-fame-v244.js'),'utf8')+'\nreturn window.figHallOfFameModel;')({});
const data={league:read('league_history'),games:read('games'),playerLog:read('player_game_log'),
 playerSeasons:read('player_seasons'),
 teamSeasonMaster:read('team_season_master'),singleSeasonRecords:read('single_season_records'),
 websiteStreaks:read('website_streaks')};
const m=api.model(data);
const ids=['4984','9493'];
assert.deepEqual(m.foundingYears,[2023,2024,2025],'Founding era is three completed seasons');
assert.equal(m.classes.length,1,'New classes are deliberate and must never be auto-created');
assert.equal(m.classes[0].year,2026);
assert.deepEqual(m.inductees.map(x=>x.id),ids,'Allen and Puka are the only founding inductees');
assert.deepEqual(m.inductees.map(x=>x.name),['Josh Allen','Puka Nacua']);
assert.deepEqual(m.inductees.map(x=>x.position),['QB','WR']);
assert.equal(m.classes[0].title,'The Founding Two');
assert.equal(m.inductees.find(x=>x.id==='9493').nickname,'THE LOGO');
assert.match(m.inductees.find(x=>x.id==='9493').case,/face of FIG/);
assert.match(m.inductees.find(x=>x.id==='4984').case,/30 combined PPG/);
assert.ok(!m.inductees.some(x=>['9221','8130'].includes(x.id)),
 'Gibbs and McBride remain ordinary FIG player archive members, not enshrined');
assert.ok(m.inductees.every(x=>x.proof.ok),'Induction registry candidates must have verifiable founding-era historical records');
assert.ok(m.inductees.every(x=>x.inductionYear===2026));
assert.ok(m.inductees.every(x=>x.career.seasons.some(s=>s.year===2025&&s.starts>0)));
assert.ok(m.inductees.every(x=>x.career.seasons.length===3));
assert.ok(m.inductees.every(x=>x.why===undefined),'Curation is explained by the induction case, not an auto-generated weighted point formula');
// Hall season averages must match the published All-Time Combined player archive
// exactly, including postseason starts and the original rounding convention.
const historicalPlayers=api.playerCareers(data,m.foundingYears).byId;
for(const playerId of [...ids,'4034']){
 const p=historicalPlayers.get(playerId);
 assert.ok(p,'Player available for historical scoring audit: '+playerId);
 for(const s of p.seasons){
  const official=data.playerSeasons.find(x=>String(x.player_id)===playerId&&
   Number(x.season)===s.year&&x.scoring_view==='All-Time Combined');
  assert.ok(official,'All-Time Combined archive season exists: '+p.name+' '+s.year);
  assert.equal(s.starts,official.starts,p.name+' '+s.year+' total starts include playoffs');
  assert.ok(Math.abs(s.points-official.total_points)<0.02,p.name+' '+s.year+' combined points');
  assert.equal(s.ppg,official.average_points,p.name+' '+s.year+' precise combined PPG');
 }
}
const cmc=historicalPlayers.get('4034');
assert.equal(cmc.seasons.find(s=>s.year===2025).ppg,28.58);
assert.equal(cmc.seasons.find(s=>s.year===2023).ppg,26.31);
assert.equal(m.inductees.find(x=>x.id==='9493').career.seasons.find(s=>s.year===2024).ppg,20.94,
 'Published 2024 Puka average must not round to an inconsistent 20.95');
assert.ok(data.playerSeasons.some(x=>String(x.player_id)==='4034'&&x.season==='2025'&&
 x.scoring_view==='Regular Season'&&x.average_points===27.47),'Regular season remains a separate scoring view');

assert.ok(!('legacy' in m)&&!('vault' in m),'Historic Feats and Legacy Points must be entirely removed from Hall model');
assert.equal(m.enshrinedSeasons.length,1,'Exactly one independently curated immortal season');
const historical=m.enshrinedSeasons[0];
assert.deepEqual([historical.franchiseId,historical.year,historical.inductionYear],[6,2025,2026]);
assert.equal(historical.record.points_for,3000.13);
assert.equal(historical.record.weekly_high_scores,7);
assert.equal(historical.championship.winner_franchise_id,6);
assert.equal(historical.url,'#/hall-of-fame/inductee/season/6/2025');
const records=historical.honors.records, get=cat=>records.find(x=>x.category===cat);
assert.ok(records.length>=18,'Full season record profile includes ranks outside the top three');
for(const [cat,rank,n,tie] of [['40 BOMBS',1,7,true],['50 BOMBS',1,5,false],['30 BOMBS',1,19,true],['20 BOMBS',3,40,true],['200+ Point Games',2,8,false],['225+ Point Games',1,5,true],['250+ Point Games',1,3,true],['Highest Weekly Score',1,290.25,false]]){
 const r=get(cat);assert.ok(r,cat);assert.deepEqual([r.rank,r.value,r.tied],[rank,n,tie],cat);
}
assert.ok(!('streaks' in historical.honors));
assert.ok(records.every(r=>r.rank>=1&&r.value>0));
assert.equal(get('Median Score').value,206.135);
assert.ok(get('Median Score').rank>=1);
assert.ok(get('Losses').rank>3,'All-season records include non-podium metrics');
assert.ok(records.some(r=>r.rank>3),'Non-podium rankings are displayed');
assert.ok(get('Losses'),'Full season history includes losses, though not in notable honors');
assert.ok(get('Losses').rank>3);
assert.equal(historical.playoff.label,'FIG Champion');
assert.equal(historical.playoff.summary,'Won the FIG championship');
const rankedGames=data.games.filter(g=>['Regular Season','Playoffs'].includes(g.game_type))
 .flatMap(g=>[1,2].map(side=>({points:Number(g['score_'+side]),id:Number(g['franchise_'+side]),year:Number(g.season),week:Number(g.week)})))
 .filter(g=>g.points>0).sort((a,b)=>b.points-a.points);
let previousPoints=null,scoringRank=0;
const allRanked=rankedGames.map((g,i)=>{
 if(previousPoints===null||Math.abs(g.points-previousPoints)>0.000001)scoringRank=i+1;
 previousPoints=g.points;return {...g,rank:scoringRank};
});
const expectedTop=allRanked.filter(g=>g.rank<=25&&g.year===2025&&g.id===6);
assert.deepEqual(historical.topGames.map(g=>[g.week,g.points,g.rank]),
 expectedTop.map(g=>[g.week,g.points,g.rank]),
 'Immortal season must include every all-time top-25 weekly score, including ties');
assert.ok(historical.topGames.every(g=>g.rank<=25));
assert.equal(historical.topGames.some(g=>g.rank>10),expectedTop.some(g=>g.rank>10),
 'Scores ranked outside the old top 10 must remain in the top-25 exhibit');
assert.equal(historical.topGames.some(g=>g.week===17&&g.playoffs),
 expectedTop.some(g=>g.week===17),
 'Championship-week scores must be included whenever they rank in the top 25');
assert.ok(!get('150+ Point Games'),'150+ is a team scoring statistic, not a single-season record');
const altered=api.model({...data,playerLog:[...data.playerLog,
 {season:'2025',week:13,franchise_id:6,game_type:'Regular Season',starter_points:55}]});
assert.equal(altered.enshrinedSeasons[0].honors.records.find(r=>r.category==='50 BOMBS').value,6);
assert.deepEqual(altered.inductees.map(x=>x.id),m.inductees.map(x=>x.id));
for(const id of ids){const r=m.inductees.find(x=>x.id===id);assert.ok(r?.url.endsWith('/'+id));}
const saved=m.inductees.map(x=>({id:x.id,year:x.inductionYear}));
const future={...data,league:[...data.league,{season:2027,status:'complete'}],
 playerLog:[...data.playerLog,{season:'2027',week:1,position:'RB',player_id:'123456',player_name:'Future star',starter_points:800,franchise_id:1}]};
assert.deepEqual(api.model(future).inductees.map(x=>({id:x.id,year:x.inductionYear})),saved,
 'Future seasons and stars cannot rewrite the founding class');
const selected=data.playerLog.filter(x=>String(x.player_id)==='9493'&&+x.season<=2025);
assert.ok(selected.length>20);
const thin={...data,playerLog:data.playerLog.filter(x=>String(x.player_id)!=='9493'||(+x.season===2025&&+x.week===12))};
assert.equal(api.model(thin).inductees.find(x=>x.id==='9493')?.id,'9493',
 'An arbitrary number of fantasy lineup starts cannot be an eligibility gate');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'hall-of-fame-v244.css'),'utf8');
const js=fs.readFileSync(path.join(root,'hall-of-fame-v244.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.match(html,/hall-of-fame-v244\.js\?v=253/);
assert.match(html,/hall-of-fame-v244\.css\?v=248/);
assert.match(html,/hall-of-fame-v242\.css\?v=253/);
assert.match(sw,/fig-league-shell-v253/);
assert.match(sw,/hall-of-fame-v244\.js\?v=253/);
assert.match(sw,/hall-of-fame-v244\.css\?v=248/);
assert.match(app,/parts\[0\]==='hall-of-fame'/);
assert.doesNotMatch(js,/function legacy\(/);
assert.doesNotMatch(js,/function vault\(/);
assert.doesNotMatch(js,/function recordsPage\(/);
assert.doesNotMatch(js,/function legacyPage\(/);
assert.doesNotMatch(js,/starts>=28|p\.avg>=30|p\.avg>=24|p\.points>=950/);
assert.match(css,/fig-hof-244-record-grid/);
assert.match(css,/fig-hof-247-notable-tags/);
assert.match(css,/fig-hof-247-game-grid/);
assert.doesNotMatch(js,/THE CASE FOR ENSHRINEMENT/);
assert.doesNotMatch(js,/THE SEASON LEGACY/);
assert.match(js,/seasonTopScoringGames/);
assert.match(js,/Top-25 scoring games/);
assert.match(js,/top-25 all-time scoring game/);
assert.match(js,/scoring_view==='All-Time Combined'/);
assert.match(js,/COMBINED CAREER PPG/);
assert.match(js,/COMBINED PPG/);
assert.match(js,/STATISTICAL SCOPE · ALL-TIME COMBINED/);
assert.ok(js.includes("playerLog','playerSeasons"),'Hall loads the canonical combined season archive');
assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Spacious two-column Hall record layout');
assert.ok(css.includes('min-height:260px'),'Roomy season record panels');
assert.doesNotMatch(css,/fig-hof-244-streak-list/);
assert.match(css,/@media\(max-width:699px\)/);
assert.doesNotMatch(js,/Greatness is not a leaderboard\./);
assert.doesNotMatch(js,/VIEW THE FOUNDING CLASS/);
assert.doesNotMatch(js,/fig-hof-242-stats/);
assert.match(js,/immortalSeasonCard\(m\)/);
assert.match(js,/seasonHonorsSections\(e\)/);
assert.doesNotMatch(js,/THE STREAK LEDGER/);
assert.doesNotMatch(js,/—/);
assert.doesNotMatch(fs.readFileSync(path.join(root,'app.js'),'utf8'),/—/);
assert.doesNotMatch(html,/—/);
assert.doesNotMatch(js,/function charter\(/);
assert.doesNotMatch(js,/Induction Philosophy|THE FIG INDUCTION PHILOSOPHY|THE CHARTER|HOW WE SELECT THE HALL/i);
assert.doesNotMatch(js,/#\/hall-of-fame\/charter/);
assert.match(js,/nickname:'THE LOGO'/);
const layout=fs.readFileSync(path.join(root,'hall-of-fame-v242.css'),'utf8');
assert.match(layout,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(layout,/grid-template-columns:1fr;max-width:490px/);
console.log('FIG Hall founding-two verified',JSON.stringify({
 year:m.classes[0].year,founding:m.inductees.map(x=>[x.position,x.name,x.career.starts]),years:m.foundingYears,
 legacyRemoved:!('legacy' in m),historicFeatsRemoved:!('vault' in m)
}));
