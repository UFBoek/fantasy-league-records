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
// The live eligibility watch ranks eligible starter-season averages, not total points.
const watch=api.hallEligibilityWatch(data);
assert.deepEqual(watch.years,[2023,2024,2025]);
assert.equal(watch.contenders.length,36,'Include the 34 watch candidates plus both founding inductees');
const nonFounders=watch.contenders.filter(p=>!p.foundingClass);
assert.equal(nonFounders.length,34,'Founders do not displace or duplicate other watch candidates');
assert.deepEqual(watch.contenders.slice(0,2).map(p=>p.name),['Josh Allen','Puka Nacua']);
assert.deepEqual(watch.contenders.filter(p=>p.foundingClass).map(p=>p.id),['4984','9493']);
assert.deepEqual(watch.contenders.find(p=>p.id==='4984').counts,[3,2,3,3,3]);
assert.deepEqual(watch.contenders.find(p=>p.id==='9493').counts,[2,1,3,3,3]);
assert.ok(watch.contenders.filter(p=>p.foundingClass).every(p=>p.eligible&&p.met===3),
 'Inducted founders independently meet three of five completed-season benchmarks');
const addedWatchPlayers={
 '9488':'Jaxon Smith-Njigba','9226':"De'Von Achane",'11632':'Malik Nabers',
 '11564':'Drake Maye','11566':'Jayden Daniels','11560':'Caleb Williams',
 '3163':'Jared Goff','6794':'Justin Jefferson','6813':'Jonathan Taylor',
 '8138':'James Cook III',
 '8183':'Brock Purdy','6770':'Joe Burrow','8150':'Kyren Williams',
 '12527':'Ashton Jeanty','8137':'George Pickens','9758':'C.J. Stroud',
 '8151':'Kenneth Walker III','6801':'Tee Higgins','12526':'Tetairoa McMillan',
 '6804':'Jordan Love','7523':'Trevor Lawrence','9228':'Bryce Young'
};
for(const [id,name] of Object.entries(addedWatchPlayers)){
 const p=watch.contenders.find(player=>player.id===id);
 assert.ok(p,'User-selected watch candidate must remain visible: '+name);
 assert.equal(p.name,name,'Use the official published player name: '+name);
 assert.equal(p.counts.length,5,'Every addition has five honest calculated progress cells');
}
const excludedWatchPlayers={
 '3321':'Tyreek Hill','8112':'Drake London','9997':'Zay Flowers','8144':'Chris Olave',
 '5859':'A.J. Brown','4035':'Alvin Kamara','3198':'Derrick Henry',
 '4866':'Saquon Barkley','1466':'Travis Kelce'
};
for(const [id,name] of Object.entries(excludedWatchPlayers))
 assert.ok(!watch.contenders.some(p=>p.id===id||p.name===name),
  'Removed player must not return in the Hall watch: '+name);
const newlyAddedProgress={
 '8183':[0,0,2,2,2],'6770':[1,0,1,1,1],'8150':[1,0,1,2,2],
 '12527':[0,0,0,0,1],'8137':[1,0,1,1,1],'9758':[1,0,1,1,1],
 '8151':[0,0,0,1,0],'6801':[1,0,1,1,2],'12526':[0,0,0,0,1],
 '6804':[0,0,0,0,0],'7523':[0,0,0,0,1],'9228':[0,0,0,0,0]
};
for(const [id,counts] of Object.entries(newlyAddedProgress))
 assert.deepEqual(watch.contenders.find(p=>p.id===id)?.counts,counts,
  'All newly watched players must have accurate completed-season milestones: '+id);
assert.deepEqual(watch.contenders.find(p=>p.id==='9488').counts,[1,0,1,1,1],
 'JSN 2025 qualifies as an elite top-two WR season, but not a full benchmark');
assert.deepEqual(watch.contenders.find(p=>p.id==='8138').counts,[0,0,1,2,2],
 'James Cook has qualifying 2024 and 2025 PPG and two top-twelve RB finishes');
