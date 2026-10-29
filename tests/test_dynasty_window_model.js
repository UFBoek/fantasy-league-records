/* Deterministic regression suite for position-specific ages and transparent rankings. */
'use strict';
const assert=require('node:assert/strict');
const model=require('../dynasty-window-model-v210.js');
const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,String(a)+' != '+String(b));
eq(Object.values(model.weights.current).reduce((a,b)=>a+b,0),1);
eq(Object.values(model.weights.future).reduce((a,b)=>a+b,0),1);
eq(model.ageFactor('QB',26),1.08);
eq(model.ageFactor('QB',38),.72);
eq(model.ageFactor('RB',22),1.08);
eq(model.ageFactor('RB',28),.62);
eq(model.ageFactor('WR',26),1.08);
eq(model.ageFactor('WR',32),.74);
eq(model.ageFactor('TE',28),1.08);
eq(model.ageFactor('TE',35),.84);
assert.equal(model.ageFactor('QB',null),null);
assert.equal(model.ageFactor('QB',0),null);
assert.equal(model.ageFactor('QB',99),null);
assert.equal(model.isYoung('QB',27),true);
assert.equal(model.isYoung('RB',25),false);
assert.equal(model.isYoung('WR',25),true);
const target=model.projected([100,110,105,120,130,125,140],[90,80,100]);
eq(target.ppg,.65*(830/7)+.35*((130+125+140)/3));
assert.ok(Number.isFinite(target.cv));
assert.equal(model.projected([90,100,110,120],[]),null);
const players={},teams=[],ranks=[];
for(let id=1;id<=10;id++){
 const roster=[];
 for(let i=0;i<18;i++){
  const position=['QB','RB','WR','TE'][i%4],pid=String(id)+'-'+String(i);
  const value=5000+(10-id)*125+i*5;
  players[pid]=value;
  roster.push({player_id:pid,position,age:25+(id%3),is_starter:i<10,is_taxi:false,is_reserve:false});
 }
 teams.push({id,value:roster.reduce((s,p)=>s+players[p.player_id],0)+id*950,
              picks:id*950,roster});
 for(let week=1;week<=7;week++){
   ranks.push({season:2026,week,franchise_id:id,points_for:(11-id)*12+110+week*.9});
 }
}
const input={teams,weeklyRanks:ranks,season:2026,playerValue:id=>players[id]??0};
const out=model.calculate(input);
assert.equal(out.rows.length,10);
assert.equal(out.available,true);
assert.ok(out.rows.every(r=>r.current>=0&&r.current<=100&&r.future>=0&&r.future<=100));
assert.ok(out.rows.every(r=>r.ageCoverage===1&&r.readyAge));
assert.ok(out.rows.every(r=>r.model.sd>=0&&r.model.sample===7));
assert.ok(out.rows.some(r=>r.raw.ageCore>0&&r.raw.youngCore>0));
const noAge={...input,teams:structuredClone(input.teams)};noAge.teams[0].roster.forEach(p=>{p.age=null;});
const partial=model.calculate(noAge);
const first=partial.rows.find(r=>r.id===1);
assert.equal(first.future,null);
assert.equal(first.label,'Awaiting verified data');
assert.equal(partial.available,false);
assert.ok(partial.rows.find(r=>r.id===2).future!==null);
console.log('Dynasty model weights, ages, sample guard, team independence and missing-age gating passed');
