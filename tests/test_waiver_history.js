/* Regression checks for waiver classification and four-factor Manager IQ. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function moduleExports(path){
 const window={};
 vm.runInNewContext(fs.readFileSync(path,'utf8'),{window,console});
 return window;
}
const {figWaiverHistoryModel}=moduleExports('waiver-history-v156.js');
const {figManagerRatingModel}=moduleExports('manager-ratings-v155.js');
const t=(id,type,ms,adds,drops={})=>({
 transaction_id:id,transaction_type:type,status:'complete',
 created_timestamp:Date.parse(ms),season:Number(ms.slice(0,4)),week:1,adds,drops
});
const dataset={
 transactions:[
  t('1','free_agent','2024-09-01T10:00:00Z',{'101':1},{'102':1}),
  t('2','waiver','2024-09-02T10:00:00Z',{'101':1}),
  t('3','waiver','2024-09-03T10:00:00Z',{'201':2}),
  t('4','trade','2024-09-04T10:00:00Z',{'999':1}),
  t('5','commissioner','2024-09-05T10:00:00Z',{'999':1}),
  t('6','free_agent','2023-12-17T05:54:00Z',{'999':1}),
 ],
 waiverNames:{'101':{name:'Pickup One',position:'RB'},'102':{name:'Dropped One',position:'WR'}},
 raValues:{players:{'101':{value:2000},'102':{value:300},'201':{value:500}}}
};
const worth=id=>dataset.raValues.players[id]?.value??0;
const waiver=figWaiverHistoryModel(dataset,{names:{1:'Alpha',2:'Beta'},valuesReady:true,playerValue:worth});
const a=waiver.teams[0],b=waiver.teams[1];
assert.equal(a.adds.length,2);
assert.equal(a.uniqueAdds.length,1);
assert.equal(a.uniqueAdds[0].events.length,2);
assert.equal(a.uniqueAdds[0].name,'Pickup One');
assert.equal(a.uniqueDrops.length,1);
assert.equal(a.top10Value,2000);
assert.equal(a.droppedValue,300);
assert.equal(b.top10Value,500);
assert.equal(waiver.teams[0].uniqueAdds.some(x=>x.id==='999'),false);
const missing=figWaiverHistoryModel(dataset,{names:{},valuesReady:false,playerValue:worth});
assert.equal(missing.teams[0].top10Value,null);
const common={
 draftPicks:[{franchise_id:1,draft_class:'Rookie'},{franchise_id:2,draft_class:'Rookie'}],
 rosterSeason:[
  {franchise_id:1,season:2025,wins:1,losses:0,ties:0,points_for_sleeper:90,max_pf:100},
  {franchise_id:2,season:2025,wins:1,losses:0,ties:0,points_for_sleeper:60,max_pf:100}
 ],
 leagueSettings:[{season:2025,status:'complete',settings_json:'{}'}]
};
const trade={rankings:[
 {id:1,net:1000,rated:3,wins:2,losses:1,ties:0},
 {id:2,net:-1000,rated:3,wins:1,losses:2,ties:0}
]};
const ratings=figManagerRatingModel(common,trade,{
 names:{1:'Alpha',2:'Beta'},name:id=>id===1?'Alpha':'Beta',
 waiver,draftGrade:()=>({current:100,delta:10}),
 draftSummary:()=>({score:3,ratio:1,valued:1,eligible:1,letter:'B'})
});
assert.deepEqual(JSON.parse(JSON.stringify(ratings.weights)),{draft:.35,trade:.35,lineup:.20,waiver:.10});
for(const row of ratings.rows){
 assert.ok(Number.isInteger(row.waiverScore));
 assert.equal(row.rating,Math.round(.35*row.draftScore+.35*row.tradeScore+
  .20*row.lineupScore+.10*row.waiverScore));
}
assert.equal(ratings.rows[0].id,1);
console.log('Waiver History and four-factor Manager IQ checks passed.');
