/* Trade Ratings regression: percent return, zero-value players, incomplete deals and pair filtering. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const code=fs.readFileSync('trade-ratings-v143.js','utf8');
const {figTradeRatingModel,figTradeRatingsPage}=new Function(code+';return {figTradeRatingModel,figTradeRatingsPage};')();
const trade=(id,season,week,ids)=>({transaction_id:id,season,week,franchises_involved:ids.length,franchise_ids:ids,total_player_assets:2,total_pick_assets:0});
const side=(id,franchise)=>({transaction_id:id,franchise_id:franchise,owner_name:'Manager '+franchise,assets_received:[]});
const asset=(id,franchise,direction,type,playerId=null,year=null,round=null,origin=null)=>({
 transaction_id:id,franchise_id:franchise,asset_direction:direction,asset_type:type,
 season:{t1:2024,t2:2025,t3:2026,t4:2025}[id],week:{t1:1,t2:2,t3:1,t4:1}[id],
 player_id:playerId,player_name:playerId?'Player '+playerId:null,asset_label:playerId?'Player '+playerId:'2025 Round 1 (orig. F4)',
 pick_season:year,pick_round:round,original_pick_franchise_id:origin,
 counterparty_franchise_id:franchise===1?2:1
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
 pickLabel:s=>s,name:(raw,id)=>'Manager '+id,valuesReady:true
};
const m=figTradeRatingModel(data,tools);
assert.equal(m.trades.length,4);
assert.equal(m.rated,3);
assert.equal(m.rankings.length,2);
const first=m.trades.find(x=>x.id==='t1');
assert.equal(first.participants[0].lineup,52); // Ends at next recorded outgoing trade.
assert.ok(first.participants[0].returnPct>first.participants[1].returnPct);
assert.equal(Math.round(first.participants[0].returnPct),Math.round(first.participants[0].impact/first.participants[0].sent*100));
assert.equal(first.participants[0].net,-first.participants[1].net);
assert.equal(first.participants[0].items[0].exit,true);
const pending=m.trades.find(x=>x.id==='t3');
assert.equal(pending.rated,false);
assert.ok(pending.participants.every(p=>p.returnPct===null));
const draft=m.trades.find(x=>x.id==='t4').participants[0].items[0];
assert.equal(draft.converted,true);
assert.equal(draft.market,7000);
const fresh=m.trades.find(x=>x.id==='t2');
assert.equal(fresh.participants[0].lineup,15);
assert.equal(fresh.participants[1].market,3000);
assert.ok(m.rankings[0].rated>=3);
assert.equal(m.rankings[0].returnPct,m.rankings[0].gained/m.rankings[0].sent*100);
assert.ok(!('grade' in m.rankings[0]));
assert.equal(figTradeRatingModel({trades:[],tradeSides:[],tradeAssets:[]},tools).rated,0);
// Historical 2023 startup slots have no honest equivalent in a current rookie pick price.
const startup=figTradeRatingModel({
 trades:[trade('s',2023,1,[1,2])],tradeSides:[side('s',1),side('s',2)],
 tradeAssets:[
  {...asset('s',1,'Received','Draft Pick',null,2023,1,4),season:2023,week:1},
  {...asset('s',2,'Received','Player',20),season:2023,week:1}
 ]
},tools);
assert.equal(startup.trades[0].rated,false);
assert.equal(startup.trades[0].participants[0].items[0].market,null);
// Individual unknown/missing-ID players count as zero rather than unrated.
const missing=figTradeRatingModel({
 trades:[trade('unknown',2026,2,[1,2])],tradeSides:[side('unknown',1),side('unknown',2)],
 tradeAssets:[
  {...asset('unknown',1,'Received','Player',4444444),season:2026,week:2},
  {...asset('unknown',2,'Received','Player',null),season:2026,week:2}
 ]
}, {...tools,playerValue:id=>id===null?null:undefined});
assert.equal(missing.rated,1);
assert.ok(missing.trades[0].participants.every(p=>p.items[0].market===0&&p.net===0&&p.returnPct===null));
// But an unavailable full valuation feed must not be faked as a zero-value market.
const outage=figTradeRatingModel({
 trades:[trade('outage',2026,2,[1,2])],tradeSides:[side('outage',1),side('outage',2)],
 tradeAssets:[
  {...asset('outage',1,'Received','Player',10),season:2026,week:2},
  {...asset('outage',2,'Received','Player',20),season:2026,week:2}
 ]
}, {...tools,valuesReady:false,playerValue:()=>null});
assert.equal(outage.rated,0);
// Zero-cost gain displays an unbounded return rather than dividing by zero.
const free=figTradeRatingModel({
 trades:[trade('free',2026,2,[1,2])],tradeSides:[side('free',1),side('free',2)],
 tradeAssets:[
  {...asset('free',1,'Received','Player',10),season:2026,week:2},
  {...asset('free',2,'Received','Player',4444444),season:2026,week:2}
 ]
},tools);
assert.equal(free.trades[0].participants.find(p=>p.id===1).returnPct,Infinity);
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
assert.match(markup,/Total received ÷ total sent/);
assert.match(markup,/HOW IS RETURN CALCULATED/);
assert.doesNotMatch(markup,/S ≥90|AVG SCORE|GRADE/);
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/3 RATED/);
node('#figTrManager').onchange({target:{value:'1'}});
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
node('#figTrVersus').onchange({target:{value:'2'}});
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/DIRECT TRADES/);
assert.match(node('#figTrResults').innerHTML,/RECEIVED VALUE/);
assert.match(node('#figTrResults').innerHTML,/OVERALL RETURN/);
assert.match(node('#figTrResults').innerHTML,/LINEUP PTS/);
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
assert.ok(index.includes('trade-ratings-v143.js?v=146'));
assert.ok(index.includes('trade-ratings-v143.css?v=146'));
assert.ok(sw.includes('trade-ratings-v143.js?v=146'));
console.log('Trade return percentages, zero-value players, filters and route checks passed.');