assert.equal(watch.contenders.find(p=>p.id==='8138').targets[4],5,
 'James Cook career consistency progress is measured against five complete seasons');
assert.deepEqual(watch.contenders.find(p=>p.id==='3163').counts,[0,0,2,2,2],
 'Jared Goff progress uses completed FIG seasons and current thresholds');
assert.deepEqual(watch.contenders.find(p=>p.id==='6794').counts,[1,0,1,1,1],
 'Justin Jefferson 2023 has fewer than nine starts and is excluded');
assert.deepEqual(watch.contenders.find(p=>p.id==='6813').counts,[1,0,1,1,1],
 'Jonathan Taylor 2023 had fewer than nine starts and does not count');
assert.equal(nonFounders[0].name,"Ja'Marr Chase",
 'One positional championship completes requirement two and moves Chase up the watchlist');
assert.deepEqual(nonFounders[0].counts,[2,1,2,3,3]);
const cmcWatch=watch.contenders.find(p=>p.name==='Christian McCaffrey');
const mcbride=watch.contenders.find(p=>p.name==='Trey McBride');
assert.deepEqual(cmcWatch.counts,[2,2,2,2,2]);
assert.deepEqual(mcbride.counts,[2,2,2,2,2]);
assert.deepEqual(cmcWatch.targets,[2,1,3,4,5]);
assert.equal(cmcWatch.met,2,'Two positional #1 seasons still count as only one benchmark');
assert.equal(mcbride.met,2,'Two TE positional championships count as only one benchmark');
assert.equal(nonFounders[0].met,2,'Single WR title is sufficient for #2, but not for overall nomination');
const lamar=watch.contenders.find(p=>p.name==='Lamar Jackson');
assert.equal(lamar.counts[1],1,'Lamar has one #1 QB season');
assert.equal(lamar.targets[1],1,'One #1 season satisfies positional supremacy');
assert.equal(lamar.met,1,'One positional championship is not automatic nomination');
assert.ok(!nonFounders.some(p=>p.eligible),'Future candidates must still satisfy three of five');
assert.ok(watch.contenders.filter(p=>['4984','9493'].includes(p.id)).every(p=>p.foundingClass),
 'Both founders must be labeled as already inducted, not presented as future nominees');
assert.ok(watch.contenders.every(p=>p.met===p.counts.filter((n,i)=>n>=p.targets[i]).length));
assert.ok(watch.contenders.every(p=>p.seasons.every(y=>y.starts>=9&&y.year<=2025)),
 'Partial seasons or below-nine-start averages cannot be considered');
const sampleRows=[
 {player_id:'a',full_name:'High Average',position:'QB',season:'2025',
  starts:9,average_points:28,total_points:252,scoring_view:'All-Time Combined',season_complete:true},
 {player_id:'b',full_name:'Higher Total',position:'QB',season:'2025',
  starts:15,average_points:25,total_points:375,scoring_view:'All-Time Combined',season_complete:true},
 {player_id:'c',full_name:'Short Sample',position:'QB',season:'2025',
  starts:8,average_points:99,total_points:792,scoring_view:'All-Time Combined',season_complete:true},
 {player_id:'d',full_name:'Same Average',position:'QB',season:'2025',
  starts:10,average_points:28,total_points:280,scoring_view:'All-Time Combined',season_complete:true},
 {player_id:'e',full_name:'Not Combined',position:'QB',season:'2025',
  starts:15,average_points:70,total_points:1050,scoring_view:'Regular Season',season_complete:true},
 {player_id:'f',full_name:'Incomplete',position:'QB',season:'2026',
  starts:15,average_points:80,total_points:1200,scoring_view:'All-Time Combined',season_complete:false}
];
const sampleWatch=api.hallEligibilityWatch({league:data.league,playerSeasons:sampleRows});
assert.equal(sampleWatch.all.find(p=>p.id==='a').seasons[0].rank,1);
assert.equal(sampleWatch.all.find(p=>p.id==='d').seasons[0].rank,1,'Equal PPG receives tied rank');
assert.equal(sampleWatch.all.find(p=>p.id==='b').seasons[0].rank,3,
 'Higher total points cannot beat higher PPG in position ranking');
