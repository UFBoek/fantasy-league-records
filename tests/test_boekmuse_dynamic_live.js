'use strict';
const assert=require('node:assert/strict');
const base='https://boekmuse-sql-preview.fig-league-archive.workers.dev';
const origin='https://ufboek.github.io';
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
async function json(path,method='GET',body){
 const res=await fetch(base+path,{method,headers:{origin,'content-type':'application/json'},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 const data=await res.json();
 return {status:res.status,data};
}
(async()=>{
 const start=await json('/bootstrap');
 assert.ok([200,202].includes(start.status),'Bootstrap: '+JSON.stringify(start));
 let ready=false;
 for(let i=0;i<45;i++){
  const h=await json('/health');
  if(h.data.ready){ready=true;console.log('READY',JSON.stringify(h.data));break;}
  if(i%3===0)console.log('Waiting for published league archive sync...',i);
  await sleep(4000);
 }
 assert.ok(ready,'D1 database did not finish syncing finalized published archive');
 const questions=[
  'How many non-QB rushing and receiving touchdowns did Boek starters score each week in 2026?',
  'Which teams have had three starting WRs score at least 20 fantasy points in the same week?',
  'How many times did Boek outscore Hayden in the same week yet lose his matchup?',
  'Which manager drafted Josh Allen?'
 ];
 for(const q of questions){
  const result=await json('/query','POST',{question:q});
  console.log('QUESTION',q,'STATUS',result.status,'RESPONSE',JSON.stringify(result.data).slice(0,2400));
  assert.equal(result.status,200,'Query HTTP failure');
  assert.equal(result.data.ok,true,'Query must return verified results: '+q);
  assert.ok(Array.isArray(result.data.rows)&&result.data.rows.length,'No result rows for '+q);
  assert.ok(result.data.sql.trim().match(/^(SELECT|WITH)/i),'SQL must be read-only');
 }
 const reject=await json('/query','POST',{question:'DROP TABLE starts;'});
 console.log('SAFETY',reject.status,JSON.stringify(reject.data).slice(0,300));
 assert.ok(reject.status===200&&reject.data.ok===false||reject.status===429);
 console.log('BoekMuse v2 live dynamic SQL test passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
