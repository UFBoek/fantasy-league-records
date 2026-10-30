'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const base='https://ask-fig-ai.fig-league-archive.workers.dev';
 const health=await fetch(base+'/health',{signal:AbortSignal.timeout(15000)});
 assert.equal(health.status,200,'Cloudflare Worker health status');
 const status=await health.json();
 assert.equal(status.ok,true,'Cloudflare Worker health response');
 const origin='https://ufboek.github.io';
 const r=await fetch(base+'/interpret',{
  method:'POST',
  headers:{origin,'content-type':'application/json'},
  body:JSON.stringify({question:'Who has the most wins against Hayden?'}),
  signal:AbortSignal.timeout(30000)
 });
 const data=await r.json();
 assert.equal(r.status,200,'Cloudflare AI interpreter: '+JSON.stringify(data));
 assert.equal(r.headers.get('access-control-allow-origin'),origin);
 assert.equal(data.ok,true);
 assert.equal(data.plan.dataset,'games');
 assert.equal(data.plan.metric,'wins');
 assert.equal(data.plan.group_by,'team');
 assert.equal(data.plan.opponent_id,6);
 console.log('Ask FIG live Cloudflare Worker health, AI interpretation and CORS passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