assert.ok(!sampleWatch.all.some(p=>['c','e','f'].includes(p.id)),
 'Below-nine, non-combined and incomplete rows must not enter rankings');
// QB career consistency counts a ninth- or tenth-ranked qualified season but not eleventh.
const qbRankSample=Array.from({length:11},(_,i)=>({
 player_id:'rank-'+(i+1),full_name:'QB Rank '+(i+1),position:'QB',
 season:'2025',starts:9,average_points:35-i,total_points:9*(35-i),
 scoring_view:'All-Time Combined',season_complete:true
}));
const qbRankWatch=api.hallEligibilityWatch({league:data.league,playerSeasons:qbRankSample});
assert.equal(qbRankWatch.all.find(p=>p.id==='rank-9').counts[4],1);
assert.equal(qbRankWatch.all.find(p=>p.id==='rank-10').counts[4],1,
 'QB10 now earns one top-10 qualifying season');
assert.equal(qbRankWatch.all.find(p=>p.id==='rank-11').counts[4],0,
 'QB11 does not earn a top-10 qualifying season');
// The new PPG floors apply at the boundary in both the matrix and watch calculations.
const floorTest=[
 ['RB',17,1],['RB',16.99,0],['WR',17,1],['WR',16.99,0],
 ['TE',14,1],['TE',13.99,0],['QB',25,1],['QB',24.99,0]
].map(([position,ppg,expected],i)=>({
 player_id:'floor-'+i,full_name:'Floor '+i,position,season:'2025',
 starts:9,average_points:ppg,total_points:ppg*9,
 scoring_view:'All-Time Combined',season_complete:true
}));
const floorWatch=api.hallEligibilityWatch({league:data.league,playerSeasons:floorTest});
for(let i=0;i<floorTest.length;i++){
 const p=floorWatch.all.find(p=>p.id==='floor-'+i);
 assert.equal(p.counts[3],i%2===0?1:0,
  floorTest[i].position+' threshold must use updated required PPG');
}
// Three completed #1 seasons satisfy benchmarks 1, 2 and 3, not 4 or 5.
const peakThree=['2023','2024','2025'].map(year=>({
 player_id:'dominant-qb',full_name:'Three Season QB',position:'QB',
 season:year,starts:9,average_points:30,total_points:270,
 scoring_view:'All-Time Combined',season_complete:true
}));
const peakWatch=api.hallEligibilityWatch({league:data.league,playerSeasons:peakThree});
const peakPlayer=peakWatch.all.find(p=>p.id==='dominant-qb');
assert.deepEqual(peakPlayer.counts,[3,3,3,3,3]);
assert.equal(peakPlayer.met,3,'Three distinct milestones can be completed without four total seasons');
assert.equal(peakPlayer.eligible,true,'Three of five must now qualify for nomination');
assert.ok(watch.contenders.every(p=>p.eligible===(p.met>=3)),
 'All watch eligibility flags must use three-of-five');
