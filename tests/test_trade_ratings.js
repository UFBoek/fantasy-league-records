/* Trade Ratings regression: net-market trade allocations and partner consistency. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const code=fs.readFileSync('trade-ratings-v143.js','utf8');
const {figTradeRatingModel,figTradeRatingsPage,figTradePartnerships,figTradePairCredits}=new Function(code+';return {figTradeRatingModel,figTradeRatingsPage,figTradePartnerships,figTradePairCredits};')();
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
assert.equal(m.rated,4);
assert.equal(m.rankings.length,2);
assert.equal(m.partnerships.length,1);
assert.equal(m.partnerships[0].trades,4);
assert.equal(m.partnerships[0].rated,4);
assert.equal(m.partnerships[0].netA,-m.partnerships[0].netB);
const first=m.trades.find(x=>x.id==='t1');
assert.equal(first.participants[0].lineup,52); // Ends at next recorded outgoing trade.
assert.ok(first.participants[0].net>first.participants[1].net);
assert.equal(first.participants[0].net,first.participants[0].market-first.participants[0].sent);
assert.equal(first.participants[0].sent,first.participants[1].market);
assert.equal(first.participants[0].net,3500); // 5000 received - 1500 sent, not 52 * 4 more
assert.ok(!('impact' in first.participants[0]));
assert.equal(first.participants[0].net,-first.participants[1].net);
assert.equal(first.participants[0].items[0].exit,true);
// An actual trade for nothing must be rated, including the empty side.
const donated=m.trades.find(x=>x.id==='t3');
assert.equal(donated.rated,true);
const donor=donated.participants.find(p=>p.id===1);
const recipient=donated.participants.find(p=>p.id===2);
assert.equal(donor.total,0);
assert.equal(donor.market,0);
assert.equal(donor.sent,250);
assert.equal(donor.net,-250);
assert.equal(recipient.sent,0);
assert.equal(recipient.net,250);
assert.equal(donated.participants.reduce((total,p)=>total+p.net,0),0);
const draft=m.trades.find(x=>x.id==='t4').participants[0].items[0];
assert.equal(draft.converted,true);
assert.equal(draft.market,7000);
const fresh=m.trades.find(x=>x.id==='t2');
assert.equal(fresh.participants[0].lineup,15);
assert.equal(fresh.participants[1].market,3000);
assert.ok(m.rankings[0].rated>=3);
assert.equal(m.rankings[0].net,m.rankings[0].gained-m.rankings[0].sent);
assert.equal(m.rankings.reduce((a,b)=>a+b.net,0),0);
assert.ok(m.rankings[0].net>=m.rankings[1].net);
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
// A truly assetless exchange should not generate a fictitious zero-value trade.
const vacant=figTradeRatingModel({
 trades:[trade('vacant',2025,3,[1,2])],
 tradeSides:[side('vacant',1),side('vacant',2)],tradeAssets:[]
},tools);
assert.equal(vacant.rated,0);
assert.ok(vacant.trades[0].participants.every(p=>p.net===null));
// Unattributed assets are still unrated, not assumed to be gifts.
const orphan=figTradeRatingModel({
 trades:[trade('orphan',2025,3,[1,2])],
 tradeSides:[side('orphan',1),side('orphan',2)],
 tradeAssets:[{...asset('orphan',1,'Received','Player',10),season:2025,week:3,counterparty_franchise_id:null}]
},tools);
assert.equal(orphan.rated,0);
// In a multi-manager deal, an empty side is the cost of the assets it sent.
const multi=figTradeRatingModel({
 trades:[trade('multi',2025,3,[1,2,3])],
 tradeSides:[side('multi',1),side('multi',2),side('multi',3)],
 tradeAssets:[
  {...asset('multi',1,'Received','Player',10),season:2025,week:3,counterparty_franchise_id:2},
  {...asset('multi',3,'Received','Player',20),season:2025,week:3,counterparty_franchise_id:1}
 ]
},tools);
assert.equal(multi.rated,1);
assert.deepEqual(
 multi.trades[0].participants.map(p=>[p.id,p.market,p.sent,p.net]),
 [[1,5000,1500,3500],[2,0,5000,-5000],[3,1500,0,1500]]
);
// Individual unknown/missing-ID players count as zero rather than unrated.
const missing=figTradeRatingModel({
 trades:[trade('unknown',2026,2,[1,2])],tradeSides:[side('unknown',1),side('unknown',2)],
 tradeAssets:[
  {...asset('unknown',1,'Received','Player',4444444),season:2026,week:2},
  {...asset('unknown',2,'Received','Player',null),season:2026,week:2}
 ]
}, {...tools,playerValue:id=>id===null?null:undefined});
assert.equal(missing.rated,1);
assert.ok(missing.trades[0].participants.every(p=>p.items[0].market===0&&p.net===0));
// But an unavailable full valuation feed must not be faked as a zero-value market.
const outage=figTradeRatingModel({
 trades:[trade('outage',2026,2,[1,2])],tradeSides:[side('outage',1),side('outage',2)],
 tradeAssets:[
  {...asset('outage',1,'Received','Player',10),season:2026,week:2},
  {...asset('outage',2,'Received','Player',20),season:2026,week:2}
 ]
}, {...tools,valuesReady:false,playerValue:()=>null});
assert.equal(outage.rated,0);
// Lineup points never change dynasty value gained or lost.
// Reproduce the screenshot numbers exactly: 6541 received - 3088 sent,
// independent of 333.5 points from previous starts.
const screenshot=figTradeRatingModel({
 trades:[trade('snapshot',2023,1,[6,10])],
 tradeSides:[side('snapshot',6),side('snapshot',10)],
 tradeAssets:[
  {...asset('snapshot',6,'Received','Player',777),season:2023,week:1,counterparty_franchise_id:10},
  {...asset('snapshot',10,'Received','Player',888),season:2023,week:1,counterparty_franchise_id:6}
 ],
 playerLog:[{season:2024,week:2,franchise_id:6,player_id:777,starter_points:333.5}],
 draftAudit:[]
}, {...tools,playerValue:id=>({777:6541,888:3088})[id]??0});
const hayden=screenshot.trades[0].participants.find(p=>p.id===6);
assert.equal(hayden.market,6541);
assert.equal(hayden.sent,3088);
assert.equal(hayden.lineup,333.5);
assert.equal(hayden.net,3453);
// Gains against each opponent must sum to a manager's whole-trade gain.
const triangle=figTradeRatingModel({
 trades:[trade('triangle',2024,1,[1,3,10])],
 tradeSides:[side('triangle',1),side('triangle',3),side('triangle',10)],
 tradeAssets:[
  {...asset('triangle',1,'Received','Player',10),season:2024,week:1,counterparty_franchise_id:10},
  {...asset('triangle',3,'Received','Player',20),season:2024,week:1,counterparty_franchise_id:10},
  {...asset('triangle',10,'Received','Player',30),season:2024,week:1,counterparty_franchise_id:1},
  {...asset('triangle',10,'Received','Player',40),season:2024,week:1,counterparty_franchise_id:3}
 ]
},tools);
assert.equal(triangle.rated,1);
assert.deepEqual(triangle.partnerships.map(p=>p.key),['1:10','3:10']);
const boekVsJames=triangle.partnerships.find(p=>p.key==='1:10');
assert.equal(boekVsJames.netA,4500);
assert.equal(boekVsJames.netB,-4500);
assert.equal(triangle.partnerships.find(p=>p.key==='3:10').netA,1250);
assert.equal(triangle.partnerships.find(p=>p.key==='3:10').netB,-1250);
assert.equal(triangle.partnerships.some(p=>p.key==='1:3'),false);
assert.equal(triangle.partnerships.reduce((n,p)=>n+p.netB,0),-5750);
// A specific 3-team outcome is apportioned separately to each losing manager.
const threeWay=figTradePairCredits({id:'example',rated:true,participants:[
 {id:1,net:5473,items:[]},{id:2,net:-975,items:[]},{id:8,net:-4498,items:[]}
]});
assert.deepEqual(threeWay.map(p=>[p.key,p.netA,p.netB]),[
 ['1:2',975,-975],['1:8',4498,-4498]
]);
// Balanced decimal apportionments never lose or create cents.
const fourWay=figTradePairCredits({id:'four',rated:true,participants:[
 {id:1,net:100.01,items:[]},{id:2,net:49.99,items:[]},
 {id:3,net:-75.03,items:[]},{id:4,net:-74.97,items:[]}
]});
for(const p of [{id:1,net:100.01},{id:2,net:49.99},{id:3,net:-75.03},{id:4,net:-74.97}]){
 const cents=Math.round(fourWay.reduce((n,x)=>n+(x.aId===p.id?x.netA:x.bId===p.id?x.netB:0),0)*100);
 assert.equal(cents,Math.round(p.net*100));
}
// Isolate the requested 2023 three-party transaction, not other picks/trades.
const slotPick={...asset('997041669574823936',1,'Received','Draft Pick',null,2024,1,10),
 season:2023,week:1,counterparty_franchise_id:10};
const oneDeal=figTradeRatingModel({
 trades:[trade('997041669574823936',2023,1,[1,3,10])],
 tradeSides:[side('997041669574823936',1),side('997041669574823936',3),side('997041669574823936',10)],
 tradeAssets:[
  slotPick,
  {...asset('997041669574823936',10,'Received','Player',20),season:2023,week:1,counterparty_franchise_id:1},
  {...asset('997041669574823936',3,'Received','Player',30),season:2023,week:1,counterparty_franchise_id:10},
  {...asset('997041669574823936',10,'Received','Player',40),season:2023,week:1,counterparty_franchise_id:3}
 ],
 draftAudit:[{draft_kind:'rookie',draft_year:2024,round:1,original_franchise:10,
  resolution_status:'DIRECT_DRAFT_SLOT_MATCH',selection_verified_by_draft_slot:true,
  selecting_franchise:1,player_id:99,player_name:'Draft Star'}]
},tools);
assert.equal(oneDeal.rated,1);
const boq=oneDeal.trades[0].participants.find(p=>p.id===1);
assert.equal(boq.items[0].market,2265);
assert.equal(boq.items[0].selection,undefined);
assert.equal(boq.market,2265);
assert.equal(boq.net,765);
// Each transaction's pair credits equal every manager's whole-trade net.
// Each manager's partner totals also reconcile to the league rankings.
function verifyPartnershipSums(model){
 const pairTotals=new Map();
 const franchiseTotals=new Map();
 const pairCounts=new Map();
 for(const t of model.trades){
  const credit=figTradePairCredits(t);
  if(t.rated){
   assert.equal(Math.round(t.participants.reduce((n,p)=>n+p.net,0)*100),0);
   for(const p of t.participants){
    const allocated=credit.reduce((n,c)=>n+(p.id===c.aId?c.netA:p.id===c.bId?c.netB:0),0);
    assert.equal(Math.round(allocated*100),Math.round(p.net*100),
     'Unbalanced team credit for trade '+t.id+' manager '+p.id);
    franchiseTotals.set(p.id,(franchiseTotals.get(p.id)||0)+p.net);
   }
  }
  for(const c of credit){
   pairCounts.set(c.key,(pairCounts.get(c.key)||0)+1);
   if(t.rated)pairTotals.set(c.key,(pairTotals.get(c.key)||0)+Math.round(c.netA*100));
  }
 }
 for(const p of model.partnerships){
  assert.equal(Math.round(p.netA*100),pairTotals.get(p.key)||0);
  assert.equal(Math.round(p.netB*100),-(pairTotals.get(p.key)||0));
  assert.equal(p.trades,pairCounts.get(p.key));
 }
 for(const [id,value] of franchiseTotals){
  const gained=model.partnerships.reduce((n,p)=>n+(p.aId===id?p.netA:p.bId===id?p.netB:0),0);
  assert.equal(Math.round(gained*100),Math.round(value*100));
 }
 for(let i=1;i<model.partnerships.length;i++)
  assert.ok(Math.abs(model.partnerships[i-1].netA)>=Math.abs(model.partnerships[i].netA));
}
verifyPartnershipSums(m);
verifyPartnershipSums(triangle);
verifyPartnershipSums(multi);
const otherPickTrade=figTradeRatingModel({
 trades:[trade('other',2023,1,[1,10])],
 tradeSides:[side('other',1),side('other',10)],
 tradeAssets:[
  {...slotPick,transaction_id:'other'},
  {...asset('other',10,'Received','Player',20),season:2023,week:1,counterparty_franchise_id:1}
 ],
 draftAudit:[{draft_kind:'rookie',draft_year:2024,round:1,original_franchise:10,
  resolution_status:'DIRECT_DRAFT_SLOT_MATCH',selection_verified_by_draft_slot:true,
  selecting_franchise:1,player_id:99,player_name:'Draft Star'}]
},tools);
assert.equal(otherPickTrade.trades[0].participants.find(p=>p.id===1).items[0].market,7000);
// A zero-value outgoing asset still produces a regular numeric net gain.
const free=figTradeRatingModel({
 trades:[trade('free',2026,2,[1,2])],tradeSides:[side('free',1),side('free',2)],
 tradeAssets:[
  {...asset('free',1,'Received','Player',10),season:2026,week:2},
  {...asset('free',2,'Received','Player',4444444),season:2026,week:2}
 ]
},tools);
assert.equal(free.trades[0].participants.find(p=>p.id===1).net,5000);
assert.equal(free.trades[0].participants.find(p=>p.id===2).net,-5000);
let markup='';
const nodes={};
const node=id=>nodes[id]??=( {innerHTML:'',value:'',dataset:{},onclick:null,onchange:null,oninput:null,
 scrollIntoView(){},querySelectorAll(selector){
  if(selector==='.fig-tr-rank-row')return m.rankings.map(r=>({dataset:{manager:String(r.id)},onclick:null}));
  const pattern=selector==='.fig-tr-opponent'
   ?/data-opponent="([0-9]+)"/g
   :selector==='.fig-tr-partnership-row'
    ?/data-pair-a="([0-9]+)" data-pair-b="([0-9]+)"/g:null;
  if(!pattern)return [];
  this.children??=new Map();
  return [...this.innerHTML.matchAll(pattern)].map(m=>{
   const key=selector+':'+m.slice(1).join(':');
   if(!this.children.has(key))this.children.set(key,{dataset:{},onclick:null});
   const item=this.children.get(key);
   item.dataset=selector==='.fig-tr-opponent'?{opponent:m[1]}:{pairA:m[1],pairB:m[2]};
   return item;
  });
 } });
figTradeRatingsPage(m,{
 html:(id,str)=>{markup=str;node('#'+id).innerHTML=str;},
 el:node,escape:x=>String(x),money:x=>String(Math.round(x)),avatar:id=>'<i>'+id+'</i>',ownerLink:(name,id)=>name
});
assert.match(markup,/OVERALL TRADE RANKINGS/);
assert.match(markup,/TRADE HISTORY/);
assert.match(markup,/MOST LOPSIDED PARTNERSHIPS/);
assert.match(node('#figTrPartnershipRows').innerHTML,/Manager 1/);
assert.match(node('#figTrPartnershipRows').innerHTML,/Manager 2/);
assert.match(node('#figTrPartnershipRows').innerHTML,/fig-tr-partnership-gap/);
assert.match(node('#figTrPartnershipRows').innerHTML,/NET ADVANTAGE/);
assert.match(markup,/Total net value gained or lost/);
assert.match(markup,/HOW IS GAIN \/ LOSS CALCULATED/);
assert.doesNotMatch(markup,/RETURN %|OVERALL RETURN|AVG SCORE|GRADE|HIGHEST RETURN|LOWEST RETURN/);
assert.match(markup,/<option value="gain">VALUE GAINED<\/option>/);
assert.match(markup,/<option value="loss">VALUE LOST<\/option>/);
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/4 RATED/);
assert.match(node('#figTrResults').innerHTML,/Nothing received · 0 value/);
node('#figTrManager').onchange({target:{value:'1'}});
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/AGAINST EVERY MANAGER/);
assert.match(node('#figTrResults').innerHTML,/data-opponent="2"/);
node('#figTrVersus').onchange({target:{value:'2'}});
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/SHARED TRADES/);
assert.match(node('#figTrResults').innerHTML,/VALUE RECEIVED/);
assert.match(node('#figTrResults').innerHTML,/VALUE SENT/);
assert.match(node('#figTrResults').innerHTML,/VALUE GAINED/);
assert.match(node('#figTrResults').innerHTML,/VALUE LOST/);
// With a manager chosen, order by their signed net outcome, not return ratios.
node('#figTrSort').onchange({target:{value:'gain'}});
let sorted=node('#figTrResults').innerHTML;
assert.ok(sorted.indexOf('2025<small>W1')<sorted.indexOf('2024<small>W1'));
assert.ok(sorted.indexOf('2024<small>W1')<sorted.indexOf('2025<small>W2'));
node('#figTrSort').onchange({target:{value:'loss'}});
sorted=node('#figTrResults').innerHTML;
assert.ok(sorted.indexOf('2025<small>W2')<sorted.indexOf('2024<small>W1'));
assert.ok(sorted.indexOf('2024<small>W1')<sorted.indexOf('2025<small>W1'));
assert.doesNotMatch(sorted,/RETURN %|OVERALL RETURN|∞%/);
assert.match(node('#figTrResults').innerHTML,/LINEUP PTS/);
const firstPartner=node('#figTrPartnershipRows').querySelectorAll('.fig-tr-partnership-row')[0];
assert.ok(firstPartner);
node('#figTrClear').onclick();
assert.equal(typeof firstPartner.onclick,'function');
firstPartner.onclick();
assert.match(node('#figTrResults').innerHTML,/AGAINST EVERY MANAGER/);
assert.match(node('#figTrResults').innerHTML,/SHARED TRADES/);
node('#figTrAllOpponents').onclick();
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
const firstOpponent=node('#figTrResults').querySelectorAll('.fig-tr-opponent')[0];
assert.equal(firstOpponent.dataset.opponent,'2');
assert.equal(typeof firstOpponent.onclick,'function');
firstOpponent.onclick();
assert.match(node('#figTrResults').innerHTML,/SHARED TRADES/);
node('#figTrYear').onchange({target:{value:'2026'}});
assert.match(node('#figTrResults').innerHTML,/1 MATCHING TRADES/);
node('#figTrSearch').oninput({target:{value:'no matching asset'}});
assert.match(node('#figTrResults').innerHTML,/No trades match these filters/);
node('#figTrClear').onclick();
assert.match(node('#figTrResults').innerHTML,/4 MATCHING TRADES/);
assert.match(node('#figTrResults').innerHTML,/VALUE RECEIVED/);
assert.match(node('#figTrResults').innerHTML,/VALUE SENT/);
assert.match(node('#figTrResults').innerHTML,/Lineup points are shown separately and never added to value/);
assert.doesNotMatch(node('#figTrResults').innerHTML,/SENT OUTCOME|4×/);
const app=fs.readFileSync('app.js','utf8'),index=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert.ok(app.includes("const model=figTradeRatingModel(DATA,"));
assert.ok(app.includes('figTradeRatingsPage(model,'));
const tradeScript=index.match(/trade-ratings-v143\.js\?v=\d+/)?.[0];
assert.ok(tradeScript, 'trade module is versioned in the entrypoint');
assert.ok(index.includes('trade-ratings-v143.css?v=153'));
assert.ok(sw.includes(tradeScript), 'service worker and entrypoint use the same trade module version');
// Audit each partnership and manager against the published league data every refresh.
const liveData={
 trades:JSON.parse(fs.readFileSync('data/trades.json','utf8')),
 tradeSides:JSON.parse(fs.readFileSync('data/trade_sides.json','utf8')),
 tradeAssets:JSON.parse(fs.readFileSync('data/trade_assets.json','utf8')),
 playerLog:JSON.parse(fs.readFileSync('data/player_game_log.json','utf8')),
 draftAudit:JSON.parse(fs.readFileSync('data/draft_pick_outcomes_audit.json','utf8'))
};
const valuation=JSON.parse(fs.readFileSync('data/rosteraudit_values.json','utf8'));
const realHelpers={
 valuesReady:valuation.status==='ready',
 playerValue:id=>{
  if(id===null||id===undefined||id==='')return null;
  const value=valuation.players?.[String(id)]?.value;
  return value===undefined||value===null?0:Number(value);
 },
 pickValue:(y,r,o)=>{
  const year=Number(y),round=Number(r),origin=Number(o);
  const tier=origin===10?'early':origin===1||origin===6?'late':'mid';
  const priceYear=origin===10||year<2027?2027:year;
  return {value:valuation.future_picks?.[priceYear+':'+round+':'+tier]??null};
 },
 pickLabel:x=>x,name:(raw,id)=>raw||String(id)
};
const actual=figTradeRatingModel(liveData,realHelpers);
verifyPartnershipSums(actual);
// The 2023 W3 Boek/Fru/Winston transaction is the key allocation example.
const weekThree=actual.trades.find(t=>t.id==='1011844265183535104');
assert.ok(weekThree?.rated);
// Use current market values (which naturally change on every refresh).
// The 3-way trade still needs to balance exactly and allocate Boek's gain
// against each counterparty's loss, rather than the full gain to both.
const weekThreeNet=new Map(weekThree.participants.map(p=>[p.id,p.net]));
assert.deepEqual([...weekThreeNet.keys()].sort((a,b)=>a-b),[1,2,8]);
const gain=weekThreeNet.get(1),fruLoss=-weekThreeNet.get(2),winstonLoss=-weekThreeNet.get(8);
assert.ok(gain>0&&fruLoss>0&&winstonLoss>0);
assert.equal(gain,fruLoss+winstonLoss);
const weekThreePairs=figTradePairCredits(weekThree);
assert.equal(weekThreePairs.find(p=>p.key==='1:2').netA,fruLoss);
assert.equal(weekThreePairs.find(p=>p.key==='1:8').netA,winstonLoss);
assert.equal(weekThreePairs.find(p=>p.key==='1:2').netB,-fruLoss);
assert.equal(weekThreePairs.find(p=>p.key==='1:8').netB,-winstonLoss);
// In the focused trade view, the badges show opponent-allocated values.
const liveNodes={};
const liveNode=id=>liveNodes[id]??={innerHTML:'',value:'',dataset:{},
 querySelectorAll:()=>[],scrollIntoView(){}};
figTradeRatingsPage(actual,{
 html:(id,value)=>{liveNode('#'+id).innerHTML=value;},
 el:liveNode,escape:x=>String(x),money:x=>String(Math.round(x)),
 avatar:()=>'',ownerLink:n=>n
});
liveNode('#figTrManager').onchange({target:{value:'1'}});
liveNode('#figTrVersus').onchange({target:{value:'2'}});
liveNode('#figTrYear').onchange({target:{value:'2023'}});
let htmlText=liveNode('#figTrResults').innerHTML;
const weekThreeCard=htmlText.slice(htmlText.indexOf('2023<small>W3 · 3 TEAMS'));
assert.match(weekThreeCard,new RegExp(fruLoss+'<\\/strong><small>PAIR GAINED'));
assert.match(weekThreeCard,new RegExp(fruLoss+'<\\/strong><small>PAIR LOST'));
liveNode('#figTrVersus').onchange({target:{value:'8'}});
htmlText=liveNode('#figTrResults').innerHTML;
const winstonCard=htmlText.slice(htmlText.indexOf('2023<small>W3 · 3 TEAMS'));
assert.match(winstonCard,new RegExp(winstonLoss+'<\\/strong><small>PAIR GAINED'));
assert.match(winstonCard,new RegExp(winstonLoss+'<\\/strong><small>PAIR LOST'));
const allNames=new Map(actual.rankings.map(r=>[r.id,r.name]));
for(const season of actual.years){
 const rows=actual.trades.filter(t=>t.season===season);
 verifyPartnershipSums({
  trades:rows,partnerships:figTradePartnerships(rows,allNames)
 });
}
console.log('Multi-team pair allocations reconcile to every manager and all published trades.');
