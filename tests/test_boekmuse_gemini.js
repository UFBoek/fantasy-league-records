'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../workers/boekmuse-v2/src/index.js'),'utf8');
const api=new Function(source.replace('export default {','const handler = {')+
 '\nreturn {interpret,interpretGemini,GEMINI_MODEL};')();
const example={supported:true,sql:'SELECT team_id, COUNT(*) AS wins FROM games GROUP BY team_id',
 title:'Team wins',understood:'All seasons and teams',reason:''};
let calls=0;
const env={GEMINI_API_KEY:'private-test-key',AI:{run:async()=>{
 calls++;return {response:example};
}}};
(async()=>{
 const original=globalThis.fetch;
 try{
  let captured;
  globalThis.fetch=async(url,opts)=>{
   captured={url,opts};
   return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(example)}]}}]})};
  };
  const one=await api.interpret(env,'Who has the most wins?',null,'','');
  assert.equal(one.ai_provider,'gemini');
  assert.equal(one.model,'gemini-3.8-flash');
  assert.deepEqual(one.plan,example);
  assert.equal(calls,0,'Working Gemini must bypass Workers AI');
  assert.equal(captured.opts.headers['x-goog-api-key'],'private-test-key');
  assert.equal(captured.opts.headers['content-type'],'application/json');
  assert.ok(!captured.opts.body.includes('private-test-key'),'Secret must never appear in prompt/body');
  const req=JSON.parse(captured.opts.body);
  assert.equal(req.generationConfig.responseMimeType,'application/json');
  assert.equal(req.generationConfig.responseSchema.type,'object');
  assert.ok(req.systemInstruction.parts[0].text.includes('games('));
  assert.ok(captured.url.includes('/gemini-3.8-flash:generateContent'));

  globalThis.fetch=async()=>({ok:false,status:429});
  const two=await api.interpret(env,'Who has the most wins?',null,'','');
  assert.equal(two.ai_provider,'workers-ai-fallback','Rate-limited Gemini must preserve search');
  assert.equal(calls,1);

  globalThis.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'not JSON'}]}}]})});
  const three=await api.interpret(env,'Who has the most wins?',null,'','');
  assert.equal(three.ai_provider,'workers-ai-fallback','Malformed Gemini JSON must not be trusted');
  assert.equal(calls,2);

  globalThis.fetch=async()=>{throw Error('Gemini must not be called without a secret');};
  const four=await api.interpret({AI:env.AI},'Who has the most wins?',null,'','');
  assert.equal(four.ai_provider,'workers-ai');
  assert.equal(calls,3);
  console.log('Gemini primary planner, structured SQL, secret isolation and safe fallbacks passed');
 }finally{globalThis.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
