'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'workers/boekmuse-v2/src/index.js'),'utf8');
const loader=new Function(source.replace('export default {','const handler = {')+
 '\nreturn {sqlClean,questionGuard,snapshotRows,SCHEMA,QUERY_SCHEMA,runQuery};');
const api=loader();
for(const sql of [
 'SELECT team_id,COUNT(*) AS games_played FROM games GROUP BY team_id',
 'WITH weekly AS (SELECT team_id,season,week,COUNT(*) AS n FROM starts WHERE position=\'WR\' AND fantasy_points>=20 GROUP BY team_id,season,week) SELECT * FROM weekly WHERE n>=3',
 'SELECT a.team_id,a.season,a.week FROM games a JOIN games b ON a.season=b.season AND a.week=b.week WHERE a.team_id=1 AND b.team_id=6 AND a.points>b.points AND a.loss=1'
])assert.equal(api.sqlClean(sql),sql);
for(const sql of [
 'DELETE FROM starts_all',
 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c) SELECT * FROM c',
 'SELECT * FROM sqlite_master',
 'SELECT * FROM games; DROP TABLE games',
 'SELECT * FROM sync_meta',
 'SELECT * FROM games -- ignore',
 'SELECT randomblob(1000000) FROM games'
])assert.throws(()=>api.sqlClean(sql),{message:/denied|allowed|permitted|unsafe|SQL|Internal|not available|comments|operation/});
assert.throws(()=>api.questionGuard('How many touchdowns did Boek starters score?',
 'SELECT team_id,COUNT(*) FROM games GROUP BY team_id'),/Touchdown questions require/);
assert.doesNotThrow(()=>api.questionGuard('How many touchdowns did Boek starters score?',
 'SELECT week,SUM(td) FROM starts JOIN td_coverage USING (season,week,game_type,team_id) GROUP BY week'));
const sample={
 games:[{season:'2026',week:7,game_type:'Regular Season',franchise_1:1,franchise_2:6,
  score_1:225.94,score_2:209.98,matchup_id:9}],
 player_game_log:[
 {season:'2026',week:7,game_type:'Regular Season',franchise_id:1,player_id:'9509',player_name:'Bijan Robinson',position:'RB',starter_points:18.3},
 {season:'2026',week:7,game_type:'Regular Season',franchise_id:1,player_id:'421',player_name:'Josh Allen',position:'QB',starter_points:37}],
 player_weekly_touchdowns:{
  records:[{season:2026,week:7,game_type:'Regular Season',franchise_id:1,player_id:'9509',rush_td:1,rec_td:1,touchdowns:2}],
  coverage:{'2026:7:Regular Season:1':['9509']}},
 team_season_master:[{season:2026,franchise_id:1,games:7,wins:7,losses:0,points_for:1644,points_per_game:235}],
 trades:[{transaction_id:'123',season:2026,week:1,total_player_assets:1,total_pick_assets:1,total_faab_transferred:0}],
 trade_sides:[{transaction_id:'123',franchise_id:1,received_asset_count:1,sent_asset_count:1,
  players_received:1,players_sent:0,picks_received:0,picks_sent:1,assets_received:['Josh Allen'],assets_sent:['2027 Round 1']}],
 draft_picks:[{draft_season:2026,franchise_id:1,round:1,pick_no:4,player_id:'999',player_name:'Test Player',position:'RB',draft_class:'rookie'}]
};
const rows=api.snapshotRows(sample,123);
assert.equal(rows.games.length,2);
assert.equal(rows.starts.length,2);
assert.equal(rows.td_coverage.length,1);
assert.equal(rows.trade_assets.length,2);
assert.equal(rows.trade_participants.length,1);
assert.equal(rows.starts[0][11],2,'Actual non-QB touchdowns used');
assert.equal(rows.starts[1][11],null,'No fake QB TD count');
assert.equal(rows.starts[0][12],1,'Verified TD coverage flag');
assert.equal(rows.starts[1][12],0,'QB not considered part of non-QB TD coverage');
const client=require('../boekmuse-dynamic.js');
assert.ok(client.isFollowup('What about 2025?'));
assert.equal(client.isFollowup('How many TDs did Boek score in 2026?'),false);
const page=client.resultToPage({title:'WR trio',understood:'Three WRs over 20 in one week',
 columns:['team_id','season','week','wr_count'],rows:[{team_id:1,season:2026,week:7,wr_count:3}],
 sql:'SELECT team_id,season,week,COUNT(*) AS wr_count FROM starts GROUP BY team_id,season,week'});
assert.equal(page.ok,true);
assert.equal(page.rows[0].values[0],'Boek');
assert.equal(page.rows[0].href,'#/teamseason/1/2026');
assert.ok(page.sql.startsWith('SELECT'));
console.log('BoekMuse v2: general SQL, destructive SQL bans, verified TDs, joins, data normalization, and frontend result tests passed');
