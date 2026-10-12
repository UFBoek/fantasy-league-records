/* Trade Ratings regression: graded outcomes, incomplete deals and any-pair filtering. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const code=fs.readFileSync('trade-ratings-v143.js','utf8');
const {figTradeRatingModel,figTradeRatingsPage}=new Function(code+';return {figTradeRatingModel,figTradeRatingsPage};')();
const trade=(id,season,week,ids)=>({transaction_id:id,season,week,franchises_involved:ids.length,franchise_ids:ids,total_player_assets:2,total_pick_assets:0});
const side=(id,franchise)=>({transaction_id:id,franchise_id:franchise,owner_name:'Manager '+franchise,assets_received:[]});
const asset=(id,franchise,direction,type,playerId=null,year=null,round=null,origin=null)=>({
 transaction_id:id,franchise_id:franchise,asset_direction:direction,asset_type:type,
 player_id:playerId,player_name:playerId?'Player '+playerId:null,asset_label:playerId?'Player '+playerId:'2025 Round 1 (orig. F4)',
 pick_season:year,pick_round:round,original_pick_franchise_id:origin
});
const data={
 trades:[trade('t1',2024,1,[1,2]),trade('t2',2025,2,[1,2]),trade('t3',2026,1,[1,2]),trade('t4',2025,1,[1,2])],
 tradeSides:['t1','t2','t3','t4'].flatMap(id=>[side(id,1),side(id,2)]),
 tradeAssets:[
 asset('t1',1,'Received','Player',10),
 asset('t1',2,'Received','Player',20),
 asset('t2',1,'Sent','Player',10),
 asset('t2',1,'Received','Player',30),
 asset('t2',2,'Received','Draft Pick',null,2027,1,2),
 asset('t3',2,'Received','Player',40),
 asset('t4',1,'Received','Draft Pick',null,2025,1,4),
 asset('t4',2,'Received','Player',20)
 ],
 playerLog:[
 {season:2024,week:2,franchise_id:1,player_id:10,starter_points:24},
 {season:2025,week:1,franchise_id:1,player_id:10,starter_points:28},
 {season:2025,week:3,franchise_id:1,player_id:10,starter_points:20},
 {season:2025,week:3,franchise_id:1,player_id:30,starter_points:15}
 ],
 draftAudit:[{
  draft_kind:'rookie',draft_year:2025,round:1,original_franchise:4,
  resolution_status:'DIRECT_DRAFT_SLOT_MATCH',selection_verified_by_draft_slot:true,
  selecting_franchise:1,player_id:99,player_name:'Draft Star'
 }]
};
const tools={
 playerValue:id=>({10:5000,20:1500,30:500,40:250,99:7000})[id]??0,
 pickValue:(year,round,orig)=>({value:orig===2?3000:2100,isProxy:false}),
 pickLabel:s=>s,name:(raw,id)=>'Manager '+id
};
const m=figTradeRatingModel(data,tools);
assert.equal(m.trades.length,4);
assert.equal(m.rated,3);
assert.equal(m.rankings.length,2);
const first=m.trades.find(x=>x.id==='t1');
assert.equal(first.participants[0].lineup,52); // Ends at next recorded outgoing trade.
assert.ok(first.participants[0].score>first.participants[1].score);
assert.equal(first.participants[0].items[0].exit,true);
const pending=m.trades.find(x=>x.id==='t3');
assert.equal(pending.rated,false);
assert.ok(pending.participants.every(p=>p.score===null));
const draft=m.trades.find(x=>x.id==='t4').participants[0].items[0];
assert.equal(draft.converted,true);
assert.equal(draft.market,7000);
const fresh=m.trades.find(x=>x.id==='t2');
assert.equal(fresh.participants[0].lineup,15);
assert.equal(fresh.participants[1].market,3000);
assert.ok(m.rankings[0].rated>=3);
assert.equal(figTradeRatingModel({trades:[],tradeSides:[],tradeAssets:[]},tools).rated,0);
let markup='';
const nodes={};
const node=id=>nodes[id]??=( {innerHTML:'',value:'',dataset:{},onclick:null,onchange:null,oninput:null,
 scrollIntoView(){},querySelectorAll(selector){if(selector==='.fig-tr-rank-row')return m.rankings.map(r=>({dataset:{manager:String(r.id)},onclick:null}));return []} });
figTradeRatingsPage(m,{
 html:(id,str)=>{markup=str;node('#'+id).innerHTML=str;},
 el:node,escape:x=>String(x),money:x=>String(Math.round(x)),avatar:id=>'<i>'+id+'</i>',ownerLink:(name,id)=>name
});
assert.match(markup,/OVERALL TRADE RANKINGS/);
assert.match(markup,/TRADE HISTORY/);
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/3 RATED/);
node('#figTrManager').onchange({target:{value:'1'}});
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
node('#figTrVersus').onchange({target:{value:'2'}});
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
node('#figTrYear').onchange({target:{value:'2026'}});
assert.match(node('#figTrResults').innerHTML,/1 MATCHING TRADES/);
node('#figTrSearch').oninput({target:{value:'no matching asset'}});
assert.match(node('#figTrResults').innerHTML,/No trades match these filters/);
node('#figTrClear').onclick();
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/CURRENT VALUE/);
const app=fs.readFileSync('app.js','utf8'),index=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert.ok(app.includes("const model=figTradeRatingModel(DATA,"));
assert.ok(app.includes('figTradeRatingsPage(model,'));
assert.ok(index.includes('trade-ratings-v143.js?v=143'));
assert.ok(index.includes('trade-ratings-v143.css?v=143'));
assert.ok(sw.includes('trade-ratings-v143.js?v=143'));
console.log('Trade Ratings model, filters and route checks passed.');
