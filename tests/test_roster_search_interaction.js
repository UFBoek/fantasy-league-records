'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const app=file('app.js');
const css=file('roster-search-contrast-v207.css');
const html=file('index.html');
const sw=file('sw.js');

// Source must still parse; accidental unmatched template literals can
// silently break the entire league's navigation.
assert.doesNotThrow(()=>new vm.Script(app,{filename:'app.js'}));

const team=app.slice(app.indexOf(' const renderPlayers=()=>{'),
  app.indexOf(' const renderRecords=()=>{'));
const player=app.slice(app.indexOf('async function players(){'),
  app.indexOf('async function playerBombLeaderboard('));

assert.match(team,/id="teamPlayerSearch"/);
assert.match(player,/id="playerRecordSearch"/);
assert.match(team,/id="teamPlayerResults"/);
assert.match(player,/id="playerRecordResults"/);
assert.match(team,/const draw=\(searchOnly=false\)=>/);
assert.match(player,/const render=\(searchOnly=false\)=>/);
assert.match(team,/if\(searchOnly&&results\)\{results\.innerHTML=tableHtml;return;\}/);
assert.match(player,/if\(searchOnly&&results\)\{results\.innerHTML=tableHtml;return;\}/);
assert.match(team,/inp\.oninput=e=>\{if\(e\.isComposing\)return;q=e\.target\.value\.toLowerCase\(\);draw\(true\)\}/);
assert.match(player,/q\.oninput=e=>\{if\(e\.isComposing\)return;playerQ=e\.target\.value\.toLowerCase\(\);render\(true\)\}/);
assert.doesNotMatch(team,/setTimeout\(\(\)=>\{const n=\$\('#teamPlayerSearch'/,
  'never replace and focus the team-record search on every typed letter');
assert.doesNotMatch(player,/setTimeout\(\(\)=>\{const n=\$\('#playerRecordSearch'/,
  'never replace and focus the player record-book search on every typed letter');
assert.match(team,/bindPills\('teamPos',v=>\{pos=v;draw\(\)\}\)/,
  'position filters retain existing full redraw and active button state');
assert.match(player,/bindPills\('playerPos',v=>\{playerPos=v;render\(\)\}\)/,
  'all-player book keeps interactive position filter');
assert.match(player,/bindPills\('playerSeason',v=>\{season=v;render\(\)\}\)/);
assert.match(player,/bindPills\('playerView',v=>\{view=v;render\(\)\}\)/);
assert.match(team,/const tableHtml=sortableTable\(/,'table retains sortable columns');
assert.match(player,/const tableHtml=sortableTable\(/,'all-player tables remain sortable');
assert.match(team,/playerLink\(x\.player_id,x\.player_name\)/,'player drilldowns stay linked');
assert.match(player,/playerLink\(x\.player_id,x\.full_name\)/,'league-wide record drilldowns stay linked');

assert.match(css,/\.fig-roster-dashboard \.fig-roster-boards \.sleeper-player-row\{/);
assert.match(css,/background:#ffffff!important/,'light team roster rows cannot inherit old navy rules');
assert.match(css,/\.fig-roster-player-copy b\{\s*color:#182b22!important/,
  'override the headshots stylesheet forced inherited text color');
assert.match(css,/\.fig-roster-player-copy small\{\s*color:#546559!important/,
  'position names also have accessible contrast');
assert.match(css,/sleeper-player-row:hover/,'hover state remains readable');
assert.match(css,/@media\(max-width:699px\)/,'phone contrast styling present');
assert.match(html,/roster-search-contrast-v207\.css\?v=207/);
assert.match(html,/app\.js\?v=207/);
assert.match(sw,/roster-search-contrast-v207\.css\?v=207/);
assert.match(sw,/app\.js\?v=\d+/,'the current app revision is cached');
assert.match(sw,/fig-league-shell-v\d+/,'service worker has a versioned cache');
console.log('Team roster readability, stable search focus, filter, sorting and navigation regressions passed');
