'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),app=read('app.js'),css=read('dynasty-dominance-v230.css'),sw=read('sw.js');
assert.match(html,/dynasty-dominance-v230\.css\?v=232/);
assert.match(html,/dynasty-dominance-v230\.js\?v=232/);
assert.match(app,/\{icon:'◉',label:'DYNASTY DOMINANCE',href:'#\/dynasty-dominance'\}/);
assert.match(app,/parts\[0\]==='dynasty-dominance'/);
assert.match(read('mobile-v69.js'),/dynasty-dominance/);
assert.match(sw,/dynasty-dominance-v230\.js\?v=232/);
assert.match(css,/dd-observed|dd-feature|dd-ladder-row/);
assert.match(css,/@media\(max-width:699px\)/);
const ids=Array.from({length:10},(_,i)=>i+1),years=[2027,2028,2029,2030,2031,2032];
const names=['','Boek','Fru','Fromm','Sack','Leyton','Hayden','Line','Winston','CamNol','James'];
const makeScore=(year,id)=>{
 if(id===1)return {2027:227.5,2028:226.1,2029:224.2,2030:220.8,2031:213.8,2032:205.7}[year];
 if(id===6)return {2027:192.6,2028:184.9,2029:183.9,2030:179.2,2031:175.6,2032:169.5}[year];
 if(id===9)return {2027:156.1,2028:167.6,2029:171,2030:177,2031:180.7,2032:183.9}[year];
 if(id===4)return 173.9+(year-2027)*1.6;
 return 164-id*3+(year-2027)*.4;
};
const scores=Object.fromEntries(years.map(year=>[year,{
 ranking:ids.map(id=>({id,ppg:makeScore(year,id),p10:makeScore(year,id)-18,p90:makeScore(year,id)+20}))
  .sort((a,b)=>b.ppg-a.ppg),
 boek_vs_leagues_best_opponent:{gap_ppg:12,p10:-10,p90:45},
 boek_vs_teams:ids.filter(x=>x!==1).map(id=>({id,gap_ppg:227-id*5,p10:0,p90:25}))
}]));
const report={status:'experimental_beta_not_calibrated',generated_at:'2026-10-30T09:00:00Z',
 source_week:7,source_season:2026,runs:1500,model_version:'experimental-v2.1',years,seasons:scores,
 assumptions:{known_pick_ownership_through:2029},
 teams:ids.map(id=>({id,name:names[id],
 current_ppg:id===1?234.9:id===6?213.9:165-id*6,
 roster_count:29,top10_value_weighted_age:id===6?27.2:25+id/10,known_first_rounders:3,
 draft_by_year:Object.fromEntries(years.map(year=>[year,{known:year<=2029?4:0,round1:1,projected_assumed:year>2029?4:0}]))}))
};
let fetchCount=0,success=true,yearButtons=[],select=null;
const holder={
 innerHTML:'',
 querySelectorAll(query){
  assert.equal(query,'[data-dd-year]');
  yearButtons=[...this.innerHTML.matchAll(/data-dd-year="(\d+)"/g)].map(match=>({
   dataset:{ddYear:match[1]},handlers:{},addEventListener(event,fn){this.handlers[event]=fn;}
  }));
  return yearButtons;
 },
 querySelector(query){
  assert.equal(query,'#ddTeamSelect');
  select={handlers:{},addEventListener(event,fn){this.handlers[event]=fn;}};
  return select;
 }
};
const context={window:{},document:{getElementById:id=>id==='app'?holder:null},
 fetch:async()=>{fetchCount++;return success?{ok:true,json:async()=>report}:{ok:false};},
 location:{hash:'#/dynasty-dominance'},console,Date,Set,Math,Array,Number,String};
vm.createContext(context);
vm.runInContext(read('dynasty-dominance-v230.js'),context,{filename:'dynasty-dominance-v230.js'});
assert.equal(typeof context.window.figDynastyDominance,'function');
(async()=>{
 await context.window.figDynastyDominance();
 assert.match(holder.innerHTML,/WHO CAN <em>CHALLENGE BOEK\?/);
 assert.match(holder.innerHTML,/2026 · ACTUAL SCORING SO FAR/);
 assert.match(holder.innerHTML,/234\.9/);
 assert.match(holder.innerHTML,/213\.9/);
 assert.match(holder.innerHTML,/2027 · BOEK’S CLOSEST CHALLENGER/);
 assert.match(holder.innerHTML,/192\.6/);
 assert.match(holder.innerHTML,/34\.9/);
 assert.match(holder.innerHTML,/THREAT RANKING/);
 assert.match(holder.innerHTML,/Boek’s top challenger, every year/);
 assert.match(holder.innerHTML,/#\/team\/6/);
 assert.match(holder.innerHTML,/#\/stock-market/);
 assert.match(holder.innerHTML,/#\/dynasty-dominance\/9/);
 assert.match(holder.innerHTML,/<svg/);
 assert.doesNotMatch(holder.innerHTML,/PEAK MODEL YEAR|peak model year|CHAMPIONSHIP WINDOW/);
 assert.doesNotMatch(holder.innerHTML,/chance to win championship|calibrated odds|guaranteed winning probability/i);
 assert.ok(yearButtons.find(b=>b.dataset.ddYear==='2032'&&b.handlers.click));
 yearButtons.find(b=>b.dataset.ddYear==='2032').handlers.click();
 assert.match(holder.innerHTML,/2032 · BOEK’S CLOSEST CHALLENGER/);
 assert.match(holder.innerHTML,/183\.9/);
 assert.match(holder.innerHTML,/CamNol roster & draft capital/);
 assert.match(holder.innerHTML,/VERIFIED THROUGH 2029/);
 assert.match(holder.innerHTML,/assumed/);
 assert.equal(context.location.hash,'#/dynasty-dominance');
 await context.window.figDynastyDominance(6);
 assert.match(holder.innerHTML,/BOEK VS HAYDEN/);
 assert.match(holder.innerHTML,/Hayden roster & draft capital/);
 assert.match(holder.innerHTML,/2026 · ACTUAL SCORING SO FAR/);
 assert.equal(fetchCount,1,'Reuse report between deep links');
 select.handlers.change({target:{value:'4'}});
 assert.equal(context.location.hash,'#/dynasty-dominance/4');
 assert.match(holder.innerHTML,/BOEK VS SACK/);
 context.window.figDynastyDominanceInvalidate();
 await context.window.figDynastyDominance(2);
 assert.equal(fetchCount,2,'Refresh model after published snapshot updates');
 context.window.figDynastyDominanceInvalidate();success=false;
 await context.window.figDynastyDominance(2);
 assert.match(holder.innerHTML,/projections are unavailable/);
 assert.doesNotMatch(holder.innerHTML,/NaN|undefined/);
 console.log('Challenger-first Dynasty Dominance: 2026 actual vs forecasts, yearly challengers, mobile assets, comparisons and refresh passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
