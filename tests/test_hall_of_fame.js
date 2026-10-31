'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'data',p+'.json'),'utf8'));
const api=new Function('window',fs.readFileSync(path.join(root,'hall-of-fame-v244.js'),'utf8')+'\nreturn window.figHallOfFameModel;')({});
const data={league:read('league_history'),games:read('games'),playerLog:read('player_game_log'),
 teamSeasonMaster:read('team_season_master'),singleSeasonRecords:read('single_season_records'),
 websiteStreaks:read('website_streaks')};
const m=api.model(data);
const ids=['4984','9221','9493','8130'];
assert.deepEqual(m.foundingYears,[2023,2024,2025],'Founding era is three completed seasons');
assert.equal(m.classes.length,1,'New classes are deliberate and must never be auto-created');
assert.equal(m.classes[0].year,2026);
assert.deepEqual(m.inductees.map(x=>x.id),ids,'Allen Gibbs Puka McBride founding four');
assert.deepEqual(m.inductees.map(x=>x.name),['Josh Allen','Jahmyr Gibbs','Puka Nacua','Trey McBride']);
assert.deepEqual(m.inductees.map(x=>x.position),['QB','RB','WR','TE']);
assert.ok(m.inductees.every(x=>x.proof.ok),'Induction registry candidates must have verifiable founding-era historical records');
assert.ok(m.inductees.every(x=>x.inductionYear===2026));
assert.ok(m.inductees.every(x=>x.career.seasons.some(s=>s.year===2025&&s.starts>0)));
assert.ok(m.inductees.every(x=>x.career.seasons.length===3));
assert.ok(m.inductees.every(x=>x.why===undefined),'Curation is explained by the induction case, not an auto-generated weighted point formula');
assert.ok(!('legacy' in m)&&!('vault' in m),'Historic Feats and Legacy Points must be entirely removed from Hall model');
assert.equal(m.enshrinedSeasons.length,1,'Exactly one independently curated immortal season');
const historical=m.enshrinedSeasons[0];
assert.deepEqual([historical.franchiseId,historical.year,historical.inductionYear],[6,2025,2026]);
assert.equal(historical.record.points_for,3000.13);
assert.equal(historical.record.weekly_high_scores,7);
assert.equal(historical.championship.winner_franchise_id,6);
assert.equal(historical.url,'#/hall-of-fame/inductee/season/6/2025');
const records=historical.honors.records,streaks=historical.honors.streaks;
assert.equal(records.length,7,'All seven published top-three single-season records are highlighted');
assert.deepEqual(records.map(r=>r.rank).sort(),[1,1,1,1,1,1,3]);
assert.deepEqual(records.map(r=>r.category).sort(),[
 'All-Play Win Percentage','Max PF','Point Differential','Points For',
 'Weekly High Scores','Weekly Top-3 Finishes','Wins'].sort());
assert.ok(streaks.length>=10,'All eligible career-game streaks overlapping 2025 are shown');
assert.ok(streaks.every(x=>x.startYear<=2025&&x.endYear>=2025),'Cross-year streaks must overlap enshrined season');
assert.ok(streaks.every(x=>!['100+ Points','125+ Points','150+ Points'].includes(x.type)));
assert.ok(streaks.every(x=>!['Losing','Below Median'].includes(x.type)));
assert.ok(streaks.some(x=>x.type==='175+ Points'&&x.length===16&&x.startYear===2024&&x.endYear===2025));
assert.ok(streaks.some(x=>x.type==='175+ Points'&&x.active&&x.endYear===2026),
 'Active streaks extending beyond the enshrined season must count');
assert.ok(streaks.some(x=>x.type==='Above Median'&&x.active&&x.endYear===2026));
const additionalStreak={franchise_id:6,streak_mode:'Career Games',streak_type:'225+ Points',
 length:5,start_season:'2025',start_week:12,end_season:'2026',end_week:9,active:true};
const altered=api.model({...data,websiteStreaks:[...data.websiteStreaks,additionalStreak]});
assert.ok(altered.enshrinedSeasons[0].honors.streaks.some(x=>x.type==='225+ Points'&&x.active&&x.endWeek===9),
 'New verified ongoing streaks must flow into the enshrined exhibit');
assert.deepEqual(altered.inductees.map(x=>x.id),m.inductees.map(x=>x.id));
for(const id of ids){const r=m.inductees.find(x=>x.id===id);assert.ok(r?.url.endsWith('/'+id));}
const saved=m.inductees.map(x=>({id:x.id,year:x.inductionYear}));
const future={...data,league:[...data.league,{season:2027,status:'complete'}],
 playerLog:[...data.playerLog,{season:'2027',week:1,position:'RB',player_id:'123456',player_name:'Future star',starter_points:800,franchise_id:1}]};
assert.deepEqual(api.model(future).inductees.map(x=>({id:x.id,year:x.inductionYear})),saved,
 'Future seasons and stars cannot rewrite the founding class');
const selected=data.playerLog.filter(x=>String(x.player_id)==='9221'&&+x.season<=2025);
assert.ok(selected.length>20);
const thin={...data,playerLog:data.playerLog.filter(x=>String(x.player_id)!=='9221'||(+x.season===2025&&+x.week===12))};
assert.equal(api.model(thin).inductees.find(x=>x.id==='9221')?.id,'9221',
 'An arbitrary number of fantasy lineup starts cannot be an eligibility gate');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'hall-of-fame-v244.css'),'utf8');
const js=fs.readFileSync(path.join(root,'hall-of-fame-v244.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.match(html,/hall-of-fame-v243\.js\?v=244/);
assert.match(html,/hall-of-fame-v243\.css\?v=244/);
assert.match(sw,/fig-league-shell-v244/);
assert.match(sw,/hall-of-fame-v243\.js\?v=244/);
assert.match(sw,/hall-of-fame-v243\.css\?v=244/);
assert.match(app,/parts\[0\]==='hall-of-fame'/);
assert.doesNotMatch(js,/function legacy\(/);
assert.doesNotMatch(js,/function vault\(/);
assert.doesNotMatch(js,/function recordsPage\(/);
assert.doesNotMatch(js,/function legacyPage\(/);
assert.doesNotMatch(js,/starts>=28|p\.avg>=30|p\.avg>=24|p\.points>=950/);
assert.match(css,/fig-hof-243-season-card/);
assert.match(css,/@media\(max-width:699px\)/);
assert.doesNotMatch(js,/Greatness is not a leaderboard\./);
assert.doesNotMatch(js,/VIEW THE FOUNDING CLASS/);
assert.doesNotMatch(js,/fig-hof-242-stats/);
assert.match(js,/immortalSeasonCard\(m\)/);
assert.match(js,/seasonHonorsSections\(e\)/);
assert.doesNotMatch(js,/—/);
assert.doesNotMatch(fs.readFileSync(path.join(root,'app.js'),'utf8'),/—/);
assert.doesNotMatch(html,/—/);
assert.match(js,/isCharter\?charter\(m\):lobby\(m\)/);
console.log('FIG Hall founding-four verified',JSON.stringify({
 year:m.classes[0].year,founding:m.inductees.map(x=>[x.position,x.name,x.career.starts]),years:m.foundingYears,
 legacyRemoved:!('legacy' in m),historicFeatsRemoved:!('vault' in m)
}));
