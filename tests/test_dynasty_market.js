/* Real data + fake DOM smoke coverage for both dynasty market routes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const rows=p=>JSON.parse(read('data/'+p+'.json'));
const source=read('dynasty-market-v209.js');
const windowModel=require('../dynasty-window-model-v210.js');
const currentRoster=rows('current_roster');
const history=rows('dynasty_market_history');
const snapshot=history.snapshots[history.snapshots.length-1];
assert.equal(snapshot.teams.length,10);
assert.equal(snapshot.league_total,snapshot.teams.reduce((s,t)=>s+t.total,0));
const holder={innerHTML:'',querySelectorAll(){return [];}};
const graph={innerHTML:''};
const movers={innerHTML:''};
const node=id=>({app:holder,dmGraph:graph,dmMovers:movers})[id]||null;
const leagueData={
 standingsCareer:rows('standings_career'),
 currentStandings:rows('current_standings_web'),
 weeklyRanks:rows('weekly_scoring_ranks'),
};
let activeHistory={version:1,snapshots:[snapshot]};
const ctx={
 window:{figDynastyWindowModel:windowModel},
 document:{getElementById:node},
 DATA:leagueData,
 OWNER_AVATAR_BY_ID:Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,'avatar.svg'])),
 raTeamData:id=>{
  const t=snapshot.teams.find(t=>t.franchise_id===+id);
  return {knownTotal:t.total,playerValue:t.players_value,pickValue:t.picks_value,
    allValued:t.all_valued,roster:currentRoster.filter(x=>+x.franchise_id===+id)
      .map(x=>({...x,age:x.age??({QB:27,RB:24,WR:26,TE:27}[x.position]||null)})),picks:t.picks};
 },
 raReady:()=>true,
 load:async()=>{},
 navActive:()=>{},
 displayOwnerName:(_raw,id)=>['','Boek','Fru','Fromm','Sack','Leyton','Hayden','Line','Winston','CamNol','James'][id],
 raDate:()=>snapshot.date,
 raPlayer:id=>snapshot.teams.flatMap(t=>t.players).find(p=>String(p[0])===String(id))?.[1]??0,
 fetch:async()=>({ok:true,json:async()=>activeHistory}),
 console,
 Set, Map, Date, Number, String, Math, Object, Array,
};
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'dynasty-market-v209.js'});
assert.equal(typeof ctx.window.figDynastyMarket,'function');
(async()=>{
 await ctx.window.figDynastyMarket('market');
 assert.match(holder.innerHTML,/DYNASTY STOCK MARKET/);
 assert.doesNotMatch(holder.innerHTML,/FRANCHISE MARKET CAP/);
 assert.match(holder.innerHTML,/HISTORY/);
 assert.match(graph.innerHTML,/second observed date/i);
 const second=JSON.parse(JSON.stringify(snapshot));
 second.date='2026-10-30';
 second.teams[0].total+=1200;
 activeHistory={version:1,snapshots:[snapshot,second]};
 await ctx.window.figDynastyMarket('market','1');
 assert.match(graph.innerHTML,/<svg/);
 assert.match(holder.innerHTML,/MARKET OVERVIEW/);
 // Recover genuine historical prices; unobserved dates must not look continuous.
 assert.ok(history.snapshots.length>=14,'real archived franchise valuations are present');
 assert.equal(history.snapshots[0].date,'2026-10-09');
 assert.ok(history.snapshots.slice(0,-1).every(s=>s.archive_recovered&&s.archive_commit));
 activeHistory=history;
 await ctx.window.figDynastyMarket('market');
 assert.match(graph.innerHTML,/<svg/);
 assert.match(graph.innerHTML,/stroke-dasharray="6 7"/,'missing calendar dates are marked as dotted');
 assert.match(graph.innerHTML,/dm-end-label/,'team endpoint labels are drawn');
 assert.match(graph.innerHTML,/>\d+(?:\.\d)?k<\/text>/,'rounded thousands on value axis');
 assert.match(holder.innerHTML,/Archive since Oct 9, 2026/);
 await ctx.window.figDynastyMarket('window');
 assert.match(holder.innerHTML,/CHAMPIONSHIP WINDOW INDEX/);
 assert.match(holder.innerHTML,/MODEL PPG/);
 assert.doesNotMatch(holder.innerHTML,/FULL METHODOLOGY|HOW THE SCORES ARE BUILT/);
 assert.doesNotMatch(holder.innerHTML,/VERIFIED PLAYER AGES|55% PPG|AGE-AWARE/);
 assert.match(holder.innerHTML,/href="#\/playoff-calculator"/i);
 assert.match(holder.innerHTML,/Dynasty Juggernaut|Win-Now Contender|Rising Contender|Fragile Contender/i);
 assert.match(holder.innerHTML,/AGE-ADJUSTED CORE/);
 assert.match(holder.innerHTML,/VIEW SCORE BREAKDOWN/);
 assert.match(holder.innerHTML,/CURRENT TITLE ODDS/);
 assert.doesNotMatch(holder.innerHTML,/dm-overview|dm-method/);
 console.log('Market history chart, franchise focus and championship window rendered');
})().catch(error=>{console.error(error);process.exitCode=1;});