// Verify all new rank thresholds precisely; TE exceptions remain unchanged.
const rankBoundaries=[
 ...['QB','RB','WR'].flatMap(position=>Array.from({length:13},(_,i)=>({
  player_id:'rank-'+position+'-'+(i+1),full_name:position+' Rank '+(i+1),position,
  season:'2025',starts:9,average_points:35-i,total_points:(35-i)*9,
  scoring_view:'All-Time Combined',season_complete:true
 }))),
 ...Array.from({length:4},(_,i)=>({
  player_id:'rank-TE-'+(i+1),full_name:'TE Rank '+(i+1),position:'TE',
  season:'2025',starts:9,average_points:23-i,total_points:(23-i)*9,
  scoring_view:'All-Time Combined',season_complete:true
 }))
];
const rankWatch=api.hallEligibilityWatch({league:data.league,playerSeasons:rankBoundaries});
const getRank=(pos,rank)=>rankWatch.all.find(p=>p.id==='rank-'+pos+'-'+rank);
for(const pos of ['QB','RB','WR']){
 assert.equal(getRank(pos,4).counts[0],1,pos+' rank 4 qualifies for elite production');
 assert.equal(getRank(pos,5).counts[0],0,pos+' rank 5 does not qualify for elite production');
 assert.equal(getRank(pos,8).counts[2],1,pos+' rank 8 counts toward sustained dominance');
 assert.equal(getRank(pos,9).counts[2],0,pos+' rank 9 does not count toward sustained dominance');
}
for(const pos of ['RB','WR']){
 assert.equal(getRank(pos,12).counts[4],1,pos+' rank 12 earns a career consistency season');
 assert.equal(getRank(pos,13).counts[4],0,pos+' rank 13 cannot earn a career consistency season');
}
assert.equal(getRank('QB',10).counts[4],1,'QB rank 10 still qualifies for consistency');
assert.equal(getRank('QB',11).counts[4],0,'QB rank 11 still fails consistency');
assert.equal(getRank('TE',2).counts[0],1,'TE rank 2 remains elite');
assert.equal(getRank('TE',3).counts[0],0,'TE rank 3 does not meet elite rank');
assert.equal(getRank('TE',3).counts[2],1,'TE rank 3 remains dominant');
assert.equal(getRank('TE',4).counts[2],0,'TE rank 4 does not meet dominance');
assert.equal(getRank('TE',3).counts[4],1,'TE rank 3 remains consistent');
assert.equal(getRank('TE',4).counts[4],0,'TE rank 4 does not meet consistency');
// Career consistency needs five complete qualifying seasons, not four.
const futureLeague=[...data.league,{season:'2026',status:'complete'},{season:'2027',status:'complete'}];
const fiveYears=['2023','2024','2025','2026','2027'].map(season=>({
 player_id:'five-year-qb',full_name:'Five-Year Quarterback',position:'QB',season,
 starts:10,average_points:26,total_points:260,
 scoring_view:'All-Time Combined',season_complete:true
}));
const fiveWatch=api.hallEligibilityWatch({league:futureLeague,playerSeasons:fiveYears});
const fivePlayer=fiveWatch.all.find(p=>p.id==='five-year-qb');
assert.equal(fivePlayer.counts[4],5,'Fifth qualified season must complete career consistency');
assert.equal(fivePlayer.targets[4],5,'Career consistency target is five completed seasons');
assert.equal(fivePlayer.met,5,'Five top-ten seasons can satisfy all five benchmarks');
const fourWatch=api.hallEligibilityWatch({league:futureLeague,playerSeasons:fiveYears.slice(0,4)});
const fourPlayer=fourWatch.all.find(p=>p.id==='five-year-qb');
assert.equal(fourPlayer.counts[4],4,'Four seasons show four-of-five progress');
assert.equal(fourPlayer.met,4,'Four qualifying seasons do not satisfy benchmark five');
const threeWatch=api.hallEligibilityWatch({league:data.league,playerSeasons:fiveYears});
assert.equal(threeWatch.all.find(p=>p.id==='five-year-qb').counts[4],3,
 'Incomplete league seasons cannot count toward benchmark five');
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
assert.match(html,/hall-of-fame-v244\.js\?v=272/);
assert.match(html,/hall-of-fame-v244\.css\?v=252/);
assert.match(html,/hall-of-fame-v242\.css\?v=253/);
assert.match(sw,/fig-league-shell-v\d+/);
assert.match(sw,/hall-of-fame-v244\.js\?v=272/);
assert.match(sw,/hall-of-fame-v244\.css\?v=252/);
assert.match(app,/parts\[0\]==='hall-of-fame'/);
assert.doesNotMatch(js,/function legacy\(/);
assert.doesNotMatch(js,/function vault\(/);
assert.doesNotMatch(js,/function recordsPage\(/);
assert.doesNotMatch(js,/function legacyPage\(/);
assert.doesNotMatch(js,/starts>=28|p\.avg>=30|p\.avg>=24|p\.points>=950/);
assert.ok(js.includes('function eligibilityPage(d)'),'Nomination standards have a dedicated Hall route');
assert.ok(js.includes("view==='eligibility'?eligibilityPage(ctx.DATA)"),'Hall route renders eligibility separately from the lobby');
assert.ok(js.includes('#/hall-of-fame/eligibility'),'Hall lobby links to nomination requirements');
assert.match(js,/fig-hof-switcher/,'Hall and Legacy quick menu is present on every Hall route');
assert.match(js,/sectionMenu\(view\)/,'Hall quick navigation is rendered for all Hall views');
assert.ok(js.includes('Positional Supremacy'));
assert.ok(js.includes('3 <small>OF</small> 5'));
assert.doesNotMatch(js,/THE SUPREMACY EXCEPTION|fig-hof-248-route-alt/);
assert.ok(js.includes('Every requirement, including #2, counts as one.'));
assert.ok(js.includes('No individual requirement qualifies a player by itself.'));
assert.ok(js.includes('Counts as one of the five required benchmarks.'));
assert.ok(js.includes('One completed season finishing #1 in positional PPG.'));
assert.ok(js.includes('const targets=[2,1,3,4,5]'));
assert.ok(js.includes("['05','Career Consistency','Five completed seasons"));
assert.ok(!js.includes("['05','Career Consistency','Four completed seasons"));
assert.doesNotMatch(js,/independently qualifies a player|qualifies a player on its own/);
assert.ok(js.includes('at least 9 official FIG starts'));
assert.ok(js.includes('average points per FIG start (PPG)'));
assert.ok(js.includes('not their total points'));
assert.ok(!js.includes('at least 10 verified FIG starts'));
assert.ok(js.includes('function hallEligibilityWatch(d)'));
assert.ok(js.includes('hallEligibilityWatchSection(watch)'));
assert.ok(js.includes('eligibilityPage(ctx.DATA)'));
assert.match(css,/fig-hof-249-progress/);
assert.ok(css.includes('white-space:normal;text-transform:none'),'Contender names preserve proper capitalization');
assert.match(css,/fig-hof-249-scroll/);
assert.match(css,/fig-hof-248-ranking-rule/);
assert.ok(css.includes('fig-hof-248-eligibility .fig-hof-248-table-wrap tbody tr:nth-child(even)'),'Even positional rows must override global zebra backgrounds');
assert.ok(js.includes("['QB','25+','TOP 10']"));
assert.ok(js.includes('QB:{peak:25,consistent:10,elite:4,dominant:8}'));
assert.ok(js.includes('RB:{peak:17,consistent:12,elite:4,dominant:8}'));
assert.ok(js.includes('WR:{peak:17,consistent:12,elite:4,dominant:8}'));
assert.ok(js.includes('TE:{peak:14,consistent:3,elite:2,dominant:3}'));
assert.ok(js.includes("['01','Elite Production','Two top-four positional PPG finishes"));
assert.ok(js.includes("['03','Sustained Dominance','Three top-eight positional PPG finishes"));
assert.ok(js.includes("['05','Career Consistency','Five completed seasons"));
assert.ok(js.includes("i===0?s.rank<=(p.position==='TE'?2:4)"));
assert.ok(js.includes("i===1?s.rank===1:i===2?s.rank<=(p.position==='TE'?3:8)"));
assert.ok(!js.includes('const targets=[2,1,3,4,4]'));
assert.ok(js.includes('({QB:10,RB:12,WR:12,TE:3}[p.position])'));
assert.ok(!js.includes("'TOP 8'"),'QB consistency display must not say top 8');
assert.ok(js.includes("['RB','17+','TOP 12']"));
assert.ok(js.includes("['WR','17+','TOP 12']"));
assert.ok(js.includes("['TE','14+','TOP 3']"));
assert.ok(js.includes('eligible:met>=3'));
assert.ok(js.includes('({QB:25,RB:17,WR:17,TE:14}[p.position])'));
assert.ok(!js.includes('eligible:met>=4'));
assert.doesNotMatch(js,/four-of-five nomination standard|at least four of the five requirements/);
assert.match(css,/fig-hof-248-routes/);
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
