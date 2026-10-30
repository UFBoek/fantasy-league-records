'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const model=require('../scripts/dynasty_dominance_model');
const {scoreCheck}=require('../scripts/audit_dynasty_value_age');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',n+'.json'),'utf8'));
const roster=read('current_roster'),values=read('rosteraudit_values'),nfl=read('playoff_nfl_weekly_scores');
const check=scoreCheck(roster,values,nfl);
assert.ok(check.total>=300);
for(const pos of ['QB','RB','WR','TE']){
 assert.ok(check.by_position[pos].n>=20);
 assert.ok(check.by_position[pos].revised_mae<check.by_position[pos].previous_mae,
   pos+' value anchor should be closer to same-date full-week 2026 scoring');
}
assert.ok(check.all_mae<check.old_all_mae);
const rand=()=>({normal:()=>0,u:()=>.99});
const profile={id:'test',name:'Young WR',pos:'WR',age:23,baseYear:2026,
 basePpg:12,marketValue:9600,samples:12,rookie:false};
const score=(p,year,strength=1)=>model.scorePlayer(p,year,rand(),1,{valuationBlendStrength:strength});
const low=score(profile,2030,0),high=score(profile,2030,1);
assert.ok(high>low+3,'Value-driven model must project more future scoring for high-valued underproducing young stars');
const lowVal=score({...profile,marketValue:600},2030);
assert.ok(high>lowVal+5,'Higher market value must materially affect distant projected PPG');
const oldRB={...profile,name:'Old RB',pos:'RB',age:31,basePpg:18,marketValue:2500};
assert.ok(score(oldRB,2032)<score(oldRB,2027),'RB must decline significantly past prime even with a strong starting production season');
assert.ok(score({...profile,marketValue:null},2030,1)===
 score({...profile,marketValue:null},2030,0),
 'Missing RosterAudit market values cannot be silently treated as zero-valued players');
assert.ok(score({...profile,rookie:true,marketValue:null,age:21.5,baseYear:2029},2030,1)===
 score({...profile,rookie:true,marketValue:null,age:21.5,baseYear:2029},2030,0),
 'Unidentified future rookies must not be assigned fictional current market values');
assert.ok(model.marketPpg('RB',10000)>model.marketPpg('RB',2500));
assert.ok(model.marketPpg('WR',10000)>model.marketPpg('WR',2000));
const entire=read('weekly_scoring_ranks'),logs=read('player_game_log');
const input={roster,values,nflCurrent:nfl,nflHistory:read('dynasty_nfl_history'),
 weekly:entire,logs,picks:read('current_future_picks'),drafts:read('draft_picks')};
const result=model.runModel({...input,runs:12,seed:4629});
assert.equal(result.version,'experimental-v2.2-value-age');
assert.equal(result.scenario.valuationBlendStrength,1);
assert.ok(result.seasons[2032].player_projections[1].length>result.seasons[2027].player_projections[1].length);
const repeated=model.runModel({...input,runs:12,seed:4629});
assert.deepEqual(result,repeated);
assert.throws(()=>model.runModel({...input,runs:1,scenario:{valuationBlendStrength:4}}),/Invalid research scenario/);
console.log('RosterAudit value+age blended scoring: no double aging, player ranking, missing-price fallback and reproducibility tests passed');
