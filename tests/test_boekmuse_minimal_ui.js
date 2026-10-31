'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'league-ask-v220.js'),'utf8');
const css=fs.readFileSync(path.join(root,'league-ask-v220.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.doesNotMatch(js,/fig-ask-suggestions|TRY A QUESTION|const EXAMPLES=/);
assert.doesNotMatch(js,/View verified SQL calculation|boekmuse-query-details|WHAT I CALCULATED/);
assert.doesNotMatch(css,/fig-ask-suggestions|boekmuse-query-details/);
const original='module.exports={statsForGames,statsForPlayers,statsForTrades,statsForDrafts,scope,teamsIn};';
assert.ok(js.includes(original));
const script=js.replace(original,'module.exports={renderResult,resultAudit};');
const mod={exports:{}};
new Function('module',script)(mod);
const rendered=mod.exports.renderResult({ok:true,title:'Touchdown report',value:'40 TDs',
 context:'Boek 2026',columns:['Week','Touchdowns'],rows:[{values:['W1','4'],href:'#/game/2026/1/9'}],
 interpretation:{measure:'Rushing and receiving TDs',group:'Week',team:'Boek',scope:'2026',method:'Verified player stats'},
 note:'Source: Sleeper NFL player data',sql:'SELECT confidential_sql FROM starts'});
assert.match(rendered,/<div class="fig-ask-answer">/);
assert.match(rendered,/40 TDs/);
assert.match(rendered,/W1/);
assert.match(rendered,/<details class="boekmuse-audit"><summary>Answer details<\/summary>/);
assert.doesNotMatch(rendered,/<details[^>]*\bopen\b/);
assert.doesNotMatch(rendered,/WHAT I CALCULATED|View verified SQL calculation|SELECT confidential_sql/);
assert.ok(rendered.indexOf('Answer details')>rendered.indexOf('40 TDs'));
assert.ok(rendered.indexOf('Source: Sleeper')>rendered.indexOf('Answer details'));
assert.match(rendered,/Statistic:/);
const noExplanation=mod.exports.renderResult({ok:true,title:'Total',value:'8',context:'League',
 columns:['Value'],rows:[{values:['8']}],sql:'SELECT count(*) FROM games'});
assert.doesNotMatch(noExplanation,/<details/);
const error=mod.exports.renderResult({ok:false,message:'Data unavailable'});
assert.match(error,/No verified answer available/);
assert.doesNotMatch(error,/Answer details|verified SQL/);
assert.match(html,/league-ask-v220\.js\?v=236/);
assert.match(html,/league-ask-v220\.css\?v=225/);
assert.match(sw,/fig-league-shell-v236/);
assert.match(sw,/dynasty-dominance-v230\.js\?v=235/);
assert.match(sw,/league-ask-v220\.js\?v=236/);
assert.match(sw,/league-ask-v220\.css\?v=225/);
console.log('BoekMuse: no examples or SQL UI; method hidden in accessible details; answers and cache versions intact');
