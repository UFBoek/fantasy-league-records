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
 const complex=await fetch(base+'/interpret',{method:'POST',headers:{origin,'content-type':'application/json'},
  body:JSON.stringify({question:'How many times did Boek lose while outscoring Hayden in the same week?'}),
  signal:AbortSignal.timeout(30000)});
 const complexJson=await complex.json();
 assert.equal(complex.status,200,'AI same-week interpretation: '+JSON.stringify(complexJson));
 assert.equal(complexJson.plan.team_id,1);
 assert.equal(complexJson.plan.result,'loss');
 assert.equal(complexJson.plan.compare_team_id,6);
 assert.equal(complexJson.plan.compare_direction,'higher');
 assert.equal(complexJson.plan.opponent_id,null);
 console.log('Ask FIG live Cloudflare Worker health, AI interpretation, same-week comparison and CORS passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
