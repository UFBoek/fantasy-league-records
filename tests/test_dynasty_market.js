/* Real data + fake DOM smoke coverage for both dynasty market routes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const rows=p=>JSON.parse(read('data/'+p+'.json'));
const source=read('dynasty-market-v209.js');
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
let activeHistory=history;
const ctx={
 window:{},
 document:{getElementById:node},
 DATA:leagueData,
 OWNER_AVATAR_BY_ID:Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,'avatar.svg'])),
 raTeamData:id=>{
  const t=snapshot.teams.find(t=>t.franchise_id===+id);
  return {knownTotal:t.total,playerValue:t.players_value,pickValue:t.picks_value,
    allValued:t.all_valued,roster:t.players,picks:t.picks};
 },
 raReady:()=>true,
 load:async()=>{},
 navActive:()=>{},
 displayOwnerName:(_raw,id)=>['','Boek','Fru','Fromm','Sack','Leyton','Hayden','Line','Winston','CamNol','James'][id],
 raDate:()=>snapshot.date,
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
 assert.match(holder.innerHTML,/FRANCHISE MARKET CAP/);
 assert.match(holder.innerHTML,/HISTORY/);
 assert.match(graph.innerHTML,/second daily snapshot/i);
 const second=JSON.parse(JSON.stringify(snapshot));
 second.date='2026-10-30';
 second.teams[0].total+=1200;
 activeHistory={version:1,snapshots:[snapshot,second]};
 await ctx.window.figDynastyMarket('market','1');
 assert.match(graph.innerHTML,/<svg/);
 assert.match(holder.innerHTML,/MARKET OVERVIEW/);
 await ctx.window.figDynastyMarket('window');
 assert.match(holder.innerHTML,/CHAMPIONSHIP WINDOW INDEX/);
 assert.match(holder.innerHTML,/CURRENT MODEL PPG/);
 assert.match(holder.innerHTML,/65% full-season/);
 assert.match(holder.innerHTML,/PLAYOFF CALCULATOR/i);
 assert.match(holder.innerHTML,/DYNASTY JUGGERNAUT|WIN-NOW CONTENDER|RISING CONTENDER/i);
 console.log('Market history chart, franchise focus and championship window rendered');
})().catch(error=>{console.error(error);process.exitCode=1;});
