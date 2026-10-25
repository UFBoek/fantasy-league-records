const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {rankGames,MIN_SWING}=require('../playoff-implication-rank-v202.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

// Both win branches must have enough Monte Carlo samples. Each nested
// conditional numerator is a count of outcomes for the matching winner.
function game(key,a,b,week,counts={made:[1000,1000],one:[0,0],bye:[0,0]},opts={}){
  const entry={key,a,b,week,count:opts.count||[1000,1000],locked:!!opts.locked};
  for(const metric of ['made','one','bye'])entry[metric]=[
    {'1':counts[metric]?.[0]||0,'2':metric==='one'?200:400,'4':350},
    {'1':counts[metric]?.[1]||0,'2':metric==='one'?400:400,'4':350}
  ];
  return entry;
}
assert.equal(MIN_SWING,.01);
const oneSeed=game('7_1_2',1,2,7,{made:[1000,1000],one:[550,240],bye:[900,900]});
let picked=rankGames({[oneSeed.key]:oneSeed},1);
assert.equal(picked.own.length,1,'Boek still sees first-seed relevant own games');
assert.equal(picked.others.length,0,'do not generate league-wide filler games');
assert.equal(picked.own[0].metric,'one','100% playoff lock switches to 1 seed odds');
assert.equal(picked.own[0].metricLabel,'1 SEED ODDS');
assert.equal(picked.own[0].swing,.31);
assert.equal(picked.own[0].forA,.55);
assert.equal(picked.own[0].forB,.24);
assert.equal(picked.own[0].participants[1].win,.4);
assert.equal(picked.own[0].participants[1].loss,.2,'other manager WIN corresponds to right-side odds');

const playoff=game('8_1_2',1,2,8,{made:[600,300],one:[270,250],bye:[430,390]});
picked=rankGames({[playoff.key]:playoff},1);
assert.equal(picked.own[0].metric,'made','playoff swing beats low-value seeding swings');
assert.ok(Math.abs(picked.own[0].swing-.3)<1e-12);

const top3=game('9_1_2',1,2,9,{made:[1000,1000],one:[0,0],bye:[680,440]});
picked=rankGames({[top3.key]:top3},1);
assert.equal(picked.own[0].metric,'bye','show top-three bye odds when playoff/1-seed have no swing');
assert.equal(picked.own[0].metricLabel,'TOP-3 BYE ODDS');

const negligible=game('10_1_2',1,2,10,{made:[1000,996],one:[40,39],bye:[850,845]});
picked=rankGames({[negligible.key]:negligible},1);
assert.deepEqual(picked,{own:[],others:[]},'never include games with only 0.1–0.5pp swings');

const other=game('11_2_4',2,4,11,{made:[1000,1000],one:[600,200],bye:[1000,1000]});
picked=rankGames({[other.key]:other},1);
assert.equal(picked.others.length,1,'other-team matchup can affect Boek first seed');
assert.equal(picked.others[0].metricLabel,'1 SEED ODDS');

const locked=game('12_1_2',1,2,12,{made:[600,300],one:[800,200],bye:[800,200]},{locked:true});
const insufficient=game('13_1_2',1,2,13,{made:[600,300],one:[800,200],bye:[800,200]},{count:[149,1000]});
const james=game('14_1_10',1,10,14,{made:[600,300],one:[800,200],bye:[800,200]});
picked=rankGames({locked,insufficient,james},1);
assert.deepEqual(picked,{own:[],others:[]},
 'exclude already picked, unreliable conditional samples, and historically excluded James matchups');

const games={};
for(let i=0;i<5;i++) {
 const key='item-'+i;
 games[key]=game(key,1,2,i+7,{made:[1000,1000],one:[500+100*i,400],bye:[1000,1000]});
}
picked=rankGames(games,1);
assert.equal(picked.own.length,3,'show at most three, not necessarily exactly three');
assert.deepEqual(picked.own.map(x=>x.game.key),['item-4','item-3','item-2'],
 'strongest meaningful first-seed swings appear first');

const app=read('playoff-calculator-v167.js'),html=read('index.html'),sw=read('sw.js');
assert.match(app,/one:\[\{\},\{\}\]/,'conditional 1-seed counters exist in Monte Carlo');
assert.match(app,/if\(i===0\)x\.one\[side\]\[id\]/,'Monte Carlo records first-seed conditional samples');
assert.match(app,/window\.figPlayoffImplicationRanking\.rankGames/,'team detail uses filtered ranking');
assert.match(app,/BIGGEST PLAYOFF & SEEDING GAMES/);
assert.match(app,/entry\.metricLabel/,'show exact implication category on each game');
assert.match(app,/biggest\.own\.length\|\|biggest\.others\.length/,'no empty filler section');
assert.match(app,/pcl-implication-single/,'one qualifying list can stand alone');
assert.doesNotMatch(app,/No eligible unpicked matchups to highlight/);
assert.doesNotMatch(app,/Other matchups need valid simulation samples/);
assert.ok(html.indexOf('playoff-implication-rank-v202.js')<html.indexOf('playoff-calculator-v167.js'));
assert.match(sw,/playoff-implication-rank-v202\.js\?v=202/);
console.log('Adaptive playoff, 1-seed, bye impact ranking and no-filler regression tests passed');
