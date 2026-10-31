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
const records=historical.honors.records, get=cat=>records.find(x=>x.category===cat);
assert.ok(records.length>=16,'All positive top-three season honors appear');
for(const [cat,rank,n,tie] of [['40 BOMBS',1,7,true],['50 BOMBS',1,5,false],['30 BOMBS',1,19,true],['20 BOMBS',3,40,true],['200+ Point Games',2,8,false],['225+ Point Games',1,5,true],['250+ Point Games',1,3,true],['Highest Weekly Score',1,290.25,false]]){
 const r=get(cat);assert.ok(r,cat);assert.deepEqual([r.rank,r.value,r.tied],[rank,n,tie],cat);
}
assert.ok(!('streaks' in historical.honors));
assert.ok(records.every(r=>r.rank<=3&&r.value>0));
assert.ok(!get('Losses'));
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
assert.match(html,/hall-of-fame-v244\.js\?v=246/);
assert.match(html,/hall-of-fame-v244\.css\?v=246/);
assert.match(sw,/fig-league-shell-v246/);
assert.match(sw,/hall-of-fame-v244\.js\?v=246/);
assert.match(sw,/hall-of-fame-v244\.css\?v=246/);
assert.match(app,/parts\[0\]==='hall-of-fame'/);
assert.doesNotMatch(js,/function legacy\(/);
assert.doesNotMatch(js,/function vault\(/);
assert.doesNotMatch(js,/function recordsPage\(/);
assert.doesNotMatch(js,/function legacyPage\(/);
assert.doesNotMatch(js,/starts>=28|p\.avg>=30|p\.avg>=24|p\.points>=950/);
assert.match(css,/fig-hof-244-record-grid/);
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
assert.match(js,/isCharter\?charter\(m\):lobby\(m\)/);
console.log('FIG Hall founding-four verified',JSON.stringify({
 year:m.classes[0].year,founding:m.inductees.map(x=>[x.position,x.name,x.career.starts]),years:m.foundingYears,
 legacyRemoved:!('legacy' in m),historicFeatsRemoved:!('vault' in m)
}));
