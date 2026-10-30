'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),app=read('app.js'),css=read('dynasty-dominance-v230.css');
assert.match(html,/dynasty-dominance-v230\.css\?v=230/);
assert.match(html,/dynasty-dominance-v230\.js\?v=231/);
assert.match(app,/\{icon:'◉',label:'DYNASTY DOMINANCE',href:'#\/dynasty-dominance'\}/);
assert.match(app,/parts\[0\]==='dynasty-dominance'/);
assert.match(read('mobile-v69.js'),/dynasty-dominance/);
assert.match(read('sw.js'),/dynasty-dominance-v230\.js/);
assert.match(css,/@media\(max-width:699px\)/);
const ids=Array.from({length:10},(_,i)=>i+1),years=[2027,2028,2029,2030,2031,2032];
const names=['','Boek','Fru','Fromm','Sack','Leyton','Hayden','Line','Winston','CamNol','James'];
const scores=Object.fromEntries(years.map(year=>[year,{
 ranking:ids.map(id=>({id,ppg:240-id*10+(year-2027),p10:200-id*10,p90:270-id*10})),
 boek_vs_leagues_best_opponent:{gap_ppg:8,p10:-5,p90:15},
 boek_vs_teams:ids.filter(x=>x!==1).map(id=>({id,gap_ppg:id*10,p10:0,p90:25}))
}]));
const report={status:'experimental_beta_not_calibrated',generated_at:'2026-10-30T09:00:00Z',
 source_week:7,source_season:2026,runs:1500,model_version:'experimental-v2.1',years,seasons:scores,
 teams:ids.map(id=>({id,name:names[id],current_ppg:200-id*7,
 roster_count:29,top10_value_weighted_age:25+id/10,known_first_rounders:3,
 draft_by_year:Object.fromEntries(years.map(year=>[year,{known:4,round1:1,projected_assumed:year>=2031?4:0}]))}))
};
let fetchCount=0,success=true,yearButtons=[],select=null;
const holder={
 innerHTML:'',
 querySelectorAll(query){assert.equal(query,'[data-dd-year]');return yearButtons;},
 querySelector(query){assert.equal(query,'#ddTeamSelect');select={addEventListener(){}};return select;}
};
const context={window:{},document:{getElementById:id=>id==='app'?holder:null},
 fetch:async()=>{fetchCount++;return success?{ok:true,json:async()=>report}:{ok:false};},
 location:{hash:'#/dynasty-dominance'},console,Date,Set,Math,Array,Number,String};
vm.createContext(context);
vm.runInContext(read('dynasty-dominance-v230.js'),context,{filename:'dynasty-dominance-v230.js'});
assert.equal(typeof context.window.figDynastyDominance,'function');
(async()=>{
 await context.window.figDynastyDominance(1);
 assert.match(holder.innerHTML,/DYNASTY/);
 assert.match(holder.innerHTML,/DOMINANCE/);
 assert.match(holder.innerHTML,/Experimental projections/);
 assert.match(holder.innerHTML,/Long-term accuracy has not been validated/);
 assert.match(holder.innerHTML,/MODEL PPG/);
 assert.match(holder.innerHTML,/#\/team\/1/);
 assert.match(holder.innerHTML,/#\/stock-market/);
 assert.match(holder.innerHTML,/#\/dynasty-dominance\/6/);
 assert.match(holder.innerHTML,/<svg/);
 assert.doesNotMatch(holder.innerHTML,/championship odds|chance to win championship|validated probabilities/i);
 await context.window.figDynastyDominance(6);
 assert.match(holder.innerHTML,/Hayden <span>through 2032/);
 assert.equal(fetchCount,1,'Cache report between team routes');
 context.window.figDynastyDominanceInvalidate();
 await context.window.figDynastyDominance(2);
 assert.equal(fetchCount,2,'Refresh report after live published snapshot changes');
 context.window.figDynastyDominanceInvalidate();success=false;
 await context.window.figDynastyDominance(2);
 assert.match(holder.innerHTML,/projections are unavailable/);
 assert.doesNotMatch(holder.innerHTML,/NaN|undefined/);
 console.log('Dynasty Dominance routing, responsive assets, disclosure, links and refresh UI passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
