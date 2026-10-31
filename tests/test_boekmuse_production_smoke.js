'use strict';
const assert=require('node:assert/strict');
const origin='https://ufboek.github.io', base='https://boekmuse-sql.fig-league-archive.workers.dev';
(async()=>{
 const health=await fetch(base+'/health',{headers:{origin},signal:AbortSignal.timeout(120000)});
 const status=await health.json();
 console.log('HEALTH',health.status,JSON.stringify(status));
 assert.equal(health.status,200,'Production Worker must expose a healthy D1 mirror');
 assert.equal(status.ready,true,'Finalized historical SQL archive must remain available');
 assert.equal(status.archive.total,63,'All 63 published JSON sources must be discoverable');
 assert.ok(status.archive.sources>=0&&status.archive.sources<=status.archive.total);
 const q='Who drafted Josh Allen?';
 const result=await fetch(base+'/query',{method:'POST',headers:{origin,'content-type':'application/json'},
  body:JSON.stringify({question:q}),signal:AbortSignal.timeout(120000)});
 const answer=await result.json();
 console.log('QUERY',result.status,JSON.stringify(answer).slice(0,2400));
 assert.equal(result.status,200,'Production AI query must not fail with an HTTP error');
 assert.ok(answer.ok||answer.unsupported,'Query must produce a verified answer or explicit unsupported outcome');
 console.log('BoekMuse expanded production Worker smoke checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
