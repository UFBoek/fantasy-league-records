const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {scoreStates,sample,winChance,MAX_LOSS_PER_ACTIVE_STARTER}
  =require('../playoff-live-score-bounds-v203.js');
const file=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
assert.equal(MAX_LOSS_PER_ACTIVE_STARTER,4);

const boq=Array.from({length:10},(_,i)=>'book'+i);
const hay=Array.from({length:10},(_,i)=>'hayden'+i);
const starters=[
 {roster_id:1,starters:boq,points:150.25,
  players_points:Object.fromEntries(boq.map((p,i)=>[p,i===0?35.25:115/9]))},
 {roster_id:6,starters:hay,points:142.25,
  players_points:Object.fromEntries(hay.map(p=>[p,14.225]))}
];
const live={};
boq.forEach((id,i)=>live[id]={points:i===0?35.25:115/9,phase:i===0?'LIVE':'FINAL'});
hay.forEach(id=>live[id]={points:14.225,phase:'FINAL'});
const states=scoreStates(starters,live);
assert.equal(states[1].earned,150.25,'Sleeper lineup score is the authoritative earned points');
assert.equal(states[6].earned,142.25);
assert.equal(states[1].floor,146.25,'one live NFL player can lose at most 4 modeled points');
assert.equal(states[1].liveCount,1);
assert.equal(states[1].allFinal,false);
assert.equal(states[6].allFinal,true,'all 10 players confirmed FINAL by NFL scoreboard');
assert.equal(states[6].floor,142.25);

assert.equal(winChance({a:states[1],b:states[6],aMean:174,bMean:148,aSd:15,bSd:0}),
  1,'Boek with 8-point lead and one unfinished player cannot fall enough under modeled loss allowance');
assert.equal(winChance({a:states[6],b:states[1],aMean:148,bMean:174,aSd:0,bSd:15}),
  0,'Hayden must show 0%, not 0.2%, if all starters finished and the gap is uncatchable');

let raw=sample({mean:130,sd:100,state:states[1],rng:()=>.99,normal:()=>-2});
assert.equal(raw,146.25,'Gaussian must not throw out already earned fantasy points');
raw=sample({mean:120,sd:100,state:states[6],rng:()=>.1,normal:()=>20});
assert.equal(raw,142.25,'all-final score is exact even if Gaussian goes wildly above it');

const bothFinal={...states[1],allFinal:true,liveCount:0,floor:150.25};
assert.equal(winChance({a:bothFinal,b:states[6],aMean:120,bMean:210,aSd:20,bSd:40}),
  1,'when both final, actual scores trump historical projections');
assert.equal(winChance({a:states[6],b:bothFinal,aMean:210,bMean:120,aSd:40,bSd:20}),
  0);
assert.equal(winChance({a:{...bothFinal,earned:142.25},b:states[6],
  aMean:180,bMean:180,aSd:10,bSd:10}),.5,'same final score returns tie probability');

const close={...states[1],earned:145,floor:141};
const chance=winChance({a:close,b:states[6],aMean:152,bMean:142.25,
 aSd:20,bSd:0,seed:0xbeef,draws:5000});
assert.ok(chance>0&&chance<1,'when negative plays could flip a narrow lead, retain uncertainty');

const hayNotFinished={...states[6],allFinal:false,liveCount:1,floor:138.25};
const comeback=winChance({a:states[1],b:hayNotFinished,aMean:158,bMean:154,
 aSd:15,bSd:15,seed:0x12345,draws:6000});
assert.ok(comeback<1&&comeback>0,'8-point lead must NOT auto-lock a win when Hayden also has a live player');

const spare={...starters[0],points:undefined};
const other=scoreStates([spare],live);
assert.ok(Math.abs(other[1].earned-150.25)<1e-10,'sum available starter scores if Sleeper row.points missing');
assert.deepEqual(scoreStates([{roster_id:1,starters:boq,points:null}],{}),{},
 'missing live score inputs should not create false earned-point floors');

const app=file('playoff-calculator-v167.js');
assert.match(app,/window\.figPlayoffScoreBounds\.scoreStates\(currentWeekLineups,liveActuals\)/,
 'derive team earned scores directly from LIVE Sleeper matchups');
assert.match(app,/lineupSource==='LIVE'/,'never trust a potentially stale archived roster snapshot');
assert.match(app,/s\.weekScoreState=scoreStates\[t\.id\]\|\|null/);
assert.match(app,/window\.figPlayoffScoreBounds\.sample/,'Monte Carlo points are bounded');
assert.match(app,/window\.figPlayoffScoreBounds\.winChance/,'H2H win chances use same scoring rules');
assert.match(app,/delete s\.weekScoreState/,'clear old live state when week advances');
const html=file('index.html'),sw=file('sw.js');
assert.ok(html.indexOf('playoff-live-score-bounds-v203.js')<
  html.indexOf('playoff-calculator-v167.js'));
assert.match(sw,/playoff-live-score-bounds-v203\.js\?v=203/);
console.log('Live earned point floors, finished opponent 0%, active comeback, and Monte Carlo tests passed');
