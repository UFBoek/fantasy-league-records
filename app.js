const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const app=$('#app'), DATA={};
const fileMap={league:'league_history',games:'games',standingsCareer:'standings_career',standingsSeasons:'standings_seasons',allPlayCareer:'all_play_career',allPlaySeasons:'all_play_seasons',luckSeasons:'luck_seasons',playoffs:'playoffs',playoffCareer:'playoff_career',h2h:'h2h',rivalries:'rivalries',streaks:'streaks',records:'records',playerLog:'player_game_log',playerCareers:'player_careers',playerSeasons:'player_seasons',franchiseCareer:'franchise_player_career',franchiseSeason:'franchise_player_season',positions:'franchise_positions',leaders:'franchise_player_leaders',draftPicks:'draft_picks',draftAudit:'draft_pick_outcomes_audit',draftValue:'draft_value',trades:'trades',tradeSides:'trade_sides',tradeAssets:'trade_assets',tradeLineage:'trade_lineage',transactions:'transactions',waiver:'waiver_fa',teamSeasonMaster:'team_season_master',currentStandings:'current_standings_web',currentRoster:'current_roster',currentPicks:'current_future_picks',currentAssets:'current_team_assets',weeklyRosters:'weekly_full_rosters',weeklyRanks:'weekly_scoring_ranks',websiteStreaks:'website_streaks',singleSeasonRecords:'single_season_records',teamSeasonTop3:'team_season_top3',completedAccomplishments:'completed_accomplishments',allGames:'all_games',raValues:'rosteraudit_values'};
const JACK_ID=1,HAYDEN_ID=6;
const OWNER_DISPLAY_BY_ID={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
// Permanent, franchise-ID keyed images; independent of Sleeper refreshes.
const OWNER_AVATAR_BY_ID={1:'assets/avatars/boek.webp',2:'assets/avatars/fru.webp',3:'assets/avatars/fromm.webp',4:'assets/avatars/sack.webp',5:'assets/avatars/leyton.webp',6:'assets/avatars/hayden.webp',7:'assets/avatars/line.webp',8:'assets/avatars/winston.webp',9:'assets/avatars/camnol.webp',10:'assets/avatars/james.webp'};
// Direct read-only Sleeper CDN headshots. Avoid fetching the entire NFL player
// directory for page views; archived player logs already provide each player ID.
// A visible initials tile remains when a player is retired, ID is a defense,
// or Sleeper has no image available.
function playerHeadshot(id,name,cls='fig-nfl-photo'){
 const safeId=String(id??'').trim();
 const visible=String(name||'').trim();
 const letters=visible.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()||'NFL';
 const src=/^[0-9]{1,12}$/.test(safeId)&&safeId!=='0'
   ? 'https://sleepercdn.com/content/nfl/players/thumb/'+safeId+'.jpg' : '';
 return `<span class="fig-nfl-photo ${esc(cls)}" aria-hidden="true"><span class="fig-nfl-photo-fallback">${esc(letters)}</span>${src?`<img src="${src}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:''}</span>`;
}
function playerLink(id,name,cls='fig-player-person'){
 return `<a class="${cls}" href="#/player/${encodeURIComponent(id)}">${playerHeadshot(id,name)}<span class="fig-player-person-name">${esc(name)}</span></a>`;
}
// Capturing image failures prevents broken-image icons without retry storms.
document.addEventListener('error',event=>{
 const img=event.target;
 if(img?.tagName==='IMG'&&img.closest?.('.fig-nfl-photo'))img.remove();
},true);
window.playerHeadshot=playerHeadshot;
function ownerAvatar(id,cls){const url=OWNER_AVATAR_BY_ID[+id];return url?`<img class="${cls}" src="${url}" alt="${esc(displayOwnerName('',id))} avatar" loading="lazy" decoding="async">`:`<div class="${cls}" aria-label="No avatar available"></div>`;}
const OWNER_DISPLAY_BY_RAW={jackboek1:'Boek',jackboek:'Boek',mattboek21:'Fru',mattboek:'Fru',eph99:'Fromm',Jdub95:'Sack',jdub95:'Sack',lbracke:'Leyton',HaydenM:'Hayden',haydenm:'Hayden',LionelColl:'Line',lionelcoll:'Line',Wincollins2:'Winston',wincollins2:'Winston',nolanfm13:'CamNol',nolanfm:'CamNol',Jamest33:'James',jamest33:'James'};
function displayOwnerName(name,id){return OWNER_DISPLAY_BY_ID[+id]||OWNER_DISPLAY_BY_RAW[String(name||'')]||OWNER_DISPLAY_BY_RAW[String(name||'').toLowerCase()]||String(name||'')}
const money=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
const pct=n=>`${Number(n||0).toFixed(1)}%`, num=n=>Number(n||0);
const initials=(name,id)=>displayOwnerName(name,id).replace(/[^A-Za-z0-9]/g,' ').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function parseMaybeJSON(v){if(Array.isArray(v))return v;try{return JSON.parse(v)}catch{return v?[String(v)]:[]}}
async function load(keys){await Promise.all(keys.map(async k=>{if(DATA[k])return;const r=await fetch(`data/${fileMap[k]}.json`,k==='raValues'?{cache:'no-cache'}:undefined);if(!r.ok)throw new Error(`Could not load ${fileMap[k]}`);const payload=await r.json();if(k==='playerLog'){if(!Array.isArray(payload))throw new Error('Player Records data must be an array');DATA[k]=payload.map(x=>({...x,player_name:x.player_name||x.full_name||'',starter_points:x.starter_points??x.fantasy_points}));}else DATA[k]=payload}))}
function navActive(route){$$('.top-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#/${route}`))}
function hero(eyebrow,title,copy,stats=[]){return `<section class="hero"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${stats.length?`<div class="hero-strip">${stats.map(s=>`<div class="hero-stat"><div class="k">${s.value}</div><div class="l">${s.label}</div></div>`).join('')}</div>`:''}</section>`}
function section(title,body,note=''){return `<section class="section"><div class="section-head"><h2 class="section-title">${title}</h2>${note?`<div class="section-note">${note}</div>`:''}</div>${body}</section>`}
function cards(items){return `<div class="card-grid">${items.map((x,i)=>`<div class="card ${i===0?'dark':''}"><div class="card-label">${x.label}</div><div class="card-value">${x.value}</div><div class="card-sub">${x.sub||''}</div></div>`).join('')}</div>`}
function ownerBadges(id){return `${+id===JACK_ID?'<span class="identity-badge commish" title="Commissioner">C</span>':''}`}
// Show portraits on team links and featured leaders, not every passing mention.
function ownerName(name,id){return `<span class="fig-team-name">${esc(displayOwnerName(name,id))}${ownerBadges(id)}</span>`}
function ownerLink(name,id){const pic=OWNER_AVATAR_BY_ID[+id]?ownerAvatar(id,'fig-team-avatar'):'';return `<a class="fig-owner-link" href="#/team/${id}"><span class="fig-team-identity">${pic}<span class="fig-team-identity-name">${esc(displayOwnerName(name,id))}</span>${ownerBadges(id)}</span></a>`}
function humanMetric(m){const map={total_points:'Total points',average_points:'Points per start',highest_score:'Best game',starts:'Starts',games_125:'125+ games',games_150:'150+ games',games_175:'175+ games',games_180:'180+ games',games_190:'190+ games',games_200:'200+ games',games_225:'225+ games',games_250:'250+ games',games_275:'275+ games',games_300:'300+ games',point_differential:'Point differential',median_score:'Median score'};return map[m]||String(m||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
const bombLabelForScore=s=>num(s)>=50?'50 BOMBS':num(s)>=40?'40 BOMBS':num(s)>=30?'30 BOMBS':num(s)>=20?'20 BOMBS':num(s)>=0&&num(s)<10?'5 BOMBS':null;
// Career and season scoring-average records duplicate the corresponding total
// points leaderboards for completed, equal-length seasons. Keep underlying
// averages available as ordinary stats, but not as record-book categories.
const excludedSingleSeasonRecord=x=>String(x?.record_category||'')==='All-Play Wins';
const redundantScoreAverageRecord=x=>['Career Scoring Average','Season Scoring Average','Scoring Average'].includes(String(x?.record_category||x?.category||''));
function teamBombLeaderboard(view,season=null){
 const ids=DATA.standingsCareer||[];const out={};ids.forEach(x=>out[+x.franchise_id]={franchise_id:+x.franchise_id,owner_name:x.owner_name,b5:0,b20:0,b30:0,b40:0,b50:0});
 (DATA.playerLog||[]).forEach(x=>{if(season!==null&&String(x.season)!==String(season))return;if(view==='Regular Season'&&x.game_type!=='Regular Season')return;if(view==='Playoffs'&&x.game_type==='Regular Season')return;const z=out[+x.franchise_id];if(!z)return;const sc=num(x.starter_points);if(sc>=50)z.b50++;else if(sc>=40)z.b40++;else if(sc>=30)z.b30++;else if(sc>=20)z.b20++;else if(sc>=0&&sc<10)z.b5++});
 return Object.values(out);
}
function teamBombRecordRows(view){const lb=teamBombLeaderboard(view);const defs=[['5 BOMBS','b5'],['20 BOMBS','b20'],['30 BOMBS','b30'],['40 BOMBS','b40'],['50 BOMBS','b50']];const rows=[];defs.forEach(([category,key])=>{const ranked=[...lb].sort((a,b)=>b[key]-a[key]||a.franchise_id-b.franchise_id);let prev=null,rank=0;ranked.forEach((x,i)=>{if(prev===null||x[key]!==prev)rank=i+1;prev=x[key];rows.push({category,scoring_view:view,rank,record_holder:x.owner_name,value:x[key],franchise_id:x.franchise_id,metric:key})})});return rows}
function singleSeasonBombRows(){
 const complete=new Set((DATA.teamSeasonMaster||[]).filter(x=>x.season_complete===true||String(x.season_complete).toLowerCase()==='true').map(x=>String(x.season)));
 const defs=[['5 BOMBS','b5'],['20 BOMBS','b20'],['30 BOMBS','b30'],['40 BOMBS','b40'],['50 BOMBS','b50']];
 const raw=[];
 for(const season of complete){
  const lb=teamBombLeaderboard('Regular Season',season);
  defs.forEach(([record_category,key])=>lb.forEach(x=>raw.push({record_category,metric:key,season:+season,franchise_id:x.franchise_id,owner_name:x.owner_name,value:x[key]})));
 }
 // Single-season records are ranked ACROSS every franchise-season in league history,
 // not separately inside each season. This keeps team-page snapshots identical to the
 // full single-season record history page.
 const rows=[];
 defs.forEach(([record_category,key])=>{
  const ranked=raw.filter(x=>x.record_category===record_category).sort((a,b)=>num(b.value)-num(a.value)||num(b.season)-num(a.season)||num(a.franchise_id)-num(b.franchise_id));
  let prev=null,rank=0;
  ranked.forEach((x,i)=>{if(prev===null||!sameRecordValue(x.value,prev))rank=i+1;prev=x.value;rows.push({...x,rank})});
 });
 return rows;
}
function cleanTeamRecordRows(view){const excludedCategory=/career (highest|lowest) score/i;return (DATA.records||[]).filter(x=>!x.player_id&&!redundantScoreAverageRecord(x)&&(!x.scoring_view||x.scoring_view===view)&&!String(x.category||'').startsWith('Season ')&&!['games_100','games_180','games_190'].includes(String(x.metric||''))&&!/100\+ point games/i.test(String(x.category||''))&&!excludedCategory.test(String(x.category||''))).concat(teamBombRecordRows(view));}
function rankValue(rows,id,getter,descending=true){const sorted=[...rows].sort((a,b)=>descending?getter(b)-getter(a):getter(a)-getter(b));return sorted.findIndex(x=>+x.franchise_id===+id)+1}
function tiedRankLabel(rank,tied=false){return tied?`T${rank}`:`#${rank}`}
function sameRecordValue(a,b){const an=Number(a),bn=Number(b);return Number.isFinite(an)&&Number.isFinite(bn)?Math.abs(an-bn)<1e-9:String(a)===String(b)}
function tiedRowsForTop(rows,valueKey='value'){const valid=[...rows].filter(x=>num(x[valueKey])!==0).sort((a,b)=>num(a.rank)-num(b.rank)||num(b[valueKey])-num(a[valueKey]));if(!valid.length)return[];const top=valid[0];return valid.filter(x=>sameRecordValue(x[valueKey],top[valueKey]))}
function joinedOwners(rows,nameKey='record_holder',idKey='franchise_id'){const seen=new Set();return rows.filter(x=>{const k=String(x[idKey]);if(seen.has(k))return false;seen.add(k);return true}).map(x=>ownerName(x[nameKey],x[idKey])).join(' / ')}

/* Each official record is one illustrated leaderboard, with one portrait per
   distinct franchise even if it has tied the record in multiple games/seasons. */
function uniqueRecordManagers(rows){
 const seen=new Set();
 return rows.filter(x=>{
  const id=Number(x.id);
  const key=Number.isInteger(id)&&id>0?'franchise:'+id:'owner:'+String(x.name||'').trim().toLowerCase();
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
function recordPodiumCard({title,href,leaders,badge='ALL-TIME RECORD',tone='mint',note='',allowRepeat=false,summarizeTiedRivals=false}) {
 // Individual performances may belong to the same manager more than once.
 // For aggregate records/streaks rank each franchise once.
 const ranked=allowRepeat?[...(leaders||[])]:uniqueRecordManagers(leaders||[]);
 if(!ranked.length)return '';
 const top=ranked[0];
 const tiedEntries=ranked.filter(x=>sameRecordValue(x.value,top.value));
 const tiedManagers=uniqueRecordManagers(tiedEntries);
 // Preview the top three *ranked places*, including every entry tied
 // at the cutoff. E.g. two tied winners occupy ranks T1/T1, so every
 // performance tied for third must appear as T3, not just the first one.
 // The top portrait mosaic already includes every tied winning manager.
 const rivalCandidates=ranked.filter(x=>!sameRecordValue(x.value,top.value));
 const rivalSlots=Math.max(0,3-tiedEntries.length);
 const boundary=rivalSlots>0 ? rivalCandidates[rivalSlots-1] : undefined;
 const rivals=boundary
  ? rivalCandidates.filter((x,i)=>i<rivalSlots||sameRecordValue(x.value,boundary.value))
  : [];
 const columns=Math.min(tiedManagers.length,5);
 const pics=`<div class="fig-podium-photo fig-tie-photos" data-tied="${tiedManagers.length}" style="--fig-portrait-cols:${columns}" aria-label="${tiedManagers.length} record holder${tiedManagers.length===1?'':'s'}">${tiedManagers.map(x=>ownerAvatar(x.id,'fig-podium-avatar')).join('')}</div>`;
 const names=tiedManagers.map(x=>esc(displayOwnerName(x.name,x.id))).join(' · ');
 const displayPlacement=(entry)=>{
  const first=ranked.findIndex(x=>sameRecordValue(x.value,entry.value));
  const isTied=ranked.some((x,i)=>i!==first&&sameRecordValue(x.value,entry.value));
  return `${isTied?'T':''}${first+1}`;
 };
 // Keep at most two preview rows. When a tied placement overflows
 // the available space, summarize its entire group rather than arbitrarily
 // naming one person and calling the remaining entries "others".
 // All managers/performances remain visible in the full leaderboard.
 const compactRivals=summarizeTiedRivals&&rivals.length>1&&sameRecordValue(rivals[0].value,rivals[1].value)
  ? [{...rivals[0],otherCount:rivals.length}]
  : rivals.length<=2?rivals
   : sameRecordValue(rivals[0].value,rivals[1].value)
    ? [{...rivals[0],otherCount:rivals.length}]
    : [rivals[0],{...rivals[1],otherCount:rivals.length-1}];
 const opponents=compactRivals.map(r=>`<div class="fig-podium-rival"><span class="fig-podium-rank">${displayPlacement(r)}</span><span class="fig-podium-rival-name">${r.otherCount?`${r.otherCount} others`:esc(displayOwnerName(r.name,r.id))}${!r.otherCount&&r.note?`<small>${esc(r.note)}</small>`:''}</span><b class="fig-podium-rival-score">${esc(r.display??r.value)}</b></div>`).join('');
 const valueText=String(top.display??top.value);
 const valueSize=valueText.length>=12?'fig-record-value-xl':valueText.length>=9?'fig-record-value-long':'';
 const detailNote=note||(allowRepeat&&tiedEntries.length===1?top.note||'':'');
 return `<a class="fig-podium-card fig-record-card fig-podium-${esc(tone)}" href="${esc(href)}">
  <div class="fig-podium-banner">${esc(title)}</div>
  ${pics}
  <div class="fig-podium-name">${names}</div>
  <div class="fig-podium-value ${valueSize}">${esc(valueText)}</div>
  <div class="fig-podium-label">${tiedEntries.length>1?'TIED · ':''}${esc(badge)}</div>
  ${detailNote?`<div class="fig-podium-note">${esc(detailNote)}</div>`:''}
  ${opponents?`<div class="fig-podium-rivals">${opponents}</div>`:''}
  <div class="fig-podium-view">VIEW FULL LEADERBOARD →</div>
 </a>`;
}
// Universal sortable table. Every header is clickable.
let tableCounter=0;
function sortableTable(headers,rows,opts={}){
  const id=`st_${++tableCounter}`;
  const heads=headers.map(h=>typeof h==='string'?{label:h,key:h}:h);
  // Leaderboards retain their HTML tables on phones; Rank + identity stay pinned.
  // Other dense tables still use the existing compact-card presentation.
  const freeze=heads.length>=4&&['#','RANK'].includes(String(heads[0].label).trim().toUpperCase())&&
    ['TEAM','PLAYER','HOLDER','OWNER','OPPONENT'].includes(String(heads[1].label).trim().toUpperCase());
  const body=rows.map((r,i)=>{const cls=[r._class||'',r._href?'clickable-row':''].filter(Boolean).join(' ');const href=r._href?` data-href="${esc(r._href)}"`:'';return `<tr class="${cls}"${href} data-row='${esc(JSON.stringify(r._sort||{}))}'>${heads.map(h=>`<td>${r[h.key]??''}</td>`).join('')}</tr>`}).join('');
  if(!freeze) setTimeout(()=>{bindSortable(id,heads);const t=document.getElementById(id);if(t){$('tbody tr[data-href]',t).forEach(tr=>{tr.onclick=e=>{if(e.target.closest('a,button,input,select'))return;location.hash=tr.dataset.href}})}},0);
  const html=`<div class="table-wrap"><table id="${id}" class="sortable"><thead><tr>${heads.map((h,i)=>`<th data-col="${i}" data-key="${esc(h.key)}"><button class="sort-head">${h.label}<span class="sort-icon">↕</span></button></th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`
  return freeze ? frozenTable(heads,rows,id,opts) : html;
}
function frozenTable(heads, rows, id, opts={}) {
  const firstHeads = heads.slice(0, 2);
  const statHeads = heads.slice(2);
  const route = (location.hash.startsWith('#/') ? location.hash.slice(2) : 'home').split('/')[0];
  const history = ['record', 'streak', 'singleseasons', 'special', 'playerweeks', 'playerbombrank', 'playerbomb'].includes(route);
  const activeStreaks = route === 'streaks';
  const allowed = h => {
    if (!history && !activeStreaks) return true;
    const title = String(h.label).trim().toUpperCase();
    return history ? /^(VALUE|LENGTH|POINTS|SCORE|BOMBS|COUNT|TOTAL)$/.test(title) : /^(TYPE|LENGTH)$/.test(title);
  };
  const buildHead = (h, i) => {const selected=opts.sortState?.column===i;return `<th data-col="${i}" data-key="${esc(h.key)}"${selected?` aria-sort="${opts.sortState.descending?'descending':'ascending'}"`:''}><button class="sort-head" type="button" ${allowed(h) ? '' : 'disabled aria-disabled="true"'}>${esc(h.label)}<span class="sort-icon" aria-hidden="true">${allowed(h) ? (selected ? (opts.sortState.descending?'↓':'↑') : '↕') : ''}</span></button></th>`;};
  const renderRows = (start, columns) => rows.map((r, i) => {
    const cls = [r._class || '', r._href ? 'clickable-row' : ''].filter(Boolean).join(' ');
    return `<tr class="${esc(cls)}" data-fig-row="${i}" data-row='${esc(JSON.stringify(r._sort || {}))}'${r._href ? ` data-href="${esc(r._href)}"` : ''}>${columns.map(h => `<td data-key="${esc(h.key)}">${r[h.key] ?? ''}</td>`).join('')}</tr>`;
  }).join('');
  setTimeout(() => bindFrozenTable(id, heads, opts), 0);
  return `<div class="fig-table-hint">RANK + NAME STAY VISIBLE <span>SWIPE STATS →</span></div>` +
    `<div class="fig-frozen-grid" data-fig-version="77-frozen" data-page="${esc(route)}">` +
    `<div class="fig-frozen-identity"><table id="${id}_fixed" class="fig-frozen-identity-table" aria-label="Fixed rank and name columns"><thead><tr>${firstHeads.map((h, i) => buildHead(h, i)).join('')}</tr></thead><tbody>${renderRows(0, firstHeads)}</tbody></table></div>` +
    `<div class="table-wrap fig-frozen-stats" data-fig-version="75-frozen" role="region" tabindex="0" aria-label="Scroll sideways for additional statistics"><table id="${id}" class="sortable fig-frozen-stats-table" aria-label="Scrollable statistics"><thead><tr>${statHeads.map((h, i) => buildHead(h, i + 2)).join('')}</tr></thead><tbody>${renderRows(2, statHeads)}</tbody></table></div></div>`;
}
function bindFrozenTable(id, heads, opts={}) {
  const right = document.getElementById(id), left = document.getElementById(id + '_fixed');
  if (!right || !left) return;
  const rightBody = right.tBodies[0], leftBody = left.tBodies[0];
  const allHeaders = [...left.querySelectorAll('th'), ...right.querySelectorAll('th')];
  // Two physically separate tables can lay out wrapped player names and stats
  // at different heights (especially after web fonts render on iOS). Align each
  // paired row by its stable data-fig-row key, not by approximate CSS heights.
  const frozenGrid = left.closest('.fig-frozen-grid');
  let syncFrame = 0;
  const syncRowHeights = () => {
    syncFrame = 0;
    if (!left.isConnected || !right.isConnected) return;
    const leftHeaders = [...left.tHead?.rows || []], rightHeaders = [...right.tHead?.rows || []];
    const leftRows = [...leftBody.rows], rightRows = [...rightBody.rows];
    const rightById = new Map(rightRows.map(row => [row.dataset.figRow, row]));
    const pairs = [...leftHeaders.map((row,i) => [row,rightHeaders[i]]),
      ...leftRows.map(row => [row,rightById.get(row.dataset.figRow)])].filter(pair=>pair[0]&&pair[1]);
    // Remove old sizes before measuring; otherwise a prior viewport/column
    // width could lock the rows to unnecessarily tall or short heights.
    for (const [a,b] of pairs) {
      a.style.removeProperty('height');
      b.style.removeProperty('height');
    }
    const sizes = pairs.map(([a,b]) => Math.ceil(Math.max(
      a.getBoundingClientRect().height, b.getBoundingClientRect().height)));
    pairs.forEach(([a,b],i) => {
      const height = sizes[i] + 'px';
      a.style.height = height;
      b.style.height = height;
    });
  };
  const queueRowSync = () => {
    if (!syncFrame && left.isConnected && right.isConnected)
      syncFrame = requestAnimationFrame(syncRowHeights);
  };
  // Initial layout, fonts, responsive viewport changes and late image loads
  // can all alter name-column row heights after the table is first painted.
  queueRowSync();
  document.fonts?.ready?.then(queueRowSync);
  frozenGrid?.addEventListener('load',queueRowSync,true);
  if (frozenGrid && typeof ResizeObserver !== 'undefined') {
    let gridWidth = frozenGrid.getBoundingClientRect().width;
    const observer = new ResizeObserver(entries => {
      if (!left.isConnected) {observer.disconnect();return;}
      const width = entries[0]?.contentRect.width ?? gridWidth;
      if (Math.abs(width-gridWidth)>0.5) {gridWidth=width;queueRowSync();}
    });
    observer.observe(frozenGrid);
  }
  let activeColumn = opts.sortState?.column ?? -1, descending = opts.sortState?.descending ?? true;
  const sortValue = (tr, col) => {
    const key = heads[col].key;
    let parsed;
    try { parsed = JSON.parse(tr.dataset.row || '{}'); } catch { parsed = {}; }
    return parsed[key] === undefined ? (tr.cells[col < 2 ? col : col - 2]?.textContent || '').trim() : parsed[key];
  };
  for (const th of allHeaders) {
    const button = th.querySelector('button');
    if (!button || button.disabled) continue;
    button.addEventListener('click', () => {
      const col = Number(th.dataset.col);
      descending = activeColumn !== col || !descending;
      activeColumn = col;
      if(opts.sortState) { opts.sortState.column=col; opts.sortState.descending=descending; }
      if(typeof opts.onSort === 'function') { opts.onSort(heads[col]?.key, descending); return; }
      const field = heads[col]?.key || '';
      const textual = /^(team|player|owner|holder|type|pos|status)$/i.test(field);
      const ordered = [...rightBody.rows].sort((a, b) => {
        const av = sortValue(a, col), bv = sortValue(b, col);
        const an = textual ? NaN : Number(String(av).replace(/[,%$+]/g, ''));
        const bn = textual ? NaN : Number(String(bv).replace(/[,%$+]/g, ''));
        const cmp = Number.isFinite(an) && Number.isFinite(bn) ? an - bn :
          String(av).localeCompare(String(bv), undefined, {numeric: true, sensitivity: 'base'});
        return descending ? -cmp : cmp;
      });
      const leftById = new Map([...leftBody.rows].map(row => [row.dataset.figRow, row]));
      for (const row of ordered) {
        rightBody.appendChild(row);
        const companion = leftById.get(row.dataset.figRow);
        if (companion) leftBody.appendChild(companion);
      }
      queueRowSync();
      for (const h of allHeaders) {
        const selected = h === th;
        h.removeAttribute('aria-sort');
        const marker = h.querySelector('.sort-icon');
        if (marker && !h.querySelector('button').disabled) marker.textContent = selected ? descending ? '↓' : '↑' : '↕';
        if (selected) h.setAttribute('aria-sort', descending ? 'descending' : 'ascending');
      }
    });
  }
  const openRow = e => {
    if (e.target.closest('a,button,input,select')) return;
    const row = e.target.closest('tr[data-href]');
    if (row && row.dataset.href) location.hash = row.dataset.href;
  };
  leftBody.addEventListener('click', openRow);
  rightBody.addEventListener('click', openRow);
}

/* Render at most 100 historical performances at first, with opt-in
   increments of 100. Changing points sort applies to ALL archived performances,
   not only the first visible page. Frozen identity/stat panes stay synchronized. */
function pagedWeekHistory(headers, sortedRows, makeRow, opts={}) {
 const pageSize=100, id=`fig_history_${++tableCounter}`;
 const firstDescending=opts.initialDescending!==false;
 let descending=firstDescending, shown=Math.min(pageSize,sortedRows.length);
 const sortState={column:headers.findIndex(h=>h.key===(opts.sortKey||'points')),descending:firstDescending};
 let ordered=sortedRows;
 const label=opts.label||'performances';
 const tableMarkup=()=>{
  const rows=ordered.slice(0,shown).map((record,i)=>makeRow(record,descending===firstDescending?i:sortedRows.length-1-i));
  const t=sortableTable(headers,rows,{sortState,onSort:(key,d)=>{
    if(key!=='points'&&key!=='score')return;
    descending=d;
    ordered=descending===firstDescending?sortedRows:[...sortedRows].reverse();
    shown=Math.min(pageSize,ordered.length);
    update();
  }});
  const remaining=ordered.length-shown;
  return t+`<div class="fig-history-paging">
   <p class="fig-history-count" role="status" aria-live="polite">Showing ${shown.toLocaleString()} of ${ordered.length.toLocaleString()} ${esc(label)}</p>
   ${remaining>0?`<button type="button" class="fig-history-more" data-fig-more>SHOW 100 MORE <span aria-hidden="true">↓</span></button><span class="fig-history-remaining">${remaining.toLocaleString()} remaining</span>`:'<span class="fig-history-complete">All entries shown</span>'}
  </div>`;
 };
 const update=()=>{
  const root=document.getElementById(id);
  if(!root)return;
  const previousScroll=root.querySelector('.fig-frozen-stats')?.scrollLeft??0;
  root.innerHTML=tableMarkup();
  const rightPane=root.querySelector('.fig-frozen-stats');
  if(rightPane)rightPane.scrollLeft=previousScroll;
  root.querySelector('[data-fig-more]')?.addEventListener('click',()=>{
    shown=Math.min(shown+pageSize,ordered.length);
    update();
  });
 };
 setTimeout(()=>{
  const root=document.getElementById(id);
  root?.querySelector('[data-fig-more]')?.addEventListener('click',()=>{
    shown=Math.min(shown+pageSize,ordered.length);
    update();
  });
 },0);
 return `<div class="fig-history-list" id="${id}">${tableMarkup()}</div>`;
}

function bindSortable(id,heads){const t=document.getElementById(id);if(!t)return;
 const route=(location.hash.startsWith('#/')?location.hash.slice(2):'home').split('/')[0];
 const historical=['record','streak','singleseasons','special','playerweeks','playerbombrank','playerbomb'].includes(route);
 const activeStreaks=route==='streaks';
 $$('th',t).forEach(th=>{
   if(t.classList.contains('fig-sticky-table')&&(historical||activeStreaks)){
     const label=th.textContent.replace(/[↕↑↓]/g,'').trim().toUpperCase();
     const allowed=historical ? /^(VALUE|LENGTH|POINTS|SCORE|BOMBS|COUNT|TOTAL)$/.test(label) : /^(TYPE|LENGTH)$/.test(label);
     if(!allowed){const button=th.querySelector('button');if(button){button.disabled=true;button.setAttribute('aria-disabled','true');}return;}
   }
   th.onclick=()=>{const idx=+th.dataset.col,key=th.dataset.key,asc=th.dataset.asc!=='true';$$('th',t).forEach(x=>{x.dataset.asc='';$('.sort-icon',x).textContent='↕'});th.dataset.asc=String(asc);$('.sort-icon',th).textContent=asc?'↑':'↓';const trs=$$('tbody tr',t);trs.sort((a,b)=>{let av,bv;try{av=JSON.parse(a.dataset.row||'{}')[key];bv=JSON.parse(b.dataset.row||'{}')[key]}catch{}if(av===undefined)av=a.children[idx].textContent.trim();if(bv===undefined)bv=b.children[idx].textContent.trim();const an=Number(String(av).replace(/[%,$+]/g,'')),bn=Number(String(bv).replace(/[%,$+]/g,''));let c=(!Number.isNaN(an)&&!Number.isNaN(bn))?an-bn:String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});return asc?c:-c});const tb=$('tbody',t);trs.forEach(r=>tb.appendChild(r))}})}
function pills(id,items,active){return `<div class="pill-row" id="${id}">${items.map(x=>`<button class="pill ${String(x.value)===String(active)?'active':''}" data-value="${esc(x.value)}">${esc(x.label)}</button>`).join('')}</div>`}
function bindPills(id,cb){$$(`#${id} .pill`).forEach(b=>b.onclick=()=>{$$(`#${id} .pill`).forEach(x=>x.classList.remove('active'));b.classList.add('active');cb(b.dataset.value)})}
// FLEX is an aggregate position view: RB + WR + TE, never QB.
function playerBookMatchesPosition(playerPosition, selected){const p=String(playerPosition||'').toUpperCase();return selected==='ALL'||(selected==='FLEX'?['RB','WR','TE'].includes(p):p===selected)}


function standingsTableFor(season,view){
 let data,heads,rows;
 if(season==='career'&&view==='actual'){
  data=[...DATA.standingsCareer].sort((a,b)=>b.win_pct-a.win_pct||b.points_for-a.points_for);
  heads=[['rank','#'],['team','TEAM'],['w','W'],['l','L'],['win','WIN %'],['pf','PF'],['diff','DIFF']];
  rows=data.map((x,i)=>({rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),w:x.wins,l:x.losses,win:pct(x.win_pct),pf:money(x.points_for),diff:`${num(x.point_differential)>=0?'+':''}${money(x.point_differential)}`,_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),w:x.wins,l:x.losses,win:x.win_pct,pf:x.points_for,diff:x.point_differential}}));
 }
 else if(season==='career'&&view==='allplay'){
  data=[...DATA.allPlayCareer].sort((a,b)=>b.all_play_win_pct-a.all_play_win_pct);
  heads=[['rank','#'],['team','TEAM'],['w','AP W'],['l','AP L'],['win','AP %'],['pf','PF']];
  rows=data.map((x,i)=>({rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),w:x.all_play_wins,l:x.all_play_losses,win:pct(x.all_play_win_pct),pf:money(x.points_for),_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),w:x.all_play_wins,l:x.all_play_losses,win:x.all_play_win_pct,pf:x.points_for}}));
 }
 else if(season==='career'&&view==='luck'){
  const g={};DATA.luckSeasons.forEach(x=>{const z=g[x.franchise_id]??={franchise_id:x.franchise_id,owner_name:x.owner_name,wins:0,expected:0,luck:0,apw:0,apl:0};z.wins+=num(x.wins);z.expected+=num(x.expected_wins_all_play);z.luck+=num(x.luck_wins);z.apw+=num(x.all_play_wins);z.apl+=num(x.all_play_losses)});
  data=Object.values(g).sort((a,b)=>b.luck-a.luck);heads=[['rank','#'],['team','TEAM'],['w','W'],['exp','EXPECTED W'],['luck','LUCK W'],['ap','ALL-PLAY %']];
  rows=data.map((x,i)=>{const ap=x.apw/(x.apw+x.apl)*100;return{rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),w:x.wins,exp:x.expected.toFixed(2),luck:`${x.luck>=0?'+':''}${x.luck.toFixed(2)}`,ap:pct(ap),_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),w:x.wins,exp:x.expected,luck:x.luck,ap}}});
 }
 else {
  const master=DATA.teamSeasonMaster.filter(x=>String(x.season)===String(season));
  const base=DATA.luckSeasons.filter(x=>String(x.season)===String(season));
  if(view==='luck'){
   data=[...base].sort((a,b)=>b.luck_wins-a.luck_wins);heads=[['rank','#'],['team','TEAM'],['w','W'],['exp','EXPECTED W'],['luck','LUCK W'],['ap','ALL-PLAY %'],['delta','ACTUAL - AP %']];
   rows=data.map((x,i)=>({rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),w:x.wins,exp:Number(x.expected_wins_all_play).toFixed(2),luck:`${num(x.luck_wins)>=0?'+':''}${Number(x.luck_wins).toFixed(2)}`,ap:pct(x.all_play_win_pct),delta:`${num(x.actual_minus_all_play_pct)>=0?'+':''}${Number(x.actual_minus_all_play_pct).toFixed(2)}%`,_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),w:x.wins,exp:x.expected_wins_all_play,luck:x.luck_wins,ap:x.all_play_win_pct,delta:x.actual_minus_all_play_pct}}));
  } else if(view==='allplay'){
   data=[...master].sort((a,b)=>b.all_play_win_pct-a.all_play_win_pct);heads=[['rank','#'],['team','TEAM'],['w','AP W'],['l','AP L'],['win','AP %'],['pf','PF'],['maxpf','MAX PF']];
   rows=data.map((x,i)=>({rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),w:x.all_play_wins,l:x.all_play_losses,win:pct(x.all_play_win_pct),pf:money(x.points_for),maxpf:money(x.max_pf),_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),w:x.all_play_wins,l:x.all_play_losses,win:x.all_play_win_pct,pf:x.points_for,maxpf:x.max_pf}}));
  } else {
   data=[...master].sort((a,b)=>num(a.regular_season_finish)-num(b.regular_season_finish));heads=[['rank','#'],['team','TEAM'],['w','W'],['l','L'],['win','WIN %'],['pf','PF'],['maxpf','MAX PF'],['diff','DIFF']];
   rows=data.map((x,i)=>({rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),w:x.wins,l:x.losses,win:pct(x.win_pct),pf:money(x.points_for),maxpf:money(x.max_pf),diff:`${num(x.point_differential)>=0?'+':''}${money(x.point_differential)}`,_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),w:x.wins,l:x.losses,win:x.win_pct,pf:x.points_for,maxpf:x.max_pf,diff:x.point_differential}}));
  }
 }
 return sortableTable(heads.map(([key,label])=>({key,label})),rows);
}

function appLauncher(){
 const items=[
  {icon:'♛',label:'CHAMPIONS',href:'#/champions'},
  {icon:'★',label:'TEAM RECORDS',href:'#/records'},
  {icon:'◌',label:'PLAYER RECORDS',href:'#/players'},
  {icon:'⚡',label:'STREAKS',href:'#/streaks'},
  {icon:'◎',label:'TEAMS',href:'#/teams'},
  {icon:'▥',label:'DYNASTY VALUES',href:'#/dynasty'},
  {icon:'▣',label:'MINIGAMES',href:'#/minigames'},
  {icon:'↔',label:'H2H',href:'#/h2h'},
  {icon:'▦',label:'GAME ARCHIVE',href:'#/games'}
 ];
 return `<section class="app-menu-section"><div class="app-menu-title-wrap"><h2 class="app-menu-title">MENU</h2></div><div class="app-menu-shell"><div class="app-menu-grid">${items.map(i=>`<a class="app-tile" href="${i.href}"><div class="app-tile-icon">${i.icon}</div><div class="app-tile-label">${i.label}</div></a>`).join('')}</div></div></section>`
}



// RosterAudit market values; never mistake current valuations for trade-date prices.
const raReady=()=>DATA.raValues?.status==='ready'&&Object.keys(DATA.raValues?.players||{}).length>0;
const raCredit=()=>`<a href="https://rosteraudit.com" target="_blank" rel="noopener noreferrer">Values by RosterAudit.com ↗</a>`;
const raFormat=()=>{const cfg=DATA.raValues?.format||{};const f=cfg.format==='1qb'?'1QB':'Superflex';const p=Number(cfg.receptions)===.5?'Half PPR':'Full PPR';const tep=Number(cfg.te_reception_bonus)>0?' · TE Premium':'';const target=`${cfg.teams||10}-team ${f} · ${p}${tep}`;return DATA.raValues?.snapshot_source?.kind==='csv'&&!DATA.raValues.snapshot_source.preset_verified?`CSV export (scoring preset not specified) · League target: ${target}`:target};
const raDate=()=>{const d=DATA.raValues?.updated_at;if(!d)return 'Awaiting first update';if(/^\d{4}-\d{2}-\d{2}$/.test(d)){const [y,m,day]=d.split('-');return `${m}/${day}/${y}`}return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})};
function raPlayer(id){if(!raReady()||!id)return null;const p=DATA.raValues.players[String(id)];return p&&Number.isFinite(+p.value)?+p.value:null}
// The original franchise (not the current pick holder) determines the league's
// custom pick tiers. These are modern RosterAudit *comparables*, never prices
// reconstructed from the date of an old trade.
const JAMES_PICK_ORIGIN=10, HAYDEN_PICK_ORIGIN=6, BOEK_PICK_ORIGIN=1;
function raPickTier(year,round,tier){
 if(!raReady())return null;
 const raw=DATA.raValues.future_picks?.[`${Number(year)}:${Number(round)}:${tier}`];
 return raw!==undefined&&raw!==null&&Number.isFinite(Number(raw))?Number(raw):null;
}
function raPickValuation(year,round,originalFranchiseId){
 const y=Number(year),r=Number(round),origin=Number(originalFranchiseId);
 const isJames=origin===JAMES_PICK_ORIGIN;
 const isLateOrigin=origin===HAYDEN_PICK_ORIGIN||origin===BOEK_PICK_ORIGIN;
 const tier=isJames?'early':isLateOrigin?'late':'mid';
 // James is *always* a 2027 early comparable, regardless of year.
 // For past drafts the supplied market snapshot has no historical 2024–26
 // values; use a clearly identified 2027 equivalent rather than silently
 // imputing an unavailable historical price.
 const sourceYear=isJames||y<2027?2027:y;
 const value=raPickTier(sourceYear,r,tier);
 const originalName=isJames?'James':origin===HAYDEN_PICK_ORIGIN?'Hayden':origin===BOEK_PICK_ORIGIN?'Boek':null;
 const sourceDescription=sourceYear!==y?`2027 ${tier} round ${r} comparable`:`${y} ${tier} round ${r}`;
 return {
  value,tier,isJames,isLateOrigin,sourceYear,isProxy:sourceYear!==y,
  label:`${originalName?`${originalName}-origin pick · `:''}${sourceDescription}`
 };
}
const raValueText=n=>n===null||n===undefined?'Not valued':money(n);
function raTeamData(id){
 const roster=[...new Map((DATA.currentRoster||[]).filter(x=>+x.franchise_id===+id).map(x=>[String(x.player_id),x])).values()];
 const draftYear=Math.max(2026,...(DATA.draftPicks||[]).filter(x=>x.draft_status==='complete'&&x.draft_type==='rookie').map(x=>+x.draft_season));
 const picks=(DATA.currentPicks||[]).filter(x=>+x.current_franchise_id===+id&&+x.pick_season>draftYear);
 const known=roster.map(x=>raPlayer(x.player_id)).filter(x=>x!==null);
 const knownPickValues=picks.map(x=>raPickValuation(x.pick_season,x.round,x.original_franchise_id).value).filter(x=>x!==null);
 const playerValue=known.reduce((s,x)=>s+x,0),pickValue=knownPickValues.reduce((s,x)=>s+x,0);
 return {roster,picks,playersMatched:known.length,picksMatched:knownPickValues.length,playerValue,pickValue,knownTotal:playerValue+pickValue,allValued:known.length===roster.length&&knownPickValues.length===picks.length};
}
function raTeamPanel(id){
 if(!raReady())return `<section class="ra-team-overview ra-loading"><div class="ra-eyebrow">DYNASTY MARKET VALUE</div><h2>Awaiting RosterAudit sync</h2><p>Run the daily data workflow once after deploying v46. ${raCredit()}</p></section>`;
 const z=raTeamData(id);
 return `<section class="ra-team-overview"><div class="ra-header-row"><div><div class="ra-eyebrow">DYNASTY MARKET VALUE · ${esc(raFormat())}</div><h2>${money(z.knownTotal)} <span>tracked value</span></h2></div><a href="#/dynasty" class="ra-board-link">LEAGUE RANKINGS →</a></div><div class="ra-team-figures"><div><span>PLAYERS</span><strong>${money(z.playerValue)}</strong><small>${z.playersMatched} of ${z.roster.length} matched</small></div><div><span>FUTURE PICKS</span><strong>${z.picksMatched?money(z.pickValue):'—'}</strong><small>${z.picksMatched} of ${z.picks.length} priced</small></div></div><p>Updated ${esc(raDate())} · ${raCredit()}</p></section>`;
}

function renderTradeGapGame(difference){
 // v52: Fantasy roster under a market-value budget; only RosterAudit players
 // worth >= 200. The SFLX challenge slot is QB-only by house rule.
 // Keep the game budget tied to the *same* market gap calculation used by
 // the James/Hayden cumulative trade totals. Never round or freeze it at 28K.
 const GAME_BUDGET=Math.max(0,Number.isFinite(Number(difference))?Number(difference):0);
 const GAME_MIN_VALUE=200;
 if(!raReady())return `<section class="jh-gap-game jh-gap-unavailable"><div class="jh-gap-pitch"><span class="jh-gap-kicker">TRADE GAP LINEUP CHALLENGE</span><h3>Market values are updating</h3><p>The lineup budget will appear when RosterAudit values are available.</p>${raCredit()}</div></section>`;
 if(GAME_BUDGET===0)return `<section class="jh-gap-game jh-gap-unavailable"><div class="jh-gap-pitch"><span class="jh-gap-kicker">TRADE GAP LINEUP CHALLENGE</span><strong>0</strong><h3>No gap to spend</h3><p>James and Hayden currently have equal recorded trade-market totals. The game will return if a gap opens up.</p>${raCredit()}</div></section>`;
 const rosterSetting=(DATA.league||[]).slice().sort((a,b)=>Number(b.season)-Number(a.season))[0];
 let gameSlots=[];
 try{gameSlots=JSON.parse(rosterSetting?.roster_positions_json||'[]').filter(x=>['QB','RB','WR','TE','FLEX','SUPER_FLEX'].includes(x));}catch(e){}
 if(!gameSlots.length)gameSlots=['QB','RB','RB','WR','WR','WR','TE','FLEX','FLEX','SUPER_FLEX'];
 const gamePool=Object.entries(DATA.raValues?.players||{}).filter(([id,p])=>Number(p.value)>=GAME_MIN_VALUE&&['QB','RB','WR','TE'].includes(p.position)).map(([id,p])=>({id,name:p.name,pos:p.position,value:Number(p.value)})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
 const gameById=new Map(gamePool.map(x=>[x.id,x]));
 const gameEligible=(slot,pos)=>slot==='SUPER_FLEX'?pos==='QB':(slot==='FLEX'?['RB','WR','TE'].includes(pos):slot===pos);
 let gamePicked=gameSlots.map(()=>''),gameSearch='',gameMessage='';
 const gameHtml=()=>`<section class="jh-gap-game" id="jhGapChallenge"><div class="jh-gap-pitch"><span class="jh-gap-kicker">THE JAMES–HAYDEN TRADE GAP</span><strong>${money(difference)}</strong><span class="jh-gap-unit">DYNASTY MARKET POINTS</span><h3>BUILD A STARTING TEN WITH THE TRADE GAP.</h3><p>Your budget is exactly the current difference between James and Hayden’s cumulative received market values. As dynasty values change, so does the challenge.</p><div class="jh-gap-rules"><span>10-TEAM SUPERFLEX (SFLX: QB ONLY)</span><span>FULL PPR PRESET TARGET</span><span>NO DUPLICATE PLAYERS</span><span>200+ VALUE ONLY</span><span>BUDGET = EXACT TRADE GAP</span></div></div><div class="jh-lineup-game"><div class="jh-game-head"><div><span>TRADE GAP LINEUP CHALLENGE</span><h4>BUILD YOUR DREAM TEAM</h4></div><span class="jh-game-badge">${gameSlots.length} STARTERS</span></div><div class="jh-game-score"><div><span>SPENT</span><strong id="jhGameSpent">0</strong></div><div><span>REMAINING</span><strong id="jhGameLeft">${money(GAME_BUDGET)}</strong></div></div><div class="jh-game-meter"><span id="jhGameMeter" style="width:0%"></span></div><label class="jh-game-search-label" for="jhGameSearch">FIND A PLAYER <small>(${gamePool.length} eligible at ${money(GAME_MIN_VALUE)}+)</small></label><input id="jhGameSearch" class="jh-game-search" type="search" placeholder="Filter player choices by name..." autocomplete="off"><div id="jhGameSlots" class="jh-game-slots"></div><div id="jhGameStatus" class="jh-game-status" role="status" aria-live="polite"></div><div class="jh-game-actions"><button type="button" data-jh-game="surprise">SURPRISE ME</button><button type="button" data-jh-game="reset">CLEAR TEAM</button></div><p class="jh-game-credit">${raCredit()} · ${esc(raDate())}</p></div></section>`;
 const mountGame=()=>{
  const root=document.querySelector('#jhGapChallenge');if(!root)return;
  const spent=()=>gamePicked.reduce((s,k)=>s+(gameById.get(k)?.value||0),0);
  const render=()=>{
   const chosen=new Set(gamePicked.filter(Boolean));
   document.querySelector('#jhGameSlots').innerHTML=gameSlots.map((slot,i)=>{
    const options=gamePool.filter(p=>gameEligible(slot,p.pos)&&(!gameSearch||p.name.toLowerCase().includes(gameSearch)||p.id===gamePicked[i])).map(p=>`<option value="${esc(p.id)}" ${gamePicked[i]===p.id?'selected':''} ${chosen.has(p.id)&&gamePicked[i]!==p.id?'disabled':''}>${esc(p.name)} · ${esc(p.pos)} · ${money(p.value)}</option>`).join('');
    return `<label class="jh-game-row"><span>${slot==='SUPER_FLEX'?'SFLX (QB ONLY)':esc(slot)} <small>${i+1}</small></span><select data-jh-slot="${i}" aria-label="${esc(slot)} slot ${i+1}"><option value="">CHOOSE PLAYER</option>${options}</select><span class="jh-game-row-price">${gamePicked[i]?money(gameById.get(gamePicked[i])?.value||0):'—'}</span></label>`;
   }).join('');
   const total=spent(),filled=gamePicked.filter(Boolean).length,remaining=GAME_BUDGET-total;
   root.querySelector('#jhGameSpent').textContent=money(total);
   root.querySelector('#jhGameLeft').textContent=money(remaining);
   root.querySelector('#jhGameMeter').style.width=`${Math.min(100,total/GAME_BUDGET*100)}%`;
   root.querySelector('#jhGameStatus').textContent=gameMessage||(filled===gameSlots.length?`LINEUP COMPLETE! ${money(remaining)} unspent.`:`${filled} of ${gameSlots.length} starters chosen · ${money(remaining)} left`);
   root.querySelector('#jhGameStatus').classList.toggle('jh-game-finished',filled===gameSlots.length);
  };
  root.addEventListener('change',e=>{
   const sel=e.target.closest('[data-jh-slot]');if(!sel)return;
   const i=Number(sel.dataset.jhSlot),old=gamePicked[i],id=sel.value;
   if(id&&gamePicked.some((v,k)=>k!==i&&v===id)){gameMessage='That player is already starting.';render();return;}
   if(id&&spent()-(gameById.get(old)?.value||0)+(gameById.get(id)?.value||0)>GAME_BUDGET){gameMessage='Over budget! Pick someone less expensive.';render();return;}
   gamePicked[i]=id;gameMessage='';render();
  });
  root.querySelector('#jhGameSearch').addEventListener('input',e=>{gameSearch=e.target.value.trim().toLowerCase();render()});
  root.addEventListener('click',e=>{
   const btn=e.target.closest('[data-jh-game]');if(!btn)return;
   if(btn.dataset.jhGame==='reset'){gamePicked=gameSlots.map(()=>'');gameMessage='Team cleared. Start your rebuild!';render();return;}
   // Build an affordable sample from cheapest eligibles; add random upgrades,
   // always honoring slots, unique players and the current trade-gap budget.
   const slots=gameSlots.map((pos,i)=>({pos,i,options:gamePool.filter(p=>gameEligible(pos,p.pos)).sort((a,b)=>a.value-b.value)}));
   gamePicked=gameSlots.map(()=>'');
   for(const slot of slots){const p=slot.options.find(x=>!gamePicked.includes(x.id));if(p)gamePicked[slot.i]=p.id;}
   if(gamePicked.some(x=>!x)||spent()>GAME_BUDGET){
    gamePicked=gameSlots.map(()=>'');
    gameMessage='No complete ten-player lineup fits the current trade gap. Try selecting individual players.';
    render();return;
   }
   for(let k=0;k<120;k++){
    const i=Math.floor(Math.random()*gameSlots.length),curr=gameById.get(gamePicked[i]);
    const upgrades=gamePool.filter(p=>gameEligible(gameSlots[i],p.pos)&&!gamePicked.includes(p.id)&&p.value>(curr?.value||0)&&spent()-(curr?.value||0)+p.value<=GAME_BUDGET);
    if(upgrades.length){const pick=upgrades[Math.floor(Math.random()*upgrades.length)];gamePicked[i]=pick.id;}
   }
   gameMessage='Surprise lineup! Swap players to make it yours.';render();
  });
  render();
 };
 setTimeout(mountGame,0);
 return gameHtml();
}

// James & Hayden trade archive. Source-of-truth: Sleeper trade assets and full weekly rosters.
function jamesHaydenTradeArchive(mode='archive'){
 const JAMES_ID=10,HAYDEN_ID=6;
 // Keep incomplete/current/future matchup snapshots out of trade production.
 // For a live season Sleeper's current leg is not a finished week.
 const completedBySeason=new Map((DATA.league||[]).map(s=>[Number(s.season),
   String(s.status).toLowerCase()==='complete'?Number(s.current_leg):Math.max(0,Number(s.current_leg||0)-1)]));
 const isCompleted=w=>Number(w.week)>=1 && Number(w.week)<=Number(completedBySeason.get(Number(w.season))??0);
 const sides=DATA.tradeSides||[], assets=DATA.tradeAssets||[], weeks=DATA.weeklyRosters||[];
 const byTrade=new Map(), receivedByTrade=new Map(), production=new Map();
 sides.forEach(x=>{let k=String(x.transaction_id);if(!byTrade.has(k))byTrade.set(k,new Set());byTrade.get(k).add(+x.franchise_id)});
 assets.filter(a=>a.asset_direction==='Received').forEach(a=>{const k=`${a.transaction_id}:${a.franchise_id}`;if(!receivedByTrade.has(k))receivedByTrade.set(k,[]);receivedByTrade.get(k).push(a)});
 weeks.filter(w=>isCompleted(w)&&w.counts_for_official_records!==false).forEach(w=>{const k=`${w.franchise_id}:${w.player_id}`;if(!production.has(k))production.set(k,[]);production.get(k).push(w)});
 for(const v of production.values())v.sort((a,b)=>+a.season-+b.season||+a.week-+b.week);
 const tradeRows=(DATA.trades||[]).filter(t=>{const ids=byTrade.get(String(t.transaction_id))||new Set();return ids.has(JAMES_ID)&&ids.has(HAYDEN_ID)}).sort((a,b)=>+b.season-+a.season||+b.week-+a.week||String(b.transaction_id).localeCompare(String(a.transaction_id)));
 const years=[...new Set(tradeRows.map(t=>String(t.season)))].sort((a,b)=>+b-+a);
 const person=(id,name)=>`<a class="jh-participant" href="#/team/${id}">${ownerAvatar(id,'jh-portrait')}<span>${name}</span></a>`;
 const received=(t,id)=>receivedByTrade.get(`${t.transaction_id}:${id}`)||[];
 const after=(g,t)=>+g.season>+t.season||(+g.season===+t.season&&+g.week>+t.week);
 const nextExit=(t,id,playerId)=>{let stop=null;for(const tr of (DATA.trades||[])){if(+tr.season<+t.season||(+tr.season===+t.season&&+tr.week<=+t.week))continue;const sent=assets.some(a=>String(a.transaction_id)===String(tr.transaction_id)&&+a.franchise_id===id&&a.asset_direction==='Sent'&&String(a.player_id)===String(playerId)&&a.asset_type==='Player');if(sent&&(!stop||+tr.season<+stop.season||(+tr.season===+stop.season&&+tr.week<+stop.week)))stop=tr}return stop};
 const playerResult=(t,id,a)=>{
  const all=(production.get(`${id}:${a.player_id}`)||[]).filter(g=>after(g,t));
  const exit=nextExit(t,id,a.player_id);
  // The transaction's week is ambiguous; exclude the exit week, not just subsequent weeks.
  const rostered=exit?all.filter(g=>+g.season<+exit.season||(+g.season===+exit.season&&+g.week<+exit.week)):all;
  // A duplicate roster/player/week must never inflate the count.
  const distinct=[...new Map(rostered.map(w=>[`${w.season}:${w.week}:${w.franchise_id}:${w.player_id}`,w])).values()];
  const starts=distinct.filter(w=>w.starter_status==='Starter'), bench=distinct.filter(w=>w.starter_status==='Bench');
  const starterPts=starts.reduce((s,g)=>s+num(g.fantasy_points),0),benchPts=bench.reduce((s,g)=>s+num(g.fantasy_points),0);
  return {starts:starts.length,benches:bench.length,starterPts,benchPts,exit};
 };
 // Track subsequent transfers by the asset's stable original franchise/year/round identity.
 const laterPickTransfers=(t,id,a)=>{
  const key=x=>`${Number(x.pick_season)}:${Number(x.pick_round)}:${Number(x.original_pick_franchise_id)}`;
  return assets.filter(x=>x.asset_type==='Draft Pick'&&x.asset_direction==='Sent'&&+x.franchise_id===+id&&key(x)===key(a)&&
     (+x.season>+t.season||(+x.season===+t.season&&(+x.week>+t.week||(+x.week===+t.week&&String(x.transaction_id)!==String(t.transaction_id))))))
   .sort((x,y)=>+x.season-+y.season||+x.week-+y.week||String(x.transaction_id).localeCompare(String(y.transaction_id)));
 };
  // Audit generated from raw draft, trade, and ownership evidence by the scheduled backend.
  // Reconciled owner+round matches are not an explicit Sleeper original-pick link.
  const pickOutcomeLookup=new Map((DATA.draftAudit||[]).map(row=>[
   `${+row.draft_year}:${+row.round}:${+row.original_franchise}`,row]));
  const pickInfo=(t,id,a)=>{
   const y=+a.pick_season,r=+a.pick_round,orig=+a.original_pick_franchise_id;
   const origin=OWNER_DISPLAY_BY_ID[orig]||`Franchise ${orig||'unknown'}`;
   const completed=(DATA.draftPicks||[]).some(d=>+d.draft_season===y&&d.draft_status==='complete'&&+d.round===r);
   const outcome=pickOutcomeLookup.get(`${y}:${r}:${orig}`);
   const outgoing=laterPickTransfers(t,id,a)[0];
   const wentTo=outgoing&&OWNER_DISPLAY_BY_ID[+outgoing.counterparty_franchise_id];
   const direct=outcome?.resolution_status==='DIRECT_DRAFT_SLOT_MATCH' && outcome?.selection_verified_by_draft_slot===true && outcome?.player_name;
   const inferred=outcome?.resolution_status==='UNIQUE_OWNER_ROUND_MATCH' && outcome?.selection_verified_by_unique_match===true && outcome?.player_name;
   const holder=OWNER_DISPLAY_BY_ID[+(direct?outcome.selecting_franchise:outcome?.expected_draft_owner)]||'an unlisted franchise';
   const pickNumber=outcome?.draft_slot ? `${r}.${String(outcome.draft_slot).padStart(2,'0')}` : `#${outcome?.pick_no}`;
   const matchDescription=direct?`Drafted: ${outcome.player_name} · ${pickNumber} · ${holder}`:inferred?`Drafted: ${outcome.player_name} · #${outcome.pick_no} · ${holder}`:null;
   let draftDescription='Draft pending';
   if(completed){
    const status=outcome?.resolution_status;
    if(matchDescription)draftDescription=matchDescription;
    else if(status==='AMBIGUOUS_MULTIPLE_PICKS_SAME_OWNER_ROUND')draftDescription='Selection unverified';
    else if(status==='UNRESOLVED_ROUND_RECONCILIATION')draftDescription='Selection unverified';
    else if(status==='UNRESOLVED_OWNERSHIP_CHAIN')draftDescription='Selection unverified';
    else draftDescription='Selection unverified';
   }
   const transfer=outgoing?`Traded to ${wentTo||'another franchise'} · ${outgoing.season} Week ${outgoing.week}`:null;
   const chainNote=null; // Ownership discrepancy remains recorded in the audit data.
   return {label:`${y||'Unknown year'} · Round ${r||'?'} · ${origin}'s original pick`,detail:[transfer,draftDescription,chainNote].filter(Boolean).join(' · ')};
  };
 const exitLabel=(z,id,a)=>{
  if(!z.exit)return '';
  const move=assets.find(x=>String(x.transaction_id)===String(z.exit.transaction_id)&&+x.franchise_id===+id&&x.asset_direction==='Sent'&&x.asset_type==='Player'&&String(x.player_id)===String(a.player_id));
  const dest=+move?.counterparty_franchise_id;
  const target=dest===JAMES_ID?'back to James':dest===HAYDEN_ID?'back to Hayden':dest?`to ${OWNER_DISPLAY_BY_ID[dest]||'another franchise'}`:'away';
  return `Later traded ${target} · ${z.exit.season} Week ${z.exit.week}`;
 };
 // One valuation function for BOTH the asset display and side totals. No silent zeroes.
 const tradeAssetMarket=(t,id,a)=>{
  if(a.asset_type==='Draft Pick'||(a.pick_season&&a.pick_round)){
   const v=raPickValuation(a.pick_season,a.pick_round,a.original_pick_franchise_id);
   const outcome=pickOutcomeLookup.get(`${+a.pick_season}:${+a.pick_round}:${+a.original_pick_franchise_id}`);
   const laterTraded=laterPickTransfers(t,id,a).length>0;
   const selectedElsewhere=outcome?.selection_verified_by_draft_slot===true &&
     Number.isFinite(+outcome.selecting_franchise) && Number(outcome.selecting_franchise)!==Number(id);
   // IMPORTANT: The receiving manager got a PICK, not the eventual rookie, if
   // they subsequently traded the pick. Draft outcome is retained as history,
   // but the rookie's present market value must NOT enter this trade-side sum.
   if(laterTraded||selectedElsewhere||v.isJames){
    const reason=laterTraded?'Traded away after acquisition':selectedElsewhere?'Drafted by another franchise':'League-specific James pick rule';
    return {value:v.value,label:`Pick value`,
      extra:`${reason}. ${v.isProxy?'2027 comparable (no historical-year market quote).':'Published year/tier estimate.'} Drafted player shown for history only.`};
   }
   if(outcome?.selection_verified_by_draft_slot===true){
    return {value:raPlayer(outcome.player_id),label:'Drafted player value',
      extra:'Pick was not recorded as subsequently transferred; only count the player when drafted by this recipient. Not a trade-date value.'};
   }
   return {value:v.value,label:`Pick value`,
     extra:`${v.isProxy?'2027 comparable (no historical-year market quote).':'Published year/tier estimate.'} Not a trade-date value.`};
  }
  if(a.asset_type==='Player')return {value:raPlayer(a.player_id),label:'Player value',extra:'Current value, not value at time of trade'};
  // FAAB and other assets have no published dynasty market value and are not assigned zero.
  return {value:null,label:'No RosterAudit market value',extra:'Excluded from matched-asset sum'};
 };
 // Asset journeys use verified, ordered transfers. When an asset is part of
 // a later package, list everything exchanged without claiming one-for-one
 // conversion or adding any successor values to the ORIGINAL trade total.
 const item=(t,id,a)=>{
  const pick=a.asset_type==='Draft Pick'||(a.pick_season&&a.pick_round);
  const market=tradeAssetMarket(t,id,a);
  const valuation=market.value!==null?`<div class="ra-trade-value">${esc(market.label)}: <b>${money(market.value)}</b></div>`:`<div class="ra-trade-unvalued">No published market value · excluded from total</div>`;
  if(pick){const p=pickInfo(t,id,a);return `<li class="jh-item"><div class="jh-item-top"><span class="jh-kind">DRAFT PICK</span><strong>${esc(p.label)}</strong></div><div class="jh-asset-detail">${esc(p.detail)}</div>${valuation}</li>`}
  if(a.asset_type==='FAAB')return `<li class="jh-item"><div class="jh-item-top"><span class="jh-kind">FAAB</span><strong>${esc(a.asset_label||a.faab_amount)}</strong></div>${valuation}</li>`;
  const z=playerResult(t,id,a);
  return `<li class="jh-item"><div class="jh-item-top"><span class="jh-kind">PLAYER</span>${playerHeadshot(a.player_id,a.player_name||a.asset_label||'Unknown player')}<strong>${esc(a.player_name||a.asset_label||'Unknown player')}</strong><span class="jh-position">${esc(a.position||'')}</span></div>${valuation}<div class="jh-production"><span><b>${money(z.starterPts)}</b> lineup pts <small>${z.starts} starts</small></span><span><b>${money(z.benchPts)}</b> bench pts <small>${z.benches} weeks</small></span></div>${z.exit?`<div class="jh-asset-note">${esc(exitLabel(z,id,a))}</div>`:''}</li>`;
 };
 // Count only completed-week production by players received in these trades.
 // These values mirror the individual trade cards; bench scoring is separate
 // and draft-pick recipients do not inherit a drafted player's production.
 const totals=(t,id)=>received(t,id).filter(a=>a.asset_type==='Player').reduce((acc,a)=>{
  const z=playerResult(t,id,a);
  acc.pts+=z.starterPts;
  acc.starts+=z.starts;
  acc.benchPts+=z.benchPts;
  acc.benches+=z.benches;
  return acc;
 },{pts:0,starts:0,benchPts:0,benches:0});
 const overallProduction=(id)=>tradeRows.reduce((acc,t)=>{
  const z=totals(t,id);
  acc.pts+=z.pts;acc.starts+=z.starts;
  acc.benchPts+=z.benchPts;acc.benches+=z.benches;
  return acc;
 },{pts:0,starts:0,benchPts:0,benches:0});
 const marketTotal=(t,id)=>{
  const vals=received(t,id).map(a=>tradeAssetMarket(t,id,a)),priced=vals.filter(x=>x.value!==null);
  return {total:priced.reduce((sum,x)=>sum+x.value,0),priced:priced.length,count:vals.length};
 };
 const overallMarket=(id)=>tradeRows.reduce((agg,t)=>{
  const z=marketTotal(t,id);
  agg.value+=z.total;agg.priced+=z.priced;agg.count+=z.count;
  agg.players+=received(t,id).filter(a=>a.asset_type==='Player').length;
  agg.picks+=received(t,id).filter(a=>a.asset_type==='Draft Pick').length;
  return agg;
 },{value:0,priced:0,count:0,players:0,picks:0});
 if(mode==='gap')return Math.abs(overallMarket(HAYDEN_ID).value-overallMarket(JAMES_ID).value);
 const overview=(id)=>{
  const z=overallMarket(id),field=overallProduction(id);
  return `<div class="jh-overview-team">${ownerAvatar(id,'jh-overview-avatar')}<div class="jh-overview-figures"><div class="jh-overview-label">${id===JAMES_ID?'JAMES':'HAYDEN'} · ALL ${tradeRows.length} TRADES</div><strong>${z.priced?money(z.value):'—'}</strong><span>CUMULATIVE RECEIVED MARKET VALUE</span><small>${z.priced} of ${z.count} assets valued</small><div class="jh-overview-production"><span>ACCUMULATED LINEUP POINTS</span><strong>${money(field.pts)}</strong><small>${field.starts} starts · ${money(field.benchPts)} bench pts (separate)</small></div></div></div>`;
 };
 const column=(t,id)=>{
  const rows=received(t,id),sum=totals(t,id),market=marketTotal(t,id);
  const coverage=`${market.priced} of ${market.count} assets valued`;
  return `<div class="jh-receives"><div class="jh-receives-label">${id===JAMES_ID?'JAMES':'HAYDEN'} RECEIVED <span>${rows.length} ASSETS</span></div><div class="jh-market-total"><div><span class="jh-market-heading">CURRENT MARKET VALUE</span><strong>${market.priced?money(market.total):'—'}</strong><small>${coverage}${market.priced<market.count?' · unvalued assets excluded':''}</small></div></div><div class="jh-column-total"><b>${money(sum.pts)}</b><span>lineup pts · ${sum.starts} starts</span></div><ul class="jh-assets">${rows.length?rows.map(a=>item(t,id,a)).join(''):'<li class="jh-item">No assets recorded</li>'}</ul></div>`;
 };
 // Trade cards remain keyboard-accessible and collapsed by default.
 const card=(t,i)=>{
  const j=marketTotal(t,JAMES_ID),h=marketTotal(t,HAYDEN_ID);
  return `<div class="jh-trade-row"><details class="jh-trade-card" id="jh-trade-${esc(t.transaction_id)}"><summary class="jh-trade-meta"><span class="jh-trade-identity"><strong>TRADE ${String(tradeRows.length-i).padStart(2,'0')}</strong><span>${esc(t.season)} · WEEK ${esc(t.week)}</span></span><span class="jh-trade-preview"><span>James <b>${j.priced?money(j.total):'—'}</b></span><span>Hayden <b>${h.priced?money(h.total):'—'}</b></span></span><span class="jh-trade-action"><span class="jh-trade-action-text">DETAILS</span><span class="jh-toggle-symbol" aria-hidden="true">⌄</span></span></summary><div class="jh-trade-columns">${column(t,JAMES_ID)}${column(t,HAYDEN_ID)}</div></details></div>`;
 };
 const shell=`<div class="jh-archive"><div class="jh-header"><div class="jh-duo">${person(JAMES_ID,'JAMES')}<span class="jh-versus">↔</span>${person(HAYDEN_ID,'HAYDEN')}</div><div class="jh-summary"><strong>${tradeRows.length}</strong><span>DIRECT TRADES</span></div></div><div class="jh-overall"><div class="jh-overall-title">ALL-TIME TRADE VALUE RECEIVED <small>${tradeRows.length} DEALS · CURRENT DYNASTY VALUES</small></div><div class="jh-overall-grid">${overview(JAMES_ID)}${overview(HAYDEN_ID)}</div><p class="jh-overall-scoring-note">Lineup points come from players received in these trades. Bench production is listed separately.</p></div>${renderTradeGapGame(Math.abs(overallMarket(HAYDEN_ID).value-overallMarket(JAMES_ID).value))}<div class="jh-toolbar"><div class="jh-filters" id="jhYears"><button type="button" class="jh-year active" data-year="all">ALL ${tradeRows.length}</button>${years.map(y=>`<button type="button" class="jh-year" data-year="${esc(y)}">${esc(y)}</button>`).join('')}</div><div class="jh-toolbar-right"><span class="jh-count" id="jhShown"></span><button type="button" class="jh-expand-all" id="jhExpandAll">EXPAND ALL</button></div></div><div class="ra-trade-context">${raReady()?`Market values · ${esc(raDate())}`:"Market values pending"} · ${raCredit()}</div><div class="jh-list" id="jhTradeList"></div></div>`;
 setTimeout(()=>{const root=document.querySelector('.jh-archive');if(!root)return;const draw=year=>{const rows=year==='all'?tradeRows:tradeRows.filter(t=>String(t.season)===year);root.querySelector('#jhTradeList').innerHTML=rows.length?rows.map(t=>card(t,tradeRows.indexOf(t))).join(''):'<div class="jh-empty">No trades for this year.</div>';root.querySelector('#jhShown').textContent=`${rows.length} ${rows.length===1?'TRADE':'TRADES'}`};root.querySelectorAll('.jh-year').forEach(b=>b.addEventListener('click',()=>{root.querySelectorAll('.jh-year').forEach(x=>x.classList.toggle('active',x===b));draw(b.dataset.year)}));root.addEventListener('click',e=>{const source=e.target.closest('[data-jh-target]');if(!source)return;const id=source.dataset.jhTarget;if(!tradeRows.some(t=>String(t.transaction_id)===id))return;const all=root.querySelector('.jh-year[data-year="all"]');if(all){root.querySelectorAll('.jh-year').forEach(x=>x.classList.toggle('active',x===all));draw('all')}const target=document.getElementById(`jh-trade-${id}`);if(target){target.open=true;target.scrollIntoView({behavior:'smooth',block:'start'})}});const allBtn=root.querySelector('#jhExpandAll');const updateAllBtn=()=>{const cards=[...root.querySelectorAll('.jh-trade-card')];allBtn.textContent=cards.length&&cards.every(c=>c.open)?'COLLAPSE ALL':'EXPAND ALL'};allBtn.addEventListener('click',()=>{const cards=[...root.querySelectorAll('.jh-trade-card')];const opening=!cards.every(c=>c.open);cards.forEach(c=>{c.open=opening});updateAllBtn()});root.addEventListener('toggle',e=>{if(e.target.matches?.('.jh-trade-card'))updateAllBtn()},true);root.querySelectorAll('.jh-year').forEach(b=>b.addEventListener('click',updateAllBtn));draw('all')},0);
 return section('JAMES & HAYDEN TRADE HISTORY',shell);
}

async function home(){
 await load(['league','standingsCareer','allPlayCareer','luckSeasons','teamSeasonMaster','playerLog','trades','tradeSides','tradeAssets','tradeLineage','draftPicks','draftAudit','transactions','weeklyRosters','raValues']);navActive('home');
 const latest=Math.max(...DATA.league.map(x=>+x.season));
 const currentSeasonInfo=DATA.league.find(x=>+x.season===latest)||{};
 const years=[...new Set(DATA.teamSeasonMaster.map(x=>+x.season))].sort((a,b)=>b-a);
 const jack=DATA.standingsCareer.find(x=>+x.franchise_id===JACK_ID);
 const puka20=DATA.playerLog.filter(x=>x.player_name==='Puka Nacua'&&num(x.starter_points)>=20).length;
 let season=String(latest),view='actual';
 app.innerHTML=hero('OFFICIAL LEAGUE ARCHIVE','FROMM IS<br>GARBAGE','Four seasons of dynasty history, receipts, bad trades and arguments.')+
 `<section class="section fig-live-panel" aria-label="Current-week Sleeper matchups"><div class="section-head"><h2 class="section-title">CURRENT WEEK MATCHUPS</h2><div class="section-note">Unofficial until Sleeper finalizes the week</div></div><div class="fig-live-summary"><span class="fig-live-badge">SLEEPER SCORES</span><span id="figLiveStatus" role="status" aria-live="polite">Connecting…</span></div><div id="figLiveBoard" data-league-id="${esc(currentSeasonInfo.league_id||'')}"><div class="fig-live-empty">Getting current matchups from Sleeper…</div></div><div class="fig-live-footer">Checks every 30 seconds while this page is visible. In-progress scores never count toward historical records or streaks.</div></section>`+
 `<section class="section home-standings"><div class="section-head"><h2 class="section-title">STANDINGS</h2><div class="section-note">Actual results, all-play and luck • every column is sortable</div></div><div class="control-label">SEASON</div>${pills('homeSeasonPills',[{value:'career',label:'ALL-TIME'},...years.map(y=>({value:y,label:y}))],season)}<div class="control-label spaced">VIEW</div>${pills('homeStandView',[{value:'actual',label:'ACTUAL'},{value:'allplay',label:'ALL-PLAY'},{value:'luck',label:'LUCK'}],view)}<div id="homeStandingsTable" class="control-output"></div></section>`+
 appLauncher()+
 jamesHaydenTradeArchive();
 const render=()=>{$('#homeStandingsTable').innerHTML=standingsTableFor(season,view)};
 bindPills('homeSeasonPills',v=>{season=v;render()});bindPills('homeStandView',v=>{view=v;render()});render();
 window.dispatchEvent(new Event('fig:home-rendered'));
}

/* Match published playoff bracket rosters to scored games; IDs of bracket games differ from weekly matchup IDs. */
function playoffSeasonResults(season) {
 const year=String(season);
 const bracket=(DATA.playoffs||[]).filter(x=>String(x.season)===year);
 const scored=(DATA.games||[]).filter(g=>String(g.season)===year&&String(g.game_type).toLowerCase().includes('playoff'));
 const rounds=bracket.map(b=>{
  const ids=[+b.roster_a,+b.roster_b].sort((x,y)=>x-y);
  const game=scored.find(g=>+g.week===+b.week&&[+g.franchise_1,+g.franchise_2].sort((x,y)=>x-y).every((id,i)=>id===ids[i]));
  return {...b,game:game||null};
 }).sort((x,y)=>num(x.playoff_round)-num(y.playoff_round)||num(x.week)-num(y.week)||num(x.bracket_matchup_id)-num(y.bracket_matchup_id));
 const title=rounds.find(x=>x.playoff_category==='Championship');
 const bronze=rounds.find(x=>x.playoff_category==='Third Place');
 const winner=title?.game?.winner_franchise_id;
 const finalist=title?.game?(+title.game.franchise_1===+winner?+title.game.franchise_2:+title.game.franchise_1):null;
 return {rounds,champion:winner?+winner:null,runnerUp:finalist,third:bronze?.game?.winner_franchise_id?+bronze.game.winner_franchise_id:null,title,bronze};
}

function playoffSeasonOwner(id,season) {
 if(!id)return '';
 const standings=(DATA.standingsSeasons||[]).find(x=>String(x.season)===String(season)&&+x.franchise_id===+id);
 const career=(DATA.standingsCareer||[]).find(x=>+x.franchise_id===+id);
 return displayOwnerName(standings?.owner_name||career?.owner_name||'',id);
}

async function champions(){
 await load(['playoffs','games','playoffCareer','standingsCareer','standingsSeasons']);navActive('');
 const seasons=[...new Set(DATA.playoffs.map(x=>String(x.season)))].sort((a,b)=>+b-+a);
 const seasonCards=seasons.map(y=>{
  const result=playoffSeasonResults(y),champ=result.champion;
  const standing=(DATA.standingsSeasons||[]).find(x=>String(x.season)===y&&+x.franchise_id===+champ);
  const portrait=champ?ownerAvatar(champ,'fig-champion-portrait'):'';
  const pts=standing&&num(standing.games)>0?money(num(standing.points_for)/num(standing.games)):'—';
  const record=standing?`${num(standing.wins)}–${num(standing.losses)}`:'—';
  return `<a class="champion-season-card champion-season-link fig-championship-poster" href="#/playoffbracket/${y}">
    <div class="champion-year">${y}</div>
    <div class="champion-label">CHAMPION</div>
    ${portrait}
    <div class="champion-name">${champ?esc(playoffSeasonOwner(champ,y)):'Result not available'}</div>
    <div class="fig-champion-stat-row"><div><span>REGULAR SEASON</span><strong>${record}</strong></div><div><span>POINTS / GAME</span><strong>${pts}</strong></div></div>
    ${result.runnerUp?`<div class="champion-sub"><span>RUNNER-UP</span><strong>${esc(playoffSeasonOwner(result.runnerUp,y))}</strong></div>`:''}
    ${result.third?`<div class="champion-sub"><span>THIRD PLACE</span><strong>${esc(playoffSeasonOwner(result.third,y))}</strong></div>`:''}
    <div class="champion-open">VIEW PLAYOFF BRACKET →</div>
  </a>`;
 }).join('');
 const byId={};DATA.playoffCareer.forEach(x=>byId[+x.franchise_id]={...x});
 DATA.standingsCareer.forEach(t=>{if(!byId[+t.franchise_id])byId[+t.franchise_id]={franchise_id:+t.franchise_id,owner_name:t.owner_name,playoff_appearances:0,championships:0,finals_appearances:0,third_place_finishes:0,fourth_place_finishes:0,playoff_games:0,playoff_wins:0,playoff_losses:0,playoff_win_pct:0,playoff_point_differential:0}});
 const career=Object.values(byId).sort((a,b)=>num(b.championships)-num(a.championships)||num(b.finals_appearances)-num(a.finals_appearances)||num(b.playoff_wins)-num(a.playoff_wins)||num(a.franchise_id)-num(b.franchise_id));
 const rows=career.map((x,i)=>({rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),titles:x.championships||0,finals:x.finals_appearances||0,apps:x.playoff_appearances||0,w:x.playoff_wins||0,l:x.playoff_losses||0,pct:pct(x.playoff_win_pct||0),_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),titles:x.championships||0,finals:x.finals_appearances||0,apps:x.playoff_appearances||0,w:x.playoff_wins||0,l:x.playoff_losses||0,pct:x.playoff_win_pct||0}}));
 app.innerHTML=hero('LEAGUE HISTORY','CHAMPIONS','Every league champion and the full playoff résumé.')+section('CHAMPIONS BY SEASON',`<div class="champions-grid">${seasonCards}</div>`)+section('PLAYOFF HISTORY',sortableTable([{label:'#',key:'rank'},{label:'TEAM',key:'team'},{label:'TITLES',key:'titles'},{label:'FINALS',key:'finals'},{label:'APPS',key:'apps'},{label:'W',key:'w'},{label:'L',key:'l'},{label:'WIN %',key:'pct'}],rows));
}

function playoffMatchCard(g,label=''){
 if(!g)return '<div class="bracket-empty">Game results unavailable.</div>';
 const winner=+g.winner_franchise_id;
 const row=(fid,name,score)=>`<div class="bracket-team ${+fid===winner?'winner':''}">${ownerAvatar(fid,'fig-bracket-avatar')}<span>${esc(displayOwnerName(name,fid))}</span><strong>${money(score)}</strong></div>`;
 return `<a class="bracket-match" href="#/game/${g.season}/${g.week}/${g.matchup_id}">${label?`<div class="bracket-match-label">${esc(label)}</div>`:''}${row(g.franchise_1,g.owner_1,g.score_1)}${row(g.franchise_2,g.owner_2,g.score_2)}<div class="bracket-open">VIEW MATCHUP & LINEUPS →</div></a>`;
}

async function playoffBracket(season){
 await load(['games','playoffs','standingsCareer','standingsSeasons']);navActive('');
 const y=String(season),results=playoffSeasonResults(y);
 if(!results.rounds.length){app.innerHTML=hero('PLAYOFF HISTORY',`${esc(y)} PLAYOFFS`,'No official championship bracket is available for this season.');return}
 const rounds=[...new Set(results.rounds.map(x=>num(x.playoff_round)))].sort((a,b)=>a-b);
 const first=results.rounds.filter(x=>num(x.playoff_round)===rounds[0]&&x.playoff_category==='Championship Path');
 const semi=results.rounds.filter(x=>num(x.playoff_round)===rounds[1]&&x.playoff_category==='Championship Path');
 const firstTeams=new Set(first.flatMap(x=>[+x.roster_a,+x.roster_b]));
 const semiTeams=new Set(semi.flatMap(x=>[+x.roster_a,+x.roster_b]));
 const byes=[...semiTeams].filter(id=>!firstTeams.has(id));
 const byeCards=byes.map(id=>`<div class="bracket-bye"><div class="bracket-match-label">FIRST-ROUND BYE</div>${ownerAvatar(id,'fig-bracket-avatar')}<strong>${esc(playoffSeasonOwner(id,y))}</strong></div>`).join('');
 const firstHtml=`<div class="bracket-round"><h2 class="bracket-round-title">ROUND 1</h2>${byeCards}${first.map(x=>playoffMatchCard(x.game,'WEEK '+x.week)).join('')||'<div class="bracket-empty">No first-round games.</div>'}</div>`;
 const semiHtml=`<div class="bracket-round"><h2 class="bracket-round-title">SEMIFINALS</h2>${semi.map(x=>playoffMatchCard(x.game,'WEEK '+x.week)).join('')||'<div class="bracket-empty">No semifinal games.</div>'}</div>`;
 const finalHtml=`<div class="bracket-round bracket-finals"><h2 class="bracket-round-title">FINALS</h2>${playoffMatchCard(results.title?.game,'CHAMPIONSHIP')}${playoffMatchCard(results.bronze?.game,'THIRD PLACE')}</div>`;
 const podium=`<div class="playoff-podium">${[['CHAMPION',results.champion],['RUNNER-UP',results.runnerUp],['THIRD PLACE',results.third]].map(([label,id])=>`<div><span>${label}</span>${id?ownerAvatar(id,'fig-bracket-podium-photo'):''}<strong>${id?ownerLink(playoffSeasonOwner(id,y),id):'Result not available'}</strong></div>`).join('')}</div>`;
 app.innerHTML=hero('PLAYOFF BRACKET',`${esc(y)} PLAYOFFS`,'Official championship-path results. Select any played matchup to see starters and the bench.')+podium+`<section class="section playoff-bracket-section"><div class="playoff-bracket">${firstHtml}${semiHtml}${finalHtml}</div></section>`;
}

async function gamesArchive(){
 await load(['allGames','standingsCareer']);navActive('');
 // Archived games only: this data source does not contain live in-progress weeks.
 const all=DATA.allGames||[];
 const years=[...new Set(all.map(g=>String(g.season)))].sort((a,b)=>+b-+a);
 const teams=[...(DATA.standingsCareer||[])].sort((a,b)=>+a.franchise_id-+b.franchise_id);
 let season='all',team=String(teams[0]?.franchise_id??''),visible=40;
 const seasonPills=[{value:'all',label:'ALL SEASONS'},...years.map(y=>({value:y,label:y}))];
 const teamPills=teams.map(t=>({value:t.franchise_id,label:displayOwnerName(t.owner_name,t.franchise_id)}));
 app.innerHTML=hero('LEAGUE ARCHIVE','GAME ARCHIVE','Final scores and starting lineups from every completed league matchup.')+
   `<section class="section fig-archive-page">
    <div class="fig-archive-intro"><strong>EVERY GAME. EVERY RIVALRY.</strong><p>Browse final scores from regular-season and postseason matchups, including consolation games. Select a game to see its complete lineup.</p></div>
    <div class="control-label">SEASON</div>${pills('gameSeason',seasonPills,season)}
    <div class="control-label spaced">TEAM</div>${pills('gameTeam',teamPills,team)}
    <div id="gameArchiveBody" class="fig-archive-results"></div>
   </section>`;
 const resultRoot=$('#gameArchiveBody');
 const filtered=()=>{
  let gs=all;
  if(season!=='all')gs=gs.filter(g=>String(g.season)===String(season));
  gs=gs.filter(g=>+g.franchise_1===+team||+g.franchise_2===+team);
  return [...gs].sort((a,b)=>+b.season-+a.season||+b.week-+a.week||+a.matchup_id-+b.matchup_id);
 };
 const makeCard=g=>{
  const score1=num(g.score_1),score2=num(g.score_2);
  const winner=score1===score2?0:score1>score2?+g.franchise_1:+g.franchise_2;
  const winnerText=winner?displayOwnerName(winner===+g.franchise_1?g.owner_1:g.owner_2,winner):'Tie';
  const phase=g.game_type==='Regular Season'?'REGULAR SEASON':'POSTSEASON';
  const teamLine=(id,name,score)=>`<div class="fig-archive-team ${winner===+id?'fig-archive-winner':''}">
    ${ownerAvatar(id,'fig-archive-avatar')}
    <span class="fig-archive-name">${esc(displayOwnerName(name,id))}</span>
    <span class="fig-archive-result">${winner===+id?'<span class="fig-archive-win-mark" aria-label="Winner">W</span>':'<span class="fig-archive-win-mark fig-archive-win-placeholder" aria-hidden="true">W</span>'}<strong class="fig-archive-score">${money(score)}</strong></span>
   </div>`;
  return `<a class="fig-archive-game" href="#/game/${encodeURIComponent(g.season)}/${encodeURIComponent(g.week)}/${encodeURIComponent(g.matchup_id)}"
   aria-label="${esc(displayOwnerName(g.owner_1,g.franchise_1))} ${money(score1)} versus ${esc(displayOwnerName(g.owner_2,g.franchise_2))} ${money(score2)}, ${g.season} week ${g.week}; view lineups">
   <div class="fig-archive-game-top"><span class="fig-archive-week">${esc(g.season)} <b>WEEK ${esc(g.week)}</b></span><span class="fig-archive-phase">${phase}</span></div>
   <div class="fig-archive-scoreboard">
    ${teamLine(g.franchise_1,g.owner_1,score1)}
    ${teamLine(g.franchise_2,g.owner_2,score2)}
   </div>
   <div class="fig-archive-game-bottom"><span class="fig-archive-final">FINAL <b>·</b> ${esc(winnerText)} ${winner?'won by '+money(Math.abs(score1-score2)):'tied'}</span>
    <span class="fig-archive-open">VIEW LINEUPS →</span>
   </div>
  </a>`;
 };
 const render=()=>{
  const gs=filtered();
  const shown=Math.min(visible,gs.length);
  resultRoot.innerHTML=`<div class="fig-archive-summary"><div><b>${gs.length.toLocaleString()} MATCHUPS</b><span>Most recent first · completed games only</span></div><span class="fig-archive-final-pill">FINAL SCORES</span></div>
   <div class="fig-archive-grid">${gs.slice(0,shown).map(makeCard).join('')||'<div class="empty">No completed games match those filters.</div>'}</div>
   <div class="fig-archive-paging"><span class="fig-archive-count">Showing ${shown.toLocaleString()} of ${gs.length.toLocaleString()} games</span>
    ${shown<gs.length?'<button class="fig-archive-more" type="button" id="figArchiveMore">SHOW 40 MORE ↓</button>':''}
   </div>`;
  $('#figArchiveMore')?.addEventListener('click',()=>{visible+=40;render()});
 };
 bindPills('gameSeason',v=>{season=v;visible=40;render()});
 bindPills('gameTeam',v=>{team=v;visible=40;render()});
 render();
}
async function standings(){
 await load(['standingsCareer','standingsSeasons','allPlayCareer','luckSeasons','teamSeasonMaster']);navActive('standings');
 const years=[...new Set(DATA.teamSeasonMaster.map(x=>x.season))].sort((a,b)=>b-a);let season='career',view='actual';
 app.innerHTML=hero('LEAGUE TABLE','STANDINGS','Actual results, all-play performance, Max PF and the luck hiding underneath the record. Click any header to sort.')+`<section class="section"><div class="control-label">SEASON</div>${pills('seasonPills',[{value:'career',label:'ALL-TIME'},...years.map(y=>({value:y,label:y}))],season)}<div class="control-label spaced">VIEW</div>${pills('standView',[{value:'actual',label:'ACTUAL'},{value:'allplay',label:'ALL-PLAY'},{value:'luck',label:'LUCK'}],view)}<div id="standingsTable" class="control-output"></div></section>`;
 const render=()=>{$('#standingsTable').innerHTML=standingsTableFor(season,view)};
 bindPills('seasonPills',v=>{season=v;render()});bindPills('standView',v=>{view=v;render()});render();
}

async function teams(){
 await load(['standingsCareer']);navActive('teams');const rows=[...DATA.standingsCareer].sort((a,b)=>+a.franchise_id-+b.franchise_id);
 app.innerHTML=hero('TEN FRANCHISES','THE TEAMS','Every franchise has a complete history of results, players and matchups.')+section('FRANCHISE DIRECTORY',`<div class="team-grid">${rows.map(x=>`<a class="team-card" href="#/team/${x.franchise_id}">${ownerAvatar(x.franchise_id,"team-card-photo")}<div class="team-name">${esc(displayOwnerName(x.owner_name,x.franchise_id))}${ownerBadges(x.franchise_id)}</div><div class="team-record">${x.wins}-${x.losses} • ${pct(x.win_pct)}</div><div class="team-meta"><span><strong>${money(x.points_for)}</strong>Points</span><span><strong>${num(x.point_differential)>=0?'+':''}${money(x.point_differential)}</strong>Diff</span></div></a>`).join('')}</div>`);
}


async function team(id){
 id=+id;
 await load(['standingsCareer','teamSeasonMaster','franchiseCareer','positions','currentRoster','currentPicks','websiteStreaks','teamSeasonTop3','completedAccomplishments','singleSeasonRecords','records','playerLog','games','weeklyRanks','raValues','draftPicks']);
 navActive('teams');
 const c=DATA.standingsCareer.find(x=>+x.franchise_id===id);
 if(!c){app.innerHTML='<div class="empty">Unknown franchise.</div>';return}
 const years=[...new Set(DATA.teamSeasonMaster.filter(x=>+x.franchise_id===id).map(x=>+x.season))].sort((a,b)=>b-a);
 const latest=Math.max(...years);
 const currentRoster=DATA.currentRoster.filter(x=>+x.franchise_id===id);
 const currentPicks=DATA.currentPicks.filter(x=>+x.current_franchise_id===id&&+x.pick_season>latest).sort((a,b)=>+a.pick_season-+b.pick_season||+a.round-+b.round||+a.original_franchise_id-+b.original_franchise_id);
 const career=DATA.franchiseCareer.filter(x=>+x.franchise_id===id);
 const activeStreaks=DATA.websiteStreaks.filter(x=>+x.franchise_id===id&&(x.active===true||String(x.active).toLowerCase()==='true')&&num(x.length)>=2).sort((a,b)=>num(b.length)-num(a.length));
 const streakTop=[];
 for(const s of DATA.websiteStreaks.filter(x=>+x.franchise_id===id&&num(x.length)>=2)){
   const peers=DATA.websiteStreaks.filter(x=>x.streak_type===s.streak_type&&x.streak_mode===s.streak_mode&&num(x.length)>=2).sort((a,b)=>num(b.length)-num(a.length)||num(b.total_points)-num(a.total_points));
   const targetIndex=peers.findIndex(x=>+x.franchise_id===id&&x.start_season===s.start_season&&x.start_week===s.start_week&&x.length===s.length);
   if(targetIndex<0)continue;
   const targetLength=num(s.length);let rank=1;for(let i=0;i<targetIndex;i++){if(num(peers[i].length)>targetLength)rank=i+2;}
   const tied=peers.filter(x=>num(x.length)===targetLength).length>1;
   if(rank<=3)streakTop.push({...s,_rank:rank,_tied:tied});
 }
 // Team snapshot mirrors every ALL-TIME category that exists on the main Team Records screen,
 // including its four special weekly leaderboards. This keeps the profile snapshot and record book in sync.
 const allCareerRecordRows=cleanTeamRecordRows('All-Time Combined');
 const careerTopRecords=allCareerRecordRows.filter(x=>+x.franchise_id===id&&num(x.rank)<=3&&num(x.value)>0).map(x=>({source:'career',rank:x.rank,label:x.category,value:x.value,view:'All-Time Combined',tied:allCareerRecordRows.filter(y=>y.category===x.category&&sameRecordValue(y.value,x.value)).length>1,href:`#/record/team/${encodeURIComponent(x.category)}/${encodeURIComponent('All-Time Combined')}`}));
 const allTimeSpecialRows=(()=>{
   const teamWeeks=[];
   (DATA.games||[]).forEach(g=>{teamWeeks.push({franchise_id:+g.franchise_1,owner:g.owner_1,value:num(g.score_1),season:g.season,week:g.week});teamWeeks.push({franchise_id:+g.franchise_2,owner:g.owner_2,value:num(g.score_2),season:g.season,week:g.week})});
   const rankRows=(rows,descending=true)=>{const sorted=[...rows].sort((a,b)=>descending?num(b.value)-num(a.value):num(a.value)-num(b.value));let prev=null,rank=0;return sorted.map((x,i)=>{if(prev===null||!sameRecordValue(x.value,prev))rank=i+1;prev=x.value;return {...x,rank,tied:sorted.filter(y=>sameRecordValue(y.value,x.value)).length>1}})};
   const highRows=rankRows(teamWeeks,true).map(x=>({...x,label:'HIGHEST SCORING WEEK',href:'#/special/teamweeks/All-Time%20Combined'}));
   const lowRows=rankRows(teamWeeks,false).map(x=>({...x,label:'LOWEST SCORING WEEK',href:'#/special/teamweeks-low/All-Time%20Combined'}));
   const weekly={};(DATA.standingsCareer||[]).forEach(x=>weekly[+x.franchise_id]={franchise_id:+x.franchise_id,owner:x.owner_name,high:0,top3:0});
   const byWeek={};teamWeeks.forEach(x=>(byWeek[`${x.season}-${x.week}`]??=[]).push(x));Object.values(byWeek).forEach(rows=>{rows.sort((a,b)=>num(b.value)-num(a.value));rows.forEach((x,i)=>{if(weekly[x.franchise_id]){if(i===0)weekly[x.franchise_id].high++;if(i<3)weekly[x.franchise_id].top3++}})});
   const weeklyRows=Object.values(weekly);
   const highCountRows=rankRows(weeklyRows.map(x=>({franchise_id:x.franchise_id,owner:x.owner,value:x.high})),true).map(x=>({...x,label:'WEEKLY HIGH SCORES',href:'#/special/highscores/All-Time%20Combined'}));
   const top3CountRows=rankRows(weeklyRows.map(x=>({franchise_id:x.franchise_id,owner:x.owner,value:x.top3})),true).map(x=>({...x,label:'TOP-3 WEEKLY SCORES',href:'#/special/top3/All-Time%20Combined'}));
   return [...highRows,...lowRows,...highCountRows,...top3CountRows];
 })();
 // Preserve secondary leaderboard placements for single-week records instead of collapsing a
 // franchise to only its best occurrence. Highest/lowest scoring weeks show every top-10 slot
 // occupied by this franchise; aggregate weekly-count records remain top-3 franchise records.
 const specialTopRecords=allTimeSpecialRows.filter(x=>{
   if(+x.franchise_id!==id||num(x.value)<0)return false;
   if(x.label==='HIGHEST SCORING WEEK'||x.label==='LOWEST SCORING WEEK')return num(x.rank)<=10;
   return num(x.rank)<=3;
 }).map(x=>({source:'special',rank:x.rank,label:x.label,value:x.value,season:x.season,week:x.week,view:'All-Time Combined',tied:x.tied,href:x.href}));
 // Career/aggregate categories have one meaningful row per franchise, so dedupe those by label.
 // Single-week special rows are intentionally NOT deduped because #1, #2, #3, etc. are separate
 // record-book placements that should all appear on the franchise snapshot.
 const teamTopMap=new Map();for(const r of careerTopRecords){const key=String(r.label);const prev=teamTopMap.get(key);if(!prev||num(r.rank)<num(prev.rank)||(num(r.rank)===num(prev.rank)&&num(r.value)>num(prev.value)))teamTopMap.set(key,r)}
 const teamTopRecords=[...teamTopMap.values(),...specialTopRecords].sort((a,b)=>num(a.rank)-num(b.rank)||String(a.label).localeCompare(String(b.label))||num(b.value)-num(a.value));
 const completeTeamSeasons=new Set(DATA.teamSeasonMaster.filter(x=>x.season_complete===true||String(x.season_complete).toLowerCase()==='true').map(x=>String(x.season)));
 const allSeasonRecordRowsRaw=DATA.singleSeasonRecords.filter(x=>!redundantScoreAverageRecord(x)&&!excludedSingleSeasonRecord(x)&&completeTeamSeasons.has(String(x.season))&&num(x.value)>0&&!['games_100'].includes(String(x.metric||''))&&!/100\+ point games/i.test(String(x.record_category||''))).concat(singleSeasonBombRows().filter(x=>num(x.value)>0));
 // Re-rank every single-season category AFTER removing active/incomplete seasons. The exported
 // rank can include the live 2026 season, which made completed 2025 records appear as #2/#3 on
 // team pages even when they are #1 in the completed-season record book.
 const allSeasonRecordRows=[];
 [...new Set(allSeasonRecordRowsRaw.map(x=>x.record_category))].forEach(cat=>{
   const ranked=allSeasonRecordRowsRaw.filter(x=>x.record_category===cat).sort((a,b)=>num(b.value)-num(a.value)||num(b.season)-num(a.season)||num(a.franchise_id)-num(b.franchise_id));
   let prev=null,rank=0;
   ranked.forEach((x,i)=>{if(prev===null||!sameRecordValue(x.value,prev))rank=i+1;prev=x.value;allSeasonRecordRows.push({...x,rank})});
 });
 const seasonTopRecords=allSeasonRecordRows.filter(x=>+x.franchise_id===id&&num(x.rank)<=3).map(x=>({...x,tied:allSeasonRecordRows.filter(y=>y.record_category===x.record_category&&sameRecordValue(y.value,x.value)).length>1})).sort((a,b)=>num(a.rank)-num(b.rank)||num(b.season)-num(a.season)||String(a.record_category).localeCompare(String(b.record_category)));
 const accomplishments=DATA.completedAccomplishments.filter(x=>+x.franchise_id===id).sort((a,b)=>num(b.importance)-num(a.importance)||num(b.season)-num(a.season));
 const latestSeasonRow=DATA.teamSeasonMaster.find(x=>+x.franchise_id===id&&+x.season===latest)||{};
 const careerRows=DATA.standingsCareer.map(x=>({...x,avg_score:num(x.points_for)/Math.max(1,num(x.games)),avg_pa:num(x.points_against)/Math.max(1,num(x.games))}));
 const weeklyCareer={};DATA.standingsCareer.forEach(x=>weeklyCareer[+x.franchise_id]={franchise_id:+x.franchise_id,high:0,top3:0});DATA.weeklyRanks.forEach(x=>{const z=weeklyCareer[+x.franchise_id];if(z){if(x.weekly_high_score===true||String(x.weekly_high_score).toLowerCase()==='true')z.high++;if(x.weekly_top_3===true||String(x.weekly_top_3).toLowerCase()==='true')z.top3++}});const weeklyCareerRows=Object.values(weeklyCareer);
 const meCareer=careerRows.find(x=>+x.franchise_id===id)||{};const meWeekly=weeklyCareer[id]||{high:0,top3:0};
 const careerStats=[
  {label:'RECORD',value:`${c.wins}-${c.losses}`,rank:null,accent:'mint'},
  {label:'WINNING %',value:pct(c.win_pct),rank:rankValue(careerRows,id,x=>num(x.win_pct)),accent:'blue'},
  {label:'CAREER POINTS',value:money(c.points_for),rank:rankValue(careerRows,id,x=>num(x.points_for)),accent:'gold'},
  {label:'POINT DIFF',value:`${num(c.point_differential)>=0?'+':''}${money(c.point_differential)}`,rank:rankValue(careerRows,id,x=>num(x.point_differential)),accent:'coral'},
  {label:'AVG SCORE',value:money(meCareer.avg_score),rank:rankValue(careerRows,id,x=>num(x.avg_score)),accent:'mint'},
  {label:'AVG PTS AG',value:money(meCareer.avg_pa),rank:rankValue(careerRows,id,x=>num(x.avg_pa),false),accent:'blue'},
  {label:'WEEKS #1',value:meWeekly.high,rank:rankValue(weeklyCareerRows,id,x=>num(x.high)),accent:'gold'},
  {label:'TOP-3 WEEKS',value:meWeekly.top3,rank:rankValue(weeklyCareerRows,id,x=>num(x.top3)),accent:'coral'}
 ];
 const careerStatsHtml=careerStats.map(x=>`<div class="team-stat-tile stat-${x.accent}"><span>${x.label}</span><strong>${x.value}</strong>${x.rank?`<em>RANK: #${x.rank}</em>`:''}</div>`).join('');
 const teamHeader=`<section class="team-profile-shell"><div class="team-profile-top">${ownerAvatar(id,"team-profile-photo")}<div class="team-profile-copy"><div class="eyebrow">FRANCHISE ARCHIVE</div><h1>${displayOwnerName(c.owner_name,id)}</h1><div class="team-profile-sub">${c.wins}-${c.losses} CAREER RECORD</div></div></div>${raTeamPanel(id)}<div class="career-stats-title"><span></span><h2>CAREER STATS</h2><span></span></div><div class="team-career-stats">${careerStatsHtml}</div><div class="tabs team-profile-tabs" id="teamTabs"><button class="active" data-tab="records">RECORDS</button><button data-tab="roster">ROSTER</button><button data-tab="players">PLAYER RECORDS</button><button data-tab="seasons">SEASONS</button></div></section><div id="teamTabBody"></div>`;
 app.innerHTML=teamHeader;

 const rosterSort=(rows)=>{
   const order={QB:1,RB:2,WR:3,TE:4,K:5,DEF:6};
   return [...rows].sort((a,b)=>(order[a.position]||99)-(order[b.position]||99)||String(a.player_name).localeCompare(String(b.player_name)));
 };
 const bool=v=>v===true||String(v).toLowerCase()==='true';
 const slotLabel=x=>{const raw=String(x.lineup_slot||x.position||'').toUpperCase();if(raw==='FLEX')return'FLEX';if(raw==='SUPER_FLEX'||raw==='SUPERFLEX')return'SFLX';return raw||'—'};
 const slotClass=x=>{const raw=String(x.lineup_slot||x.position||'bn').toLowerCase().replace('_','-');return `slot-${raw}`};
 const rosterGroup=(title,rows,kind)=>{
   const ordered=kind==='starters'?[...rows].sort((a,b)=>num(a.lineup_order)-num(b.lineup_order)):rosterSort(rows);
   return `<div class="sleeper-roster-section ${kind}"><div class="sleeper-roster-heading">${title}</div>${ordered.length?ordered.map(x=>`<a class="sleeper-player-row" href="#/player/${x.player_id}"><span class="sleeper-slot ${slotClass(x)}">${kind==='bench'?'BN':kind==='reserve'?'IR':kind==='taxi'?'TX':esc(slotLabel(x))}</span><span class="sleeper-player-main">${playerHeadshot(x.player_id,x.player_name)}<span class="fig-roster-player-copy"><b>${esc(x.player_name||x.player_id)}</b><small>${esc(x.position||'UNKNOWN')}</small></span></span><span class="sleeper-player-tag">${raPlayer(x.player_id)!==null?`<b class="ra-roster-val">${money(raPlayer(x.player_id))}</b>`:bool(x.is_reserve)?'IR':bool(x.is_taxi)?'TAXI':'—'}</span></a>`).join(''):'<div class="sleeper-empty">Empty</div>'}</div>`;
 };

 const renderRoster=()=>{
  let filterPosition='ALL';
  const starter=currentRoster.filter(x=>bool(x.is_starter));
  const reserve=currentRoster.filter(x=>bool(x.is_reserve));
  const taxi=currentRoster.filter(x=>bool(x.is_taxi));
  const bench=currentRoster.filter(x=>!bool(x.is_starter)&&!bool(x.is_reserve)&&!bool(x.is_taxi));
  const knownPositions=['QB','RB','WR','TE','K','DEF'];
  const rosterPositions=[...knownPositions,'OTHER'].map(pos=>({pos,count:currentRoster.filter(x=>pos==='OTHER'?!knownPositions.includes(String(x.position||'').toUpperCase()):String(x.position).toUpperCase()===pos).length})).filter(x=>x.count);
  const valued=currentRoster.map(x=>raPlayer(x.player_id)).filter(x=>x!==null&&Number.isFinite(+x));
  const starterValue=starter.map(x=>raPlayer(x.player_id)).filter(x=>x!==null&&Number.isFinite(+x)).reduce((total,v)=>total+num(v),0);
  const totalValue=valued.reduce((total,v)=>total+num(v),0);
  const summary=[
   {label:'STARTERS',value:starter.length},
   {label:'BENCH',value:bench.length},
   {label:'INJURED RESERVE',value:reserve.length},
   {label:'TAXI',value:taxi.length},
   {label:'PLAYERS VALUED',value:`${valued.length}/${currentRoster.length}`},
   {label:'STARTER VALUE',value:money(starterValue)},
   {label:'ROSTER VALUE',value:money(totalValue)}
  ];
  const picksByYear={};currentPicks.forEach(x=>(picksByYear[x.pick_season]??=[]).push(x));
  const picksHtml=Object.entries(picksByYear).sort((a,b)=>+a[0]-+b[0]).map(([year,picks])=>`<div class="fig-roster-pick-year"><h3>${year} DRAFT PICKS <span>${picks.length}</span></h3><div class="fig-roster-picks-grid">
    ${picks.map(p=>{const value=raPickValuation(p.pick_season,p.round,p.original_franchise_id);
     return `<div class="fig-roster-pick"><span>ROUND ${p.round}</span><b>${esc(displayOwnerName('',p.original_franchise_id))} ORIGINAL</b>${value.value!==null?`<strong>~${money(value.value)} VALUE</strong>`:''}</div>`}).join('')}
   </div></div>`).join('');
  const draw=()=>{
   const visible=rows=>filterPosition==='ALL'?rows:rows.filter(x=>filterPosition==='OTHER'?!knownPositions.includes(String(x.position||'').toUpperCase()):String(x.position).toUpperCase()===filterPosition);
   $('#teamTabBody').innerHTML=`<section class="fig-roster-dashboard">
    <div class="fig-roster-title"><div><span>CURRENT SLEEPER ROSTER</span><h2>${latest} TEAM ROSTER</h2></div><strong>${currentRoster.length} PLAYERS</strong></div>
    <div class="fig-roster-summary">${summary.map(m=>`<div class="fig-roster-stat"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>`).join('')}</div>
    <div class="fig-roster-mix" aria-label="Roster players by position"><strong>POSITION MIX</strong>${rosterPositions.map(p=>`<span><b>${esc(p.pos)}</b> ${p.count}</span>`).join('')}</div>
    <div class="fig-roster-position"><span>FILTER PLAYERS BY POSITION</span>${pills('rosterPos',['ALL','QB','RB','WR','TE','K','DEF','OTHER'].map(pos=>({value:pos,label:pos})),filterPosition)}</div>
    <div class="fig-roster-boards">
     ${rosterGroup('STARTING LINEUP · '+visible(starter).length,visible(starter),'starters')}
     ${rosterGroup('BENCH · '+visible(bench).length,visible(bench),'bench')}
     ${rosterGroup('INJURED RESERVE · '+visible(reserve).length,visible(reserve),'reserve')}
     ${rosterGroup('TAXI SQUAD · '+visible(taxi).length,visible(taxi),'taxi')}
    </div>
    <p class="fig-roster-value-note">Market values use the latest RosterAudit snapshot. Player totals exclude future picks; empty values are not estimated.</p>
   </section>
   <section class="fig-roster-picks-panel"><div class="fig-roster-picks-title"><h2>FUTURE DRAFT PICKS</h2><span>${currentPicks.length} PICKS</span></div>
   ${picksHtml||'<div class="empty">No undrafted future picks found.</div>'}</section>`;
   bindPills('rosterPos',v=>{filterPosition=v;draw()});
  };draw();
 };
 const renderPlayers=()=>{
   let pos='ALL',q='';
   const draw=()=>{
     const logs=(DATA.playerLog||[]).filter(x=>+x.franchise_id===id);
     const grouped={};
     logs.forEach(x=>{const pid=String(x.player_id),p=num(x.starter_points);const z=grouped[pid]??={player_id:pid,player_name:x.player_name,position:x.position,starts:0,points:0,b5:0,b20:0,b30:0,b40:0,b50:0};z.starts++;z.points+=p;if(p>=0&&p<10)z.b5++;if(p>=20&&p<30)z.b20++;if(p>=30&&p<40)z.b30++;if(p>=40&&p<50)z.b40++;if(p>=50)z.b50++});
     let players=Object.values(grouped).map(x=>({...x,pps:x.starts?x.points/x.starts:0}));
     players=players.filter(x=>playerBookMatchesPosition(x.position,pos));
     if(q)players=players.filter(x=>String(x.player_name||'').toLowerCase().includes(q));
     players.sort((a,b)=>num(b.points)-num(a.points));
     const bombCell=(x,label,key)=>`<a class="bomb-count-link" href="#/playerbomb/${x.player_id}/${encodeURIComponent(label)}/all/${encodeURIComponent('All-Time Combined')}/${id}">${num(x[key])}</a>`;
     const rows=players.map((x,i)=>({rank:i+1,player:`${playerLink(x.player_id,x.player_name)}`,pos:`<span class="pos">${x.position}</span>`,starts:x.starts,points:money(x.points),pps:money(x.pps),b5:bombCell(x,'5 BOMBS','b5'),b20:bombCell(x,'20 BOMBS','b20'),b30:bombCell(x,'30 BOMBS','b30'),b40:bombCell(x,'40 BOMBS','b40'),b50:bombCell(x,'50 BOMBS','b50'),_sort:{rank:i+1,player:x.player_name,pos:x.position,starts:x.starts,points:x.points,pps:x.pps,b5:x.b5,b20:x.b20,b30:x.b30,b40:x.b40,b50:x.b50}}));
     $('#teamTabBody').innerHTML=`<section class="section player-book-section compact-player-book team-player-book"><div class="section-head player-book-head"><h2 class="section-title">PLAYER RECORD BOOK</h2><div class="player-book-tools">${pills('teamPos',[{value:'ALL',label:'ALL'},{value:'QB',label:'QB'},{value:'RB',label:'RB'},{value:'WR',label:'WR'},{value:'TE',label:'TE'},{value:'FLEX',label:'FLEX'}],pos)}<input id="teamPlayerSearch" class="search player-record-search" placeholder="Search player…" value="${esc(q)}"></div></div><div class="player-book-scroll-tip">Scroll horizontally to see all stats <span aria-hidden="true">→</span></div>${sortableTable([{label:'#',key:'rank'},{label:'PLAYER',key:'player'},{label:'POS',key:'pos'},{label:'STARTS',key:'starts'},{label:'POINTS',key:'points'},{label:'PTS/START',key:'pps'},{label:'5 BOMBS',key:'b5'},{label:'20 BOMBS',key:'b20'},{label:'30 BOMBS',key:'b30'},{label:'40 BOMBS',key:'b40'},{label:'50 BOMBS',key:'b50'}],rows)}</section>`;
     bindPills('teamPos',v=>{pos=v;draw()});
     const inp=$('#teamPlayerSearch');if(inp){inp.oninput=e=>{q=e.target.value.toLowerCase();draw();setTimeout(()=>{const n=$('#teamPlayerSearch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},0)}}
   };draw()
 };

 const renderRecords=()=>{
   const activeHtml=activeStreaks.length?activeStreaks.map(s=>`<a class="mini-record accent-streak" href="#/breakdown/streak/${encodeURIComponent(s.streak_type)}/${encodeURIComponent(s.streak_mode)}/${s.franchise_id}/${s.start_season}/${s.start_week}/${s.end_season}/${s.end_week}"><b>${esc(s.streak_type)}</b><span>${s.length} ACTIVE · VIEW GAMES →</span></a>`).join(''):'<div class="snapshot-empty">No active qualifying streaks.</div>';
   const recordHtml=teamTopRecords.length?teamTopRecords.map(r=>{const when=(r.season&&r.week)?` <small>• ${esc(r.season)} W${esc(r.week)}</small>`:'';return `<a class="mini-record accent-record" href="${r.href||`#/record/team/${encodeURIComponent(r.label)}/${encodeURIComponent(r.view)}`}"><b>${tiedRankLabel(r.rank,r.tied)} ${esc(r.label)}</b><span>${typeof r.value==='number'?money(r.value):esc(r.value)}${when}</span></a>`}).join(''):'<div class="snapshot-empty">No qualifying team records.</div>';
   const streakUnique=[];const seen=new Set();for(const s of streakTop){const k=`${s.streak_type}-${s._rank}-${s.length}`;if(!seen.has(k)){seen.add(k);streakUnique.push(s)}}
   const streakHtml=streakUnique.length?streakUnique.map(s=>`<a class="mini-record accent-streak" href="#/streak/${encodeURIComponent(s.streak_type)}/${encodeURIComponent(s.streak_mode)}"><b>${tiedRankLabel(s._rank,s._tied)} ${esc(s.streak_type)}</b><span>${s.length}</span></a>`).join(''):'<div class="snapshot-empty">No top-3 streak records.</div>';
   const seasonHtml=accomplishments.length?accomplishments.map(a=>`<div class="season-accomplishment"><span>${a.season}</span><b>${esc(a.label)}</b></div>`).join(''):'<div class="snapshot-empty">No qualifying past-season accomplishments.</div>';
   const ssHtml=seasonTopRecords.length?seasonTopRecords.map(r=>`<a class="single-season-team-record" href="#/singleseasons/${encodeURIComponent(r.record_category)}"><div><span>${r.season}</span><b>${esc(r.record_category)}</b></div><strong>${tiedRankLabel(r.rank,r.tied)}</strong><em>${typeof r.value==='number'?money(r.value):esc(r.value)}</em></a>`).join(''):'<div class="snapshot-empty">No top-3 single-season records.</div>';
   $('#teamTabBody').innerHTML=`<section class="team-record-dashboard"><div class="records-dashboard-head"><div><span>FRANCHISE RECORDS</span><h2>RECORD SNAPSHOT</h2></div></div><div class="two-col-record-snapshot"><div><h3>ACTIVE STREAKS</h3><div class="mini-record-list">${activeHtml}</div><h3 class="spaced">TOP-3 TEAM RECORDS</h3><div class="mini-record-list">${recordHtml}</div><h3 class="spaced">TOP-3 STREAK RECORDS</h3><div class="mini-record-list">${streakHtml}</div></div><div><h3>PAST SEASON ACCOMPLISHMENTS</h3><div class="season-accomplishments">${seasonHtml}</div></div></div></section><section class="team-single-season-section"><div class="section-head"><div><div class="eyebrow">HISTORICAL PEAKS</div><h2 class="section-title">SINGLE-SEASON RECORDS</h2></div><a class="section-link" href="#/singleseasons">FULL LEAGUE BOOK →</a></div><div class="single-season-team-grid">${ssHtml}</div></section>`;
 };
 const renderSeasons=()=>{
  const cards=years.map(year=>{
   const z=DATA.teamSeasonMaster.find(x=>+x.franchise_id===id&&+x.season===year)||{};
   return `<a class="fig-season-preview" href="#/teamseason/${id}/${year}">
    <div class="fig-season-preview-head"><strong>${year}</strong><span>${z.season_complete?'FINAL':'IN PROGRESS'}</span></div>
    <div class="fig-season-preview-lead"><strong>${num(z.wins)}–${num(z.losses)}</strong><span>WIN % ${pct(z.win_pct)} · FINISH #${z.regular_season_finish||'—'}</span></div>
    <div class="fig-season-preview-metrics"><div><small>POINTS FOR</small><b>${money(z.points_for)}</b></div><div><small>MAX PF</small><b>${money(z.max_pf)}</b></div><div><small>ALL-PLAY</small><b>${num(z.all_play_wins)}–${num(z.all_play_losses)}${num(z.all_play_ties)?'–'+num(z.all_play_ties):''}</b></div><div><small>HIGH WEEKS</small><b>${num(z.weekly_high_scores)}</b></div><div><small>AVG SCORE</small><b>${money(z.points_per_game)}</b></div><div><small>POINT DIFF</small><b>${num(z.point_differential)>0?'+':''}${money(z.point_differential)}</b></div></div>
    <div class="fig-season-preview-open">VIEW SEASON, OPPONENTS & GAMES →</div></a>`;
  }).join('');
  $('#teamTabBody').innerHTML=section('SEASON ARCHIVE',`<div class="fig-season-previews">${cards}</div>`,'Tap any year for detailed statistics, all-play against all nine teams, scoring leaders and every game.');
 };

 const renderPositions=()=>{const rows=DATA.positions.filter(x=>+x.franchise_id===id).map(x=>({pos:x.position,players:x.unique_players_started,starts:x.total_starts,points:money(x.total_starter_points),pps:money(x.points_per_start),best:money(x.best_single_game),_sort:{pos:x.position,players:x.unique_players_started,starts:x.total_starts,points:x.total_starter_points,pps:x.points_per_start,best:x.best_single_game}}));$('#teamTabBody').innerHTML=section('POSITION HISTORY',sortableTable([{label:'POS',key:'pos'},{label:'PLAYERS',key:'players'},{label:'STARTS',key:'starts'},{label:'POINTS',key:'points'},{label:'PTS/START',key:'pps'},{label:'BEST',key:'best'}],rows))};

 const renderers={records:renderRecords,roster:renderRoster,players:renderPlayers,seasons:renderSeasons};
 $$('#teamTabs button').forEach(b=>b.onclick=()=>{$$('#teamTabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderers[b.dataset.tab]()});
 renderRecords();
}


async function records(){
 await load(['records','standingsCareer','playoffCareer','teamSeasonMaster','weeklyRanks','singleSeasonRecords','games','playerLog']);navActive('records');
 let view='All-Time Combined';
 const podiumById=new Map((DATA.playoffCareer||[]).map(x=>[+x.franchise_id,x]));
 const allTime=[...(DATA.standingsCareer||[])].sort((a,b)=>num(b.win_pct)-num(a.win_pct)||num(b.wins)-num(a.wins));
 const rows=allTime.map((x,i)=>{
   const p=podiumById.get(+x.franchise_id)||{};
   const gold=num(p.championships),silver=Math.max(0,num(p.finals_appearances)-gold),bronze=num(p.third_place_finishes);
   return {rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),
    gold:`<span class="fig-medal fig-gold">●</span> ${gold}`,
    silver:`<span class="fig-medal fig-silver">●</span> ${silver}`,
    bronze:`<span class="fig-medal fig-bronze">●</span> ${bronze}`,
    win:pct(x.win_pct),w:num(x.wins),l:num(x.losses),pf:money(x.points_for),
    _sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),gold,silver,bronze,win:num(x.win_pct),w:num(x.wins),l:num(x.losses),pf:num(x.points_for)}};
 });
 const hallBoard=section('ALL-TIME STANDINGS',
   sortableTable([{label:'#',key:'rank'},{label:'TEAM',key:'team'},{label:'1ST',key:'gold'},{label:'2ND',key:'silver'},
    {label:'3RD',key:'bronze'},{label:'WIN %',key:'win'},{label:'W',key:'w'},{label:'L',key:'l'},{label:'PF',key:'pf'}],rows),
   'Official completed results · swipe to see placements and scoring');
 app.innerHTML=hero('THE HALL OF RECORDS','TEAM RECORDS','League bests, record holders and the full historical leaderboard.')+
 hallBoard+`<section class="section"><div class="control-label">RECORD VIEW</div>${pills('recordView',[{value:'All-Time Combined',label:'ALL-TIME'},{value:'Regular Season',label:'REGULAR SEASON'},{value:'Playoffs',label:'PLAYOFFS'},{value:'Single Season',label:'SINGLE SEASON'}],view)}<div id="recordBody" class="control-output"></div></section>`;
 const gamesForView=()=>DATA.games.filter(g=>view==='All-Time Combined'?true:view==='Regular Season'?g.game_type==='Regular Season':view==='Playoffs'?g.game_type!=='Regular Season':false);
 const weeklySummary=()=>{const out={};DATA.standingsCareer.forEach(x=>out[+x.franchise_id]={id:+x.franchise_id,owner:x.owner_name,high:0,top3:0});const perf=[];gamesForView().forEach(g=>{perf.push({season:String(g.season),week:num(g.week),id:+g.franchise_1,owner:g.owner_1,score:num(g.score_1)});perf.push({season:String(g.season),week:num(g.week),id:+g.franchise_2,owner:g.owner_2,score:num(g.score_2)})});const groups={};perf.forEach(x=>(groups[`${x.season}-${x.week}`]??=[]).push(x));Object.values(groups).forEach(rows=>{rows.sort((a,b)=>b.score-a.score);rows.forEach((x,i)=>{if(i===0&&out[x.id])out[x.id].high++;if(i<3&&out[x.id])out[x.id].top3++})});return Object.values(out)};


 const renderSpecialRecords=()=>{
   if(view==='Single Season')return '';
   const viewKey=encodeURIComponent(view);
   const perf=[];
   gamesForView().forEach(g=>{
     perf.push({id:+g.franchise_1,name:g.owner_1,value:num(g.score_1),season:g.season,week:g.week});
     perf.push({id:+g.franchise_2,name:g.owner_2,value:num(g.score_2),season:g.season,week:g.week});
   });
   const high=[...perf].sort((a,b)=>b.value-a.value).map(x=>({...x,display:money(x.value),note:`${x.season} W${x.week}`}));
   const low=[...perf].sort((a,b)=>a.value-b.value).map(x=>({...x,display:money(x.value),note:`${x.season} W${x.week}`}));
   const wins=weeklySummary();
   const highWeeks=[...wins].sort((a,b)=>b.high-a.high||b.top3-a.top3).map(x=>({id:x.id,name:x.owner,value:x.high}));
   const topThree=[...wins].sort((a,b)=>b.top3-a.top3||b.high-a.high).map(x=>({id:x.id,name:x.owner,value:x.top3}));
   const items=[
    {title:'HIGHEST SCORING WEEK',href:`#/special/teamweeks/${viewKey}`,leaders:high,badge:'SCORING RECORD',tone:'mint',allowRepeat:true},
    {title:'LOWEST SCORING WEEK',href:`#/special/teamweeks-low/${viewKey}`,leaders:low,badge:'SCORING RECORD',tone:'coral',allowRepeat:true}
   ];
   if(view!=='Playoffs')items.push(
    {title:'WEEKLY HIGH SCORES',href:`#/special/highscores/${viewKey}`,leaders:highWeeks,badge:'WEEKLY LEADER',tone:'blue'},
    {title:'TOP-3 WEEKLY SCORES',href:`#/special/top3/${viewKey}`,leaders:topThree,badge:'WEEKLY LEADER',tone:'gold'}
   );
   return items.map(recordPodiumCard).join('');
 };

 const renderSingleSeason=()=>{
   const completeSeasons=new Set(DATA.teamSeasonMaster.filter(x=>x.season_complete===true||String(x.season_complete).toLowerCase()==='true').map(x=>String(x.season)));
   const data=DATA.singleSeasonRecords.filter(x=>!redundantScoreAverageRecord(x)&&!excludedSingleSeasonRecord(x)&&completeSeasons.has(String(x.season))&&num(x.value)!==0&&!['games_100'].includes(String(x.metric||''))&&!/100\\+ point games/i.test(String(x.record_category||''))).concat(singleSeasonBombRows().filter(x=>num(x.value)!==0));
   const categories=[...new Set(data.map(x=>x.record_category))].sort();
   return categories.map((cat,i)=>{
     const rs=data.filter(x=>x.record_category===cat).sort((a,b)=>num(a.rank)-num(b.rank)||num(b.value)-num(a.value));
     if(!rs.length)return '';
     const winner=rs[0],ties=rs.filter(x=>sameRecordValue(x.value,winner.value));
     const seasons=[...new Set(ties.map(x=>String(x.season||'')).filter(Boolean))];
     return recordPodiumCard({
       title:cat,href:`#/singleseasons/${encodeURIComponent(cat)}`,
       leaders:rs.map(x=>({id:+x.franchise_id,name:x.owner_name,value:x.value,display:money(x.value),note:String(x.season||'')})),allowRepeat:true,
       badge:'SINGLE-SEASON RECORD',tone:['mint','blue','gold','coral'][i%4],
       note:seasons.join(' · ')
     });
   }).join('');
 };
 const renderTeam=()=>{
   if(view==='Single Season')return renderSingleSeason();
   const groups={};
   cleanTeamRecordRows(view).forEach(x=>(groups[x.category]??=[]).push(x));
   return Object.entries(groups).map(([category,rs],i)=>{
     const valid=rs.filter(x=>num(x.value)!==0).sort((a,b)=>num(a.rank)-num(b.rank)||num(b.value)-num(a.value));
     if(!valid.length)return '';
     return recordPodiumCard({
       title:category,href:`#/record/team/${encodeURIComponent(category)}/${encodeURIComponent(view)}`,
       leaders:valid.map(x=>({id:+x.franchise_id,name:x.record_holder,value:x.value,display:money(x.value)})),
       badge:'TEAM RECORD',tone:['mint','gold','blue','coral'][i%4]
     });
   }).join('');
 };
 const render=()=>{
   const output=renderSpecialRecords()+renderTeam();
   const title=view==='Single Season'?'SINGLE-SEASON RECORDS':view==='Playoffs'?'PLAYOFF RECORDS':view==='Regular Season'?'REGULAR-SEASON RECORDS':'ALL-TIME RECORDS';
   $('#recordBody').innerHTML=`<div class="fig-record-gallery-heading"><h2>${title}</h2><p>Every official record has its own full leaderboard. Tied record holders share the portrait space.</p></div><div class="fig-podium-grid fig-record-gallery">${output||'<div class="empty">No completed records found.</div>'}</div>`;
 };
 bindPills('recordView',v=>{view=v;render()});render();
}

async function recordDetail(kind,key,viewEnc){
 const view=decodeURIComponent(viewEnc||'All-Time Combined'),decoded=decodeURIComponent(key||'');navActive('records');
 if(kind==='team'){
  await load(['records','playerLog','standingsCareer']);const source=cleanTeamRecordRows(view).filter(x=>x.category===decoded).sort((a,b)=>num(b.value)-num(a.value));const valueCounts={};source.forEach(x=>valueCounts[String(x.value)]=(valueCounts[String(x.value)]||0)+1);let prevVal=null,compRank=0;const rows=source.map((x,i)=>{if(prevVal===null||!sameRecordValue(x.value,prevVal))compRank=i+1;prevVal=x.value;const tied=valueCounts[String(x.value)]>1;return{rank:tiedRankLabel(compRank,tied),holder:x.franchise_id?ownerLink(x.record_holder,x.franchise_id):esc(x.record_holder),value:typeof x.value==='number'?money(x.value):esc(x.value),season:x.season||'ALL-TIME',_href:x.franchise_id?`#/breakdown/teamrecord/${encodeURIComponent(decoded)}/${encodeURIComponent(view)}/${x.franchise_id}`:null,_sort:{rank:compRank,holder:x.record_holder,value:x.value,season:x.season||0}}});
  app.innerHTML=hero('RECORD HISTORY',esc(decoded),`${esc(view)} • the complete leaderboard, not just the podium.`)+section('FULL HISTORY',sortableTable([{label:'#',key:'rank'},{label:'HOLDER',key:'holder'},{label:'VALUE',key:'value'},{label:'SEASON',key:'season'}],rows));return;
 }
 if(kind==='player'){
  await load(['playerCareers']);const metric=decoded;const labels={total_points:'CAREER POINTS',average_points:'POINTS PER START',highest_score:'BEST GAME',starts:'STARTS',games_20:'20+ POINT GAMES',games_30:'30+ POINT GAMES',games_40:'40+ POINT GAMES',games_50:'50+ POINT GAMES',games_60:'60+ POINT GAMES'};let data=DATA.playerCareers.filter(x=>x.scoring_view===view);data.sort((a,b)=>num(b[metric])-num(a[metric])||b.total_points-a.total_points);const rows=data.map((x,i)=>({rank:i+1,player:`${playerLink(x.player_id,x.full_name)}`,pos:`<span class="pos">${x.position}</span>`,value:metric==='average_points'||metric==='highest_score'||metric==='total_points'?money(x[metric]):x[metric],starts:x.starts,_sort:{rank:i+1,player:x.full_name,pos:x.position,value:x[metric],starts:x.starts}}));
  app.innerHTML=hero('PLAYER RECORD HISTORY',labels[metric]||humanMetric(metric),`${esc(view)} • every qualifying player ranked so you can see exactly how close everyone is.`)+section('FULL HISTORY',sortableTable([{label:'#',key:'rank'},{label:'PLAYER',key:'player'},{label:'POS',key:'pos'},{label:'VALUE',key:'value'},{label:'STARTS',key:'starts'}],rows));return;
 }
}


async function streaks(){
 await load(['websiteStreaks']);navActive('streaks');
 const career=DATA.websiteStreaks.filter(x=>String(x.streak_mode)==='Career Games'&&num(x.length)>=2&&!['100+ Points','180+ Points','190+ Points'].includes(String(x.streak_type)));
 const active=career.filter(x=>x.active===true||String(x.active).toLowerCase()==='true');
 const types=[...new Set(career.map(x=>x.streak_type))].sort();
 const activeRows=[...active].sort((a,b)=>num(b.length)-num(a.length)).map((x,i)=>({rank:i+1,team:ownerLink(x.owner,x.franchise_id),type:`<a class="fig-active-streak-link" href="#/breakdown/streak/${encodeURIComponent(x.streak_type)}/${encodeURIComponent(x.streak_mode)}/${x.franchise_id}/${x.start_season}/${x.start_week}/${x.end_season}/${x.end_week}">${esc(x.streak_type)} <small>VIEW GAMES →</small></a>`,len:x.length,start:`${x.start_season} W${x.start_week}`,last:`${x.end_season} W${x.end_week}`,_href:`#/breakdown/streak/${encodeURIComponent(x.streak_type)}/${encodeURIComponent(x.streak_mode)}/${x.franchise_id}/${x.start_season}/${x.start_week}/${x.end_season}/${x.end_week}`,_sort:{rank:i+1,team:displayOwnerName(x.owner,x.franchise_id),type:x.streak_type,len:x.length,start:num(x.start_season)*100+num(x.start_week),last:num(x.end_season)*100+num(x.end_week)}}));
 const orderedTypes=[...types].sort((a,b)=>{
   const priority=t=>t==='Winning'?0:t==='Losing'?1:2;
   return priority(a)-priority(b)||a.localeCompare(b);
 });
 const topCards=orderedTypes.map((type,i)=>{
   // Match the Full History leaderboard: rank individual streak runs, not
   // only each franchise's personal best. Each tied winning manager still
   // appears just once in the portrait mosaic.
   const ranked=career.filter(x=>x.streak_type===type)
     .sort((a,b)=>num(b.length)-num(a.length)||num(b.total_points)-num(a.total_points));
   return recordPodiumCard({
     title:type==='Winning'?'WINNING STREAK':type==='Losing'?'LOSING STREAK':type.toUpperCase(),
     badge:'STREAK RECORD',tone:['mint','coral','blue','gold'][i%4],
     href:`#/streak/${encodeURIComponent(type)}/Career%20Games`,
     leaders:ranked.map(x=>({id:+x.franchise_id,name:x.owner,value:num(x.length)})),
     allowRepeat:true,summarizeTiedRivals:true
   });
 }).join('');
 app.innerHTML=hero('STREAK ARCHIVE','STREAKS','Active runs and the league records that actually matter.')+
 section('ACTIVE STREAKS',activeRows.length?sortableTable([{label:'#',key:'rank'},{label:'TEAM',key:'team'},{label:'TYPE',key:'type'},{label:'LENGTH',key:'len'},{label:'START',key:'start'},{label:'LAST',key:'last'}],activeRows):'<div class="empty">No active qualifying streaks.</div>')+
 section('ALL-TIME STREAK RECORDS',`<div class="fig-podium-grid fig-streak-gallery">${topCards}</div>`,'Records belong here · select a category for the complete history');
}


async function streakDetail(typeEnc,modeEnc){
 await load(['websiteStreaks']);navActive('streaks');
 const type=decodeURIComponent(typeEnc||''),smode=decodeURIComponent(modeEnc||'Career Games');
 const data=DATA.websiteStreaks.filter(x=>x.streak_type===type&&x.streak_mode===smode&&num(x.length)>=2&&!['100+ Points','180+ Points','190+ Points'].includes(x.streak_type)).sort((a,b)=>num(b.length)-num(a.length)||num(b.total_points)-num(a.total_points));
 const lengthCounts={};data.forEach(x=>lengthCounts[String(num(x.length))]=(lengthCounts[String(num(x.length))]||0)+1);let prevLength=null,compRank=0;const rows=data.map((x,i)=>{const len=num(x.length);if(prevLength===null||len!==prevLength)compRank=i+1;prevLength=len;const tied=lengthCounts[String(len)]>1;return{rank:tiedRankLabel(compRank,tied),owner:ownerLink(x.owner,x.franchise_id),length:x.length,start:`${x.start_season} W${x.start_week}`,end:`${x.end_season} W${x.end_week}`,points:money(x.total_points),avg:money(x.average_points),status:(x.active===true||String(x.active).toLowerCase()==='true')?'ACTIVE':'Ended',_href:`#/breakdown/streak/${encodeURIComponent(type)}/${encodeURIComponent(smode)}/${x.franchise_id}/${x.start_season}/${x.start_week}/${x.end_season}/${x.end_week}`,_sort:{rank:compRank,owner:displayOwnerName(x.owner,x.franchise_id),length:x.length,start:num(x.start_season)*100+num(x.start_week),end:num(x.end_season)*100+num(x.end_week),points:x.total_points,avg:x.average_points,status:(x.active===true||String(x.active).toLowerCase()==='true')?1:0}}});
 app.innerHTML=hero('STREAK HISTORY',esc(type),`${esc(smode)} • complete historical leaderboard.`)+section('FULL HISTORY',sortableTable([{label:'#',key:'rank'},{label:'TEAM',key:'owner'},{label:'LENGTH',key:'length'},{label:'START',key:'start'},{label:'END',key:'end'},{label:'POINTS',key:'points'},{label:'AVG',key:'avg'},{label:'STATUS',key:'status'}],rows));
}

// An NFL player's trades are transaction-scoped and keyed by Sleeper player_id.
// Use only Received assets to avoid counting each trade twice (Sent + Received).
function playerTradeEntries(playerId,tradeAssets,trades,tradeSides){
 const txById=new Map((trades||[]).map(t=>[String(t.transaction_id),t]));
 const sidesByTx=new Map(),sentByTx=new Map();
 for(const side of tradeSides||[]){
  const key=String(side.transaction_id);
  if(!sidesByTx.has(key))sidesByTx.set(key,[]);
  sidesByTx.get(key).push(side);
 }
 for(const asset of tradeAssets||[]){
  if(asset.asset_type!=='Player'||String(asset.player_id)!==String(playerId)||asset.asset_direction!=='Sent')continue;
  sentByTx.set(String(asset.transaction_id),asset);
 }
 return (tradeAssets||[]).filter(x=>x.asset_type==='Player'&&String(x.player_id)===String(playerId)&&x.asset_direction==='Received')
  .map(received=>{
   const key=String(received.transaction_id),sent=sentByTx.get(key),trade=txById.get(key);
   return {key,received,sent,trade:trade||received,sides:sidesByTx.get(key)||[]};
  })
  .sort((a,b)=>+b.trade.season-+a.trade.season||+b.trade.week-+a.trade.week||b.key.localeCompare(a.key));
}
function playerTradeHistory(playerId){
 const timeline=playerTradeEntries(playerId,DATA.tradeAssets,DATA.trades,DATA.tradeSides);
 if(!timeline.length)return section('TRADE HISTORY',
  '<div class="fig-player-trades-empty">No trades involving this player are recorded in the league archive.</div>',
  'Completed league trades');
 const cards=timeline.map(({key,received,sent,trade,sides})=>{
  const fromId=+(sent?.franchise_id??received.counterparty_franchise_id);
  const toId=+received.franchise_id;
  const fromName=sent?.owner_name||'Previous team',toName=received.owner_name;
  const participants=sides.length||num(trade.franchises_involved);
  const packageRows=sides.map(s=>{
   const items=parseMaybeJSON(s.assets_received);
   return `<div class="fig-player-trade-package">
     <div class="fig-player-trade-package-owner">${ownerLink(s.owner_name,s.franchise_id)} <span>RECEIVED</span></div>
     <ul class="fig-player-trade-assets">${items.map(asset=>`<li>${esc(asset)}</li>`).join('')||'<li>No assets listed</li>'}</ul>
    </div>`;
  }).join('');
  return `<article class="fig-player-trade-card">
    <div class="fig-player-trade-top"><span>${esc(trade.season)} <b>WEEK ${esc(trade.week)}</b></span><span>${participants}-TEAM TRADE</span></div>
    <div class="fig-player-trade-transfer">
     <div class="fig-player-trade-direction"><small>TRADED FROM</small>${ownerLink(fromName,fromId)}</div>
     <span class="fig-player-trade-arrow" aria-hidden="true">→</span>
     <div class="fig-player-trade-direction"><small>TRADED TO</small>${ownerLink(toName,toId)}</div>
    </div>
    <details class="fig-player-trade-details"><summary>SEE FULL TRADE PACKAGE <span aria-hidden="true">⌄</span></summary>
      <div class="fig-player-trade-packages">${packageRows||'<p>Transaction assets unavailable.</p>'}</div>
    </details>
   </article>`;
 }).join('');
 return section('TRADE HISTORY',
  `<div class="fig-player-trade-heading"><b>${timeline.length} ${timeline.length===1?'TRADE':'TRADES'} RECORDED</b><a href="#/trades">FULL TRADE ARCHIVE →</a></div>
    <div class="fig-player-trade-grid">${cards}</div>`,
  'Player movements and what every manager received in each trade');
}

async function player(id){
 await load(['playerCareers','playerSeasons','franchiseCareer','playerLog','tradeAssets','trades','tradeSides']);navActive('players');const c=DATA.playerCareers.find(x=>String(x.player_id)===String(id)&&x.scoring_view==='All-Time Combined');if(!c){app.innerHTML='<div class="empty">Player not found.</div>';return}const seasons=DATA.playerSeasons.filter(x=>String(x.player_id)===String(id)&&x.scoring_view==='All-Time Combined').sort((a,b)=>+b.season-+a.season),fr=DATA.franchiseCareer.filter(x=>String(x.player_id)===String(id)).sort((a,b)=>b.total_starter_points-a.total_starter_points),logs=DATA.playerLog.filter(x=>String(x.player_id)===String(id));
 const exactBombs=(rows)=>{const b={b5:0,b20:0,b30:0,b40:0,b50:0};rows.forEach(r=>{const p=num(r.starter_points);if(p>=0&&p<10)b.b5++;if(p>=20&&p<30)b.b20++;if(p>=30&&p<40)b.b30++;if(p>=40&&p<50)b.b40++;if(p>=50)b.b50++});return b};
 const careerBombs=exactBombs(logs);
 const tradeCount=playerTradeEntries(c.player_id,DATA.tradeAssets,DATA.trades,DATA.tradeSides).length;
 app.innerHTML=hero('PLAYER ARCHIVE',esc(c.full_name),`${c.position} • ${c.starts} official starts • ${c.fantasy_franchises} fantasy franchise${c.fantasy_franchises===1?'':'s'} • ${tradeCount} recorded trade${tradeCount===1?'':'s'}`,[{value:money(c.total_points),label:'CAREER POINTS'},{value:money(c.average_points),label:'PTS / START'},{value:money(c.highest_score),label:'BEST GAME'},{value:careerBombs.b30,label:'30 BOMBS'}]).replace('class="hero"','class="hero fig-player-profile-hero"').replace('</h1>',`</h1>${playerHeadshot(c.player_id,c.full_name,'fig-nfl-photo-large')}`);
 const frows=fr.map(x=>{const b=exactBombs(logs.filter(r=>+r.franchise_id===+x.franchise_id));return{team:ownerLink(x.owner_name,x.franchise_id),starts:x.starts,points:money(x.total_starter_points),pps:money(x.points_per_start),best:money(x.best_game),g5:b.b5,g20:b.b20,g30:b.b30,g40:b.b40,g50:b.b50,_sort:{team:displayOwnerName(x.owner_name,x.franchise_id),starts:x.starts,points:x.total_starter_points,pps:x.points_per_start,best:x.best_game,g5:b.b5,g20:b.b20,g30:b.b30,g40:b.b40,g50:b.b50}}});
 const srows=seasons.map(x=>({year:x.season,starts:x.starts,points:money(x.total_points),pps:money(x.average_points),best:money(x.highest_score),teams:x.fantasy_franchises,_sort:{year:x.season,starts:x.starts,points:x.total_points,pps:x.average_points,best:x.highest_score,teams:x.fantasy_franchises}}));
 const grows=logs.sort((a,b)=>+b.season-+a.season||+b.week-+a.week).map(x=>({year:x.season,week:x.week,type:x.game_type,team:ownerLink(x.owner_name,x.franchise_id),points:money(x.starter_points),_sort:{year:x.season,week:x.week,type:x.game_type,team:displayOwnerName(x.owner_name,x.franchise_id),points:x.starter_points}}));
 app.innerHTML+=playerTradeHistory(c.player_id)+section('FRANCHISE HISTORY',sortableTable([{label:'TEAM',key:'team'},{label:'STARTS',key:'starts'},{label:'POINTS',key:'points'},{label:'PTS/START',key:'pps'},{label:'BEST',key:'best'},{label:'5 BOMBS',key:'g5'},{label:'20 BOMBS',key:'g20'},{label:'30 BOMBS',key:'g30'},{label:'40 BOMBS',key:'g40'},{label:'50 BOMBS',key:'g50'}],frows))+section('SEASON HISTORY',sortableTable([{label:'YEAR',key:'year'},{label:'STARTS',key:'starts'},{label:'POINTS',key:'points'},{label:'PTS/START',key:'pps'},{label:'BEST',key:'best'},{label:'TEAMS',key:'teams'}],srows))+section('START-BY-START LOG',sortableTable([{label:'YEAR',key:'year'},{label:'WEEK',key:'week'},{label:'TYPE',key:'type'},{label:'TEAM',key:'team'},{label:'POINTS',key:'points'}],grows));
}

async function players(){
 await load(['playerLog']);navActive('players');
 let season='all',view='All-Time Combined',playerPos='ALL',playerQ='';
 const years=[...new Set(DATA.playerLog.map(x=>String(x.season)))].sort((a,b)=>+b-+a);
 const topPlayerWeeks=[...DATA.playerLog].sort((a,b)=>num(b.starter_points)-num(a.starter_points)).slice(0,5);
 app.innerHTML=hero('PLAYER ARCHIVE','PLAYER RECORDS','Every official starter performance in league history. Filter by season, position or game type, search anybody, and sort every column.')+`<a class="player-week-feature" href="#/playerweeks"><div><span>PLAYER RECORD</span><h3>HIGHEST SCORING PLAYER WEEKS</h3></div><div class="player-week-feature-list">${topPlayerWeeks.map((x,i)=>`<b>${playerHeadshot(x.player_id,x.player_name)}<span class="fig-feature-player-name">${i+1}. ${esc(x.player_name)}</span><span class="fig-feature-player-points">${money(x.starter_points)}</span></b>`).join('')}</div></a><section class="section"><div class="control-label">SEASON</div>${pills('playerSeason',[{value:'all',label:'ALL-TIME'},...years.map(y=>({value:y,label:y}))],season)}<div class="control-label spaced">SCORING VIEW</div>${pills('playerView',[{value:'All-Time Combined',label:'ALL GAMES'},{value:'Regular Season',label:'REGULAR SEASON'},{value:'Playoffs',label:'PLAYOFFS'}],view)}<div id="playerRecordBody" class="control-output"></div></section>`;
 const aggregate=()=>{
  let logs=DATA.playerLog.filter(x=>season==='all'||String(x.season)===String(season));
  if(view==='Regular Season')logs=logs.filter(x=>x.game_type==='Regular Season');
  else if(view==='Playoffs')logs=logs.filter(x=>x.game_type==='Postseason'||x.game_type==='Playoffs');
  const g={};
  logs.forEach(x=>{
   const id=String(x.player_id),p=num(x.starter_points);
   const z=g[id]??={player_id:id,full_name:x.player_name,position:x.position,starts:0,total_points:0,highest_score:-Infinity,b5:0,b20:0,b30:0,b40:0,b50:0};
   z.starts++;z.total_points+=p;z.highest_score=Math.max(z.highest_score,p);
   if(p>=0&&p<10)z.b5++;
   if(p>=20&&p<30)z.b20++;
   
   if(p>=30&&p<40)z.b30++;
   if(p>=40&&p<50)z.b40++;
   if(p>=50)z.b50++;
  });
  return Object.values(g).map(x=>({...x,average_points:x.starts?x.total_points/x.starts:0}));
 };
 const render=()=>{
  let pc=aggregate();
  pc=pc.filter(x=>playerBookMatchesPosition(x.position,playerPos));
  if(playerQ)pc=pc.filter(x=>String(x.full_name||'').toLowerCase().includes(playerQ));
  const posItems=[{value:'ALL',label:'ALL'},...['QB','RB','WR','TE','FLEX'].map(p=>({value:p,label:p}))];
  const bombDefs=[{key:'b5',label:'5 BOMBS'},{key:'b20',label:'20 BOMBS'},{key:'b30',label:'30 BOMBS'},{key:'b40',label:'40 BOMBS'},{key:'b50',label:'50 BOMBS'}];
  const thresholdCards=bombDefs.map(d=>{const top=[...pc].sort((a,b)=>num(b[d.key])-num(a[d.key])||num(b.total_points)-num(a.total_points)).slice(0,8);return `<div class="threshold-panel"><a class="threshold-title threshold-title-link" href="#/playerbombrank/${encodeURIComponent(d.label)}/${encodeURIComponent(season)}/${encodeURIComponent(view)}">${d.label}</a>${top.map((x,i)=>`<a href="#/playerbomb/${x.player_id}/${encodeURIComponent(d.label)}/${encodeURIComponent(season)}/${encodeURIComponent(view)}/all" class="threshold-row"><span class="fig-threshold-player">${playerHeadshot(x.player_id,x.full_name)}<span>${i+1}. ${esc(x.full_name)}</span></span><strong>${num(x[d.key])}</strong></a>`).join('')}</div>`}).join('');
  const sorted=[...pc].sort((a,b)=>num(b.total_points)-num(a.total_points));
  const bombCell=(x,label,key)=>`<a class="bomb-count-link" href="#/playerbomb/${x.player_id}/${encodeURIComponent(label)}/${encodeURIComponent(season)}/${encodeURIComponent(view)}/all">${num(x[key])}</a>`;
  const rows=sorted.map((x,i)=>({rank:i+1,player:`${playerLink(x.player_id,x.full_name)}`,pos:`<span class="pos">${x.position}</span>`,starts:x.starts,points:money(x.total_points),pps:money(x.average_points),b5:bombCell(x,'5 BOMBS','b5'),b20:bombCell(x,'20 BOMBS','b20'),b30:bombCell(x,'30 BOMBS','b30'),b40:bombCell(x,'40 BOMBS','b40'),b50:bombCell(x,'50 BOMBS','b50'),_sort:{rank:i+1,player:x.full_name,pos:x.position,starts:x.starts,points:x.total_points,pps:x.average_points,b5:x.b5,b20:x.b20,b30:x.b30,b40:x.b40,b50:x.b50}}));
  const bookTitle=season==='all'?'COMPLETE PLAYER RECORD BOOK':`${season} PLAYER RECORD BOOK`;
  $('#playerRecordBody').innerHTML=`<div class="threshold-grid">${thresholdCards}</div><section class="section player-book-section compact-player-book"><div class="section-head player-book-head"><h2 class="section-title">${bookTitle}</h2><div class="player-book-tools"><div>${pills('playerPos',posItems,playerPos)}</div><input id="playerRecordSearch" class="search player-record-search" placeholder="Search player…" value="${esc(playerQ)}"></div></div><div class="player-book-scroll-tip">Scroll horizontally to see all stats <span aria-hidden="true">→</span></div>${sortableTable([{label:'#',key:'rank'},{label:'PLAYER',key:'player'},{label:'POS',key:'pos'},{label:'STARTS',key:'starts'},{label:'POINTS',key:'points'},{label:'PTS/START',key:'pps'},{label:'5 BOMBS',key:'b5'},{label:'20 BOMBS',key:'b20'},{label:'30 BOMBS',key:'b30'},{label:'40 BOMBS',key:'b40'},{label:'50 BOMBS',key:'b50'}],rows)}</section>`;
  bindPills('playerPos',v=>{playerPos=v;render()});
  const q=$('#playerRecordSearch');if(q){q.oninput=e=>{playerQ=e.target.value.toLowerCase();render();setTimeout(()=>{const n=$('#playerRecordSearch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},0)}};
 };
 bindPills('playerSeason',v=>{season=v;render()});bindPills('playerView',v=>{view=v;render()});render();
}


async function playerBombLeaderboard(bombEnc,seasonEnc,viewEnc){
 await load(['playerLog','standingsCareer']);navActive('players');
 const bomb=decodeURIComponent(bombEnc||'');
 const season=decodeURIComponent(seasonEnc||'all');
 const view=decodeURIComponent(viewEnc||'All-Time Combined');
 let logs=(DATA.playerLog||[]).filter(x=>bombMatch(bomb,x.starter_points));
 if(season!=='all')logs=logs.filter(x=>String(x.season)===String(season));
 if(view==='Regular Season')logs=logs.filter(x=>x.game_type==='Regular Season');
 else if(view==='Playoffs')logs=logs.filter(x=>x.game_type==='Postseason'||x.game_type==='Playoffs'||x.game_type!=='Regular Season');
 const g={};
 logs.forEach(x=>{
  const id=String(x.player_id);
  const z=g[id]??={player_id:id,player_name:x.player_name,position:x.position,count:0,points:0};
  z.count++;z.points+=num(x.starter_points);
 });
 const ranked=Object.values(g).sort((a,b)=>b.count-a.count||b.points-a.points||String(a.player_name).localeCompare(String(b.player_name)));
 let prev=null,rank=0;
 const rows=ranked.map((x,i)=>{if(prev===null||x.count!==prev)rank=i+1;const tied=(ranked.filter(y=>y.count===x.count).length>1);prev=x.count;return {rank:`${tied?'T':''}${rank}`,player:`<a class="fig-player-person" href="#/playerbomb/${x.player_id}/${encodeURIComponent(bomb)}/${encodeURIComponent(season)}/${encodeURIComponent(view)}/all">${playerHeadshot(x.player_id,x.player_name)}<span class="fig-player-person-name">${esc(x.player_name)}</span></a>`,pos:`<span class="pos">${esc(x.position||'')}</span>`,count:x.count,points:money(x.points),_sort:{rank,player:x.player_name,pos:x.position||'',count:x.count,points:x.points},_href:`#/playerbomb/${x.player_id}/${encodeURIComponent(bomb)}/${encodeURIComponent(season)}/${encodeURIComponent(view)}/all`}});
 const subtitle=[season==='all'?'All seasons':season,view==='All-Time Combined'?'All games':view].join(' • ');
 app.innerHTML=`<section class="hero"><div class="eyebrow">PLAYER BOMB LEADERBOARD</div><h1>${esc(bomb)}</h1><p>${esc(subtitle)}</p></section>${section('FULL LEADERBOARD',sortableTable([{label:'#',key:'rank'},{label:'PLAYER',key:'player'},{label:'POS',key:'pos'},{label:'BOMBS',key:'count'},{label:'POINTS IN BOMBS',key:'points'}],rows))}`;
}

async function playerBombBreakdown(playerId,bombEnc,seasonEnc,viewEnc,franchiseEnc){
 await load(['playerLog','standingsCareer']);navActive('players');
 const bomb=decodeURIComponent(bombEnc||''),season=decodeURIComponent(seasonEnc||'all');
 const view=decodeURIComponent(viewEnc||'All-Time Combined'),franchise=decodeURIComponent(franchiseEnc||'all');
 let logs=(DATA.playerLog||[]).filter(x=>String(x.player_id)===String(playerId)&&bombMatch(bomb,x.starter_points));
 if(season!=='all')logs=logs.filter(x=>String(x.season)===String(season));
 if(view==='Regular Season')logs=logs.filter(x=>x.game_type==='Regular Season');
 else if(view==='Playoffs')logs=logs.filter(x=>x.game_type!=='Regular Season');
 if(franchise!=='all')logs=logs.filter(x=>+x.franchise_id===+franchise);
 logs.sort((a,b)=>num(b.season)-num(a.season)||num(b.week)-num(a.week)||num(b.starter_points)-num(a.starter_points));
 const playerName=logs[0]?.player_name||((DATA.playerLog||[]).find(x=>String(x.player_id)===String(playerId))?.player_name)||'Player';
 const context=[];if(season!=='all')context.push(season);if(view!=='All-Time Combined')context.push(view);
 if(franchise!=='all')context.push(displayOwnerName('',franchise));
 const cards=logs.map((x,i)=>`<article class="fig-bomb-entry">
   <span class="fig-bomb-rank" aria-label="Performance ${i+1} of ${logs.length}">${String(i+1).padStart(2,'0')}</span>
   <div class="fig-bomb-owner">${ownerAvatar(x.franchise_id,'fig-bomb-avatar')}<div>
    <b>${esc(displayOwnerName(x.owner_name,x.franchise_id))}</b>
    <span>${esc(x.season)} · WEEK ${esc(x.week)} · ${x.game_type==='Regular Season'?'REGULAR SEASON':'POSTSEASON'}</span>
   </div></div>
   <div class="fig-bomb-points"><strong>${money(x.starter_points)}</strong><small>POINTS · ${esc(x.position)}</small></div>
  </article>`).join('');
 app.innerHTML=hero('PLAYER BOMB BREAKDOWN',`${esc(playerName)} • ${esc(bomb)}`,`${context.length?context.join(' • ')+' • ':''}${logs.length} qualifying started performances.`)+
  section('EVERY BOMB',`<div class="fig-bomb-list">${cards||'<div class="empty">No qualifying performances.</div>'}</div>`,'Each number is the entry in this selected history, newest first.');
}

function h2hAllPlayPair(games,a,b) {
 // H2H-only all-play: regular-season comparisons plus playoff weeks
 // ONLY when both teams have a completed playoff matchup. Global all-play unchanged.
 const weeks=new Map();
 for(const g of games||[]){
  if(g.game_type!=='Regular Season'&&g.game_type!=='Playoffs')continue;
  const key=`${g.season}:${g.week}:${g.game_type}`;
  if(!weeks.has(key))weeks.set(key,{season:+g.season,week:+g.week,phase:g.game_type,teams:new Map()});
  const w=weeks.get(key);
  w.teams.set(+g.franchise_1,num(g.score_1));
  w.teams.set(+g.franchise_2,num(g.score_2));
 }
 return [...weeks.values()].filter(w=>w.teams.has(+a)&&w.teams.has(+b))
  .map(w=>{
   const as=w.teams.get(+a),bs=w.teams.get(+b);
   const diff=Math.round((as-bs)*100);
   return {season:w.season,week:w.week,phase:w.phase,a:as,b:bs,result:diff>0?'W':diff<0?'L':'T',margin:Math.abs(diff)/100};
  }).sort((x,y)=>y.season-x.season||y.week-x.week);
}

function h2hRecord(rows){
 const wins=rows.filter(x=>x.result==='W').length;
 const losses=rows.filter(x=>x.result==='L').length;
 const ties=rows.length-wins-losses;
 return {wins,losses,ties,games:rows.length,pct:rows.length?100*(wins+ties/2)/rows.length:0};
}

function h2hRecordText(r){return `${r.wins}–${r.losses}${r.ties?`–${r.ties}`:''}`;}

function h2hActualPair(games,a,b) {
 return (games||[]).filter(g=>(+g.franchise_1===+a&&+g.franchise_2===+b)||(+g.franchise_1===+b&&+g.franchise_2===+a))
  .map(g=>{
   const as=+g.franchise_1===+a?num(g.score_1):num(g.score_2);
   const bs=+g.franchise_1===+b?num(g.score_1):num(g.score_2);
   const diff=Math.round((as-bs)*100);
   return {game:g,season:+g.season,week:+g.week,a:as,b:bs,result:diff>0?'W':diff<0?'L':'T',margin:Math.abs(diff)/100};
  }).sort((x,y)=>y.season-x.season||y.week-x.week);
}

function h2hPortraitName(id,name){
 return `<span class="fig-h2h-person">${ownerAvatar(id,'fig-h2h-avatar')}<span>${esc(displayOwnerName(name,id))}</span></span>`;
}

async function h2h(){
 await load(['standingsCareer','h2h','games']);navActive('');
 const teams=[...(DATA.standingsCareer||[])].sort((a,b)=>+a.franchise_id-+b.franchise_id);
 const byId=new Map(teams.map(t=>[+t.franchise_id,t]));
 let selected=String(teams[0]?.franchise_id??'');
 const comparisons=new Map();
 const compare=(a,b)=>{
  const key=`${a}:${b}`;
  if(!comparisons.has(key)){
   const ap=h2hRecord(h2hAllPlayPair(DATA.games,a,b));
   comparisons.set(key,ap);
  }
  return comparisons.get(key);
 };
 const list=()=>{
  const records=(DATA.h2h||[]).filter(x=>+x.franchise_id===+selected).map(x=>{
   const a=+x.franchise_id,b=+x.opponent_franchise_id;
   return {...x,a,b,ap:compare(a,b),winRate:num(x.games)?100*(num(x.wins)+num(x.ties)/2)/num(x.games):0};
  });
  // Always show the selected team's strongest actual head-to-head rivalries first.
  return records.sort((a,b)=>b.winRate-a.winRate||num(b.wins)-num(a.wins)||num(b.games)-num(a.games)||a.b-b.b);
 };
 const render=()=>{
  const records=list();
  const cards=records.map(x=>{
   const actual={wins:num(x.wins),losses:num(x.losses),ties:num(x.ties)};
   return `<a class="fig-h2h-tile" href="#/matchup/${x.a}/${x.b}">
     <div class="fig-h2h-matchup">${h2hPortraitName(x.a,x.owner)}<span class="fig-h2h-vs">VS</span>${h2hPortraitName(x.b,x.opponent)}</div>
     <div class="fig-h2h-tile-stats">
       <div><span>ACTUAL HEAD-TO-HEAD</span><strong>${h2hRecordText(actual)}</strong><small>${num(x.games)} official matchups</small></div>
       <div><span>ALL-PLAY</span><strong>${h2hRecordText(x.ap)}</strong><small>${x.ap.games} shared weeks</small></div>
     </div>
     <div class="fig-h2h-view">VIEW RIVALRY HISTORY <span aria-hidden="true">→</span></div>
   </a>`;
  }).join('');
  $('#h2hResults').innerHTML=`<div class="fig-h2h-count">${records.length} rivalries for ${esc(displayOwnerName(byId.get(+selected)?.owner_name,+selected))} · highest head-to-head win % first</div><div class="fig-h2h-grid">${cards||'<div class="empty">No matchups found.</div>'}</div>`;
 };
 app.innerHTML=hero('LEAGUE HISTORY','HEAD-TO-HEAD','Actual matchups and the games you would have won against every other team.')+
  `<section class="section fig-h2h-page">
   <div class="fig-h2h-intro"><strong>TWO WAYS TO MEASURE A RIVALRY</strong><p><b>Head-to-head</b> counts scheduled regular-season and playoff games. <b>All-play</b> compares your completed scores every regular-season week, plus playoff weeks when both teams played, even if you faced different opponents.</p></div>
   <div class="control-label">CHOOSE A TEAM</div>
   ${pills('h2hTeamPills',teams.map(t=>({value:t.franchise_id,label:displayOwnerName(t.owner_name,t.franchise_id)})),selected)}
   <div id="h2hResults" class="fig-h2h-results"></div>
  </section>`;
 bindPills('h2hTeamPills',v=>{selected=v;render()});
 render();
}

async function matchupHistory(a,b){
 await load(['standingsCareer','h2h','games']);navActive('');
 a=+a;b=+b;
 const teams=DATA.standingsCareer||[];
 const ta=teams.find(x=>+x.franchise_id===a),tb=teams.find(x=>+x.franchise_id===b);
 if(!ta||!tb||a===b){app.innerHTML='<div class="empty">Matchup not found.</div>';return}
 const actual=h2hActualPair(DATA.games,a,b);
 const allplay=h2hAllPlayPair(DATA.games,a,b);
 const totals=h2hRecord(actual),ap=h2hRecord(allplay);
 const playoffWeeks=allplay.filter(x=>x.phase==='Playoffs').length;
 const nameA=displayOwnerName(ta.owner_name,a),nameB=displayOwnerName(tb.owner_name,b);
 const years=[...new Set([...actual,...allplay].map(x=>x.season))].sort((x,y)=>y-x);
 const summary=`<div class="fig-h2h-battle">
   <div>${h2hPortraitName(a,ta.owner_name)}</div>
   <span class="fig-h2h-versus">VS</span>
   <div>${h2hPortraitName(b,tb.owner_name)}</div>
  </div>
  <div class="fig-h2h-summary">
   <div><span>ACTUAL HEAD-TO-HEAD</span><strong>${h2hRecordText(totals)}</strong><small>${totals.games} completed matchups · ${pct(totals.pct)} win rate</small></div>
   <div><span>ALL-PLAY AGAINST ${esc(nameB.toUpperCase())}</span><strong>${h2hRecordText(ap)}</strong><small>${ap.games} shared weeks (${playoffWeeks} playoff) · ${pct(ap.pct)} win rate</small></div>
  </div>`;
 const seasons=years.map(year=>{
  const games=actual.filter(x=>x.season===year),weeks=allplay.filter(x=>x.season===year);
  const ar=h2hRecord(games),pr=h2hRecord(weeks);
  const playoffCount=weeks.filter(x=>x.phase==='Playoffs').length;
  const regularCount=weeks.length-playoffCount;
  return `<div class="fig-h2h-season">
   <div class="fig-h2h-season-title"><strong>${year}</strong><span>${regularCount} regular · ${playoffCount} playoff weeks</span></div>
   <div class="fig-h2h-season-stats">
    <div><span>ACTUAL H2H</span><strong>${h2hRecordText(ar)}</strong><small>${ar.games} matchups</small></div>
    <div><span>ALL-PLAY</span><strong>${h2hRecordText(pr)}</strong><small>${pct(pr.pct)} win rate</small></div>
   </div>
   <details class="fig-h2h-weeks"><summary>SEE ${year} WEEK-BY-WEEK COMPARISON <span aria-hidden="true">⌄</span></summary>
    ${playoffCount?'<p class="fig-h2h-week-note">PO = playoff week in which both teams played a completed game.</p>':''}
    <div class="fig-h2h-week-head"><span>WEEK</span><span>${esc(nameA.toUpperCase())}</span><span>${esc(nameB.toUpperCase())}</span><span>RESULT</span></div>
    ${weeks.sort((x,y)=>x.week-y.week).map(x=>`<div class="fig-h2h-week"><span class="fig-h2h-week-id">W${x.week}${x.phase==='Playoffs'?'<small class="fig-h2h-playoff-mark">PO</small>':''}</span><span>${money(x.a)}</span><span>${money(x.b)}</span><b class="fig-h2h-result fig-h2h-result-${x.result.toLowerCase()}">${x.result}</b></div>`).join('')}
   </details>
  </div>`;
 }).join('');
 const matches=actual.map(x=>{
  const g=x.game;
  return `<a class="fig-h2h-actual-game" href="#/game/${g.season}/${g.week}/${g.matchup_id}">
    <div class="fig-h2h-game-when"><strong>${g.season} · WEEK ${g.week}</strong><span>${esc(g.game_type)}</span></div>
    <div class="fig-h2h-game-score"><span class="${x.result==='W'?'fig-h2h-game-winner':''}">${money(x.a)}</span><small>–</small><span class="${x.result==='L'?'fig-h2h-game-winner':''}">${money(x.b)}</span><b class="fig-h2h-result fig-h2h-result-${x.result.toLowerCase()}">${x.result}</b></div>
    <div class="fig-h2h-game-view">VIEW LINEUPS →</div>
   </a>`;
 }).join('');
 app.innerHTML=hero('RIVALRY ARCHIVE',`${esc(nameA.toUpperCase())} VS ${esc(nameB.toUpperCase())}`,'Historical records from the first team’s perspective. All-play includes regular-season weeks and playoff weeks when both teams played.')+
  `<section class="section fig-h2h-detail"><a class="fig-h2h-back" href="#/h2h">← ALL HEAD-TO-HEAD RIVALRIES</a>${summary}</section>`+
  section('ALL-PLAY BY SEASON',`<div class="fig-h2h-seasons">${seasons}</div>`,'Compare shared regular-season weeks and playoff weeks when both teams played, even if they did not meet directly.')+
  section('ACTUAL MATCHUP HISTORY',`<div class="fig-h2h-game-legend"><b>${esc(nameA)}</b> score <span>—</span> <b>${esc(nameB)}</b> score</div><div class="fig-h2h-games">${matches||'<p>No official meetings yet.</p>'}</div>`,'Tap a game to view the archived lineups and scores.');
}


async function draft(){
 await load(['draftPicks']);navActive('draft');const years=[...new Set(DATA.draftPicks.map(x=>x.draft_season))].sort((a,b)=>b-a);let year=years[0];app.innerHTML=hero('WAR ROOM','THE DRAFT','Startup history and every official rookie pick. Click a year instead of digging through a dropdown.')+`<section class="section">${pills('draftYears',years.map(y=>({value:y,label:y})),year)}<div id="draftBody" class="control-output"></div></section>`;
 const render=()=>{const picks=DATA.draftPicks.filter(x=>String(x.draft_season)===String(year)).sort((a,b)=>a.pick_no-b.pick_no),rounds=[...new Set(picks.map(x=>x.round))];$('#draftBody').innerHTML=rounds.map(r=>`<div class="record-category"><h3>ROUND ${r}</h3><div class="draft-board">${picks.filter(x=>x.round===r).map(x=>`<a class="draft-pick clickable" href="#/team/${x.franchise_id}"><div class="pick">${x.pick_label}</div><div class="player fig-draft-player">${playerHeadshot(x.player_id,x.player_name)}<span>${esc(x.player_name)}</span></div><div class="owner">${ownerName(x.owner_name,x.franchise_id)}</div><div class="position">${x.position} • ${esc(x.draft_nfl_team||'')}</div></a>`).join('')}</div></div>`).join('')};bindPills('draftYears',v=>{year=v;render()});render();
}

async function trades(){
 await load(['trades','tradeSides']);navActive('trades');const years=[...new Set(DATA.trades.map(x=>x.season))].sort((a,b)=>b-a);let year='all',q='';app.innerHTML=hero('TRANSACTION ARCHIVE','TRADES','Every completed trade in league history. Years are one click away and each owner name links back to the franchise archive.')+`<section class="section">${pills('tradeYears',[{value:'all',label:'ALL YEARS'},...years.map(y=>({value:y,label:y}))],year)}<div class="toolbar spaced"><input id="tradeSearch" class="search" placeholder="Search owner or asset…"></div><div id="tradeBody"></div></section>`;
 const render=()=>{let ts=[...DATA.trades].sort((a,b)=>+b.season-+a.season||+b.week-+a.week);if(year!=='all')ts=ts.filter(x=>String(x.season)===String(year));ts=ts.filter(t=>{const sides=DATA.tradeSides.filter(s=>String(s.transaction_id)===String(t.transaction_id));return(`${t.owners_involved} ${sides.map(s=>s.assets_received+' '+s.assets_sent).join(' ')}`).toLowerCase().includes(q)});$('#tradeBody').innerHTML=`<div class="trade-list">${ts.map(t=>{const sides=DATA.tradeSides.filter(s=>String(s.transaction_id)===String(t.transaction_id));return `<div class="trade"><div class="trade-head"><span>${t.season} • WEEK ${t.week}</span><span>${t.franchises_involved}-TEAM • ${t.total_player_assets} PLAYERS • ${t.total_pick_assets} PICKS</span></div><div class="trade-sides">${sides.map(s=>`<div><div class="trade-owner">${ownerLink(s.owner_name,s.franchise_id)} RECEIVED</div><div class="asset-list">${parseMaybeJSON(s.assets_received).map(a=>`<span class="asset">${esc(a)}</span>`).join('')}</div><div class="trade-owner sent-label">SENT</div><div class="asset-list">${parseMaybeJSON(s.assets_sent).map(a=>`<span class="asset sent">${esc(a)}</span>`).join('')}</div></div>`).join('')}</div></div>`}).join('')}</div>`};bindPills('tradeYears',v=>{year=v;render()});$('#tradeSearch').oninput=e=>{q=e.target.value.toLowerCase();render()};render();
}
async function dynastyValues(){
 await load(['raValues','currentRoster','currentPicks','draftPicks','standingsCareer']);navActive('dynasty');
 const explanation=`<p class="ra-explain">${esc(raFormat())} · Updated ${esc(raDate())} · ${raCredit()}</p>`;
 if(!raReady()){
  app.innerHTML=hero('CURRENT DYNASTY MARKET','ROSTER VALUES','')+section('LEAGUE RANKINGS',`<div class="ra-pending"><strong>Waiting for first RosterAudit update</strong><p>The GitHub Actions job will retrieve live values and populate this leaderboard after deployment. No values are fabricated.</p>${raCredit()}</div>`);
  return;
 }
 const teams=(DATA.standingsCareer||[]).map(x=>({id:+x.franchise_id,name:displayOwnerName(x.owner_name,x.franchise_id),...raTeamData(x.franchise_id)}))
   .sort((a,b)=>b.knownTotal-a.knownTotal||a.id-b.id);
 const html=`<div class="ra-rank-list">${teams.map((t,i)=>`<a class="ra-rank-team" href="#/team/${t.id}"><span class="ra-rank">${i+1}</span>${ownerAvatar(t.id,'ra-rank-photo')}<span class="ra-rank-name">${esc(t.name)}<small>${t.playersMatched}/${t.roster.length} players · ${t.picksMatched}/${t.picks.length} picks valued</small></span><span class="ra-rank-score"><strong>${money(t.knownTotal)}</strong><small>${t.allValued?'Total valued assets':'Known assets only'}</small></span></a>`).join('')}</div>`;
 app.innerHTML=hero('CURRENT DYNASTY MARKET','ROSTER VALUES','')+section('LEAGUE RANKINGS',explanation+html+``);
}

async function minigames(){
 await load(['league','trades','tradeSides','tradeAssets','draftPicks','draftAudit','transactions','weeklyRosters','raValues']);
 navActive('minigames');
 const difference=jamesHaydenTradeArchive('gap');
 app.innerHTML=hero('LEAGUE ARCADE','MINIGAMES','')+
 `<section class="mini-arcade"><div class="mini-arcade-list"><a href="#/minigames/trade-gap" class="mini-arcade-card active" aria-current="page"><span class="mini-arcade-icon">GAP</span><span><strong>TRADE GAP CHALLENGE</strong><small>THE JAMES–HAYDEN LINEUP GAME</small></span><b>PLAYING</b></a><div class="mini-arcade-card future"><span class="mini-arcade-icon">+</span><span><strong>MORE GAMES</strong><small>COMING SOON</small></span></div></div>${renderTradeGapGame(difference)}</section>`;
}

async function more(){
 navActive('');
 const items=[
  ['◎','Teams','#/teams'],
  ['★','Team Records','#/records'],
  ['⚡','Streaks','#/streaks'],
  ['◌','Player Records','#/players'],
  ['↔','Head-to-Head','#/h2h'],
  ['▥','Dynasty Values','#/dynasty'],
  ['♛','Champions','#/champions'],
  ['▤','The Draft','#/draft'],
  ['⇄','Trades','#/trades'],
  ['▦','Game Archive','#/games']
 ];
 app.innerHTML=hero('LEAGUE ARCHIVE','MORE','Explore league history, live dynasty values and every completed game.')+
 section('EXPLORE',`<div class="team-grid fig-more-grid">${items.map(([icon,label,href])=>`<a class="team-card fig-more-item" href="${href}"><div class="avatar" aria-hidden="true">${icon}</div><div class="team-name">${label}</div><span class="fig-more-open" aria-hidden="true">OPEN →</span></a>`).join('')}</div>`);
}



async function teamSeason(teamId,year){
 await load(['games','teamSeasonMaster','standingsCareer','playerLog']);navActive('teams');
 const fid=+teamId,season=String(year);
 const team=(DATA.standingsCareer||[]).find(x=>+x.franchise_id===fid);
 const summary=(DATA.teamSeasonMaster||[]).find(x=>+x.franchise_id===fid&&String(x.season)===season);
 if(!team||!summary){app.innerHTML='<div class="empty">Season not found.</div>';return}
 const regular=(DATA.games||[]).filter(g=>g.game_type==='Regular Season'&&String(g.season)===season);
 const opponents=(DATA.standingsCareer||[]).filter(t=>+t.franchise_id!==fid).sort((a,b)=>+a.franchise_id-+b.franchise_id);
 // Team-season all-play follows the official regular-season-only data;
 // qualifying playoff weeks are an H2H-only exception.
 const matchups=opponents.map(t=>{
  const other=+t.franchise_id;
  const weeks=h2hAllPlayPair(regular,fid,other);
  const record=h2hRecord(weeks);
  return {other,name:displayOwnerName(t.owner_name,other),weeks,record};
 }).sort((a,b)=>b.record.pct-a.record.pct||b.record.wins-a.record.wins||a.other-b.other);
 const allplay=matchups.reduce((total,x)=>({wins:total.wins+x.record.wins,losses:total.losses+x.record.losses,ties:total.ties+x.record.ties}),{wins:0,losses:0,ties:0});
 const allplayTotal=allplay.wins+allplay.losses+allplay.ties;
 const allplayPct=allplayTotal?100*(allplay.wins+allplay.ties/2)/allplayTotal:0;
 const stats=[
  {label:'RECORD',value:`${summary.wins}–${summary.losses}${num(summary.ties)?'–'+summary.ties:''}`},
  {label:'WIN %',value:pct(summary.win_pct)},
  {label:'POINTS FOR',value:money(summary.points_for)},
  {label:'POINTS AGAINST',value:money(summary.points_against)},
  {label:'POINT DIFF',value:`${num(summary.point_differential)>0?'+':''}${money(summary.point_differential)}`},
  {label:'MAX PF',value:money(summary.max_pf)},
  {label:'AVG POINTS',value:money(summary.points_per_game)},
  {label:'ALL-PLAY',value:`${allplay.wins}–${allplay.losses}${allplay.ties?'–'+allplay.ties:''}`},
  {label:'ALL-PLAY WIN %',value:pct(allplayPct)},
  {label:'WEEKLY HIGHS',value:summary.weekly_high_scores??0},
  {label:'TOP-3 WEEKS',value:summary.weekly_top_3_finishes??0},
  {label:'REGULAR FINISH',value:summary.regular_season_finish?'#'+summary.regular_season_finish:'—'}
 ];
 const statsHtml=`<div class="fig-season-metrics">${stats.map(x=>`<div class="fig-season-metric"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div>`).join('')}</div>`;
 const pairCards=matchups.map(x=>{
  const r=x.record;
  const weekHtml=x.weeks.sort((a,b)=>a.week-b.week).map(w=>`<div class="fig-season-week"><span>W${w.week}</span><span>${money(w.a)}</span><span>${money(w.b)}</span><strong class="fig-season-outcome fig-season-${w.result.toLowerCase()}">${w.result}</strong></div>`).join('');
  return `<details class="fig-season-opponent">
    <summary>${ownerAvatar(x.other,'fig-season-opponent-avatar')}<span class="fig-season-opponent-name">${esc(x.name)}</span><strong>${h2hRecordText(r)}</strong><small>${pct(r.pct)}</small><span class="fig-season-chevron">⌄</span></summary>
    <div class="fig-season-opponent-detail"><p>${r.games} completed shared regular-season weeks. Scores from ${esc(displayOwnerName(team.owner_name,fid))} vs ${esc(x.name)}.</p>
    <div class="fig-season-week-head"><span>WEEK</span><span>US</span><span>THEM</span><span>W/L</span></div>
    ${weekHtml}
    <a class="fig-season-h2h-link" href="#/matchup/${fid}/${x.other}">VIEW CAREER RIVALRY →</a>
    </div>
  </details>`;
 }).join('');
 const games=(DATA.games||[]).filter(g=>String(g.season)===season&&(+g.franchise_1===fid||+g.franchise_2===fid)).sort((a,b)=>num(a.week)-num(b.week));
 const gameCards=games.map(g=>{
  const isFirst=+g.franchise_1===fid,opponent=isFirst?g.franchise_2:g.franchise_1,oppName=isFirst?g.owner_2:g.owner_1;
  const ours=isFirst?num(g.score_1):num(g.score_2),theirs=isFirst?num(g.score_2):num(g.score_1),result=ours>theirs?'W':ours<theirs?'L':'T';
  return `<a class="fig-season-game" href="#/game/${g.season}/${g.week}/${g.matchup_id}"><span class="fig-season-game-week">WEEK ${g.week}<small>${g.game_type==='Regular Season'?'REGULAR':'POSTSEASON'}</small></span>
   <span class="fig-season-game-opponent">${ownerAvatar(opponent,'fig-season-game-avatar')}<b>${esc(displayOwnerName(oppName,opponent))}</b></span>
   <span class="fig-season-game-final"><b class="fig-season-outcome fig-season-${result.toLowerCase()}">${result}</b><strong>${money(ours)} – ${money(theirs)}</strong></span>
   <span class="fig-season-game-arrow">→</span>
  </a>`;
 }).join('');
 const playerTotals=new Map();
 for(const log of DATA.playerLog||[]){
  if(+log.franchise_id!==fid||String(log.season)!==season)continue;
  const key=String(log.player_id),p=playerTotals.get(key)||{id:key,name:log.player_name,pos:log.position,starts:0,points:0};
  p.starts++;p.points+=num(log.starter_points);playerTotals.set(key,p);
 }
 const topPlayers=[...playerTotals.values()].sort((a,b)=>b.points-a.points).slice(0,5);
 const playerCards=topPlayers.map((p,i)=>`<a class="fig-season-player" href="#/player/${encodeURIComponent(p.id)}"><span class="fig-season-player-rank">${i+1}</span>${playerHeadshot(p.id,p.name)}<span class="fig-season-player-name"><b>${esc(p.name)}</b><small>${esc(p.pos)} · ${p.starts} STARTS</small></span><strong>${money(p.points)}<small>PTS</small></strong></a>`).join('');
 app.innerHTML=hero('TEAM SEASON',`${esc(displayOwnerName(team.owner_name,fid))} • ${esc(season)}`,`${summary.season_complete?'COMPLETED SEASON':'SEASON IN PROGRESS'} · #${summary.regular_season_finish||'—'} REGULAR-SEASON FINISH`)+
  `<div class="fig-season-back"><a href="#/team/${fid}">← BACK TO TEAM PROFILE</a></div>`+
  section('SEASON AT A GLANCE',statsHtml,'Official regular-season statistics. Playoffs appear in the game log below.')+
  section('ALL-PLAY VS EVERY TEAM',`<p class="fig-season-explainer">How this team scored against each opponent in the same completed regular-season weeks — even when they were not scheduled to face each other. Tap a team to inspect every comparison.</p><div class="fig-season-opponents">${pairCards}</div>`,'Regular season only · ranked by all-play win percentage')+
  section('SEASON SCORING LEADERS',`<div class="fig-season-players">${playerCards||'<div class="empty">No finished starts yet.</div>'}</div>`,'Official starting lineup points')+
  section('EVERY GAME',`<div class="fig-season-games">${gameCards||'<div class="empty">No completed games yet.</div>'}</div>`,'Regular season and playoff games · tap for full lineups');
}
async function gameDetail(season,week,matchup){
 await load(['allGames','weeklyRosters']);navActive('');
 const sameId=(a,b)=>{
  const an=Number(a),bn=Number(b);
  return Number.isFinite(an)&&Number.isFinite(bn)?an===bn:String(a??'').replace(/\\.0+$/,'')===String(b??'').replace(/\\.0+$/,'');
 };
 const g=(DATA.allGames||[]).find(x=>String(x.season)===String(season)&&String(x.week)===String(week)&&sameId(x.matchup_id,matchup));
 if(!g){app.innerHTML='<div class="empty">Game not found.</div>';return}
 const roster=id=>(DATA.weeklyRosters||[]).filter(x=>String(x.season)===String(season)&&String(x.week)===String(week)&&+x.franchise_id===+id);
 const starters=rows=>{
  const counts={},order={QB:1,RB:2,WR:3,TE:4,FLEX:5,SUPER_FLEX:6,K:7,DEF:8};
  return rows.filter(x=>x.starter_status==='Starter').sort((a,b)=>(order[a.lineup_slot]||99)-(order[b.lineup_slot]||99)||String(a.player_name).localeCompare(String(b.player_name)))
   .map(x=>{const slot=String(x.lineup_slot||x.position||'FLEX').toUpperCase();
    counts[slot]=(counts[slot]||0)+1;
    const label=slot==='RB'||slot==='WR'||slot==='TE'||slot==='FLEX'||slot==='QB'&&counts[slot]>1?slot+(counts[slot]):slot==='SUPER_FLEX'?'SFLX':slot;
    return {...x,_slot:label};
   });
 };
 const left=roster(g.franchise_1),right=roster(g.franchise_2),a=starters(left),b=starters(right);
 const bench=rows=>rows.filter(x=>x.starter_status!=='Starter'&&num(x.fantasy_points)>0).sort((a,b)=>num(b.fantasy_points)-num(a.fantasy_points)||String(a.position).localeCompare(String(b.position)));
 const benA=bench(left),benB=bench(right);
 const slotOrder=slot=>{
  const x=String(slot).replace(/\d+$/,'');
  const rank={QB:1,RB:2,WR:3,TE:4,FLEX:5,SFLX:6,K:7,DEF:8};
  return (rank[x]||99)*100+(Number(String(slot).match(/\d+$/)?.[0])||0);
 };
 const slots=[...new Set([...a,...b].map(x=>x._slot))].sort((x,y)=>slotOrder(x)-slotOrder(y)||x.localeCompare(y));
 const fmtPlayer=(x,side='left')=>{
  if(!x)return '<div class="fig-lineup-empty">—</div>';
  const pts=Number(x.fantasy_points||0);
  return `<a href="#/player/${encodeURIComponent(x.player_id)}" class="fig-lineup-player fig-lineup-${side}">
    ${playerHeadshot(x.player_id,x.player_name,'fig-lineup-headshot')}
    <span class="fig-lineup-player-info"><b>${esc(x.player_name||x.player_id)}</b><small>${esc(x.position||x.lineup_slot||'')}</small></span>
    <strong class="fig-lineup-points">${money(pts)}</strong>
   </a>`;
 };
 const lineups=slots.map(slot=>`<div class="fig-lineup-pair">
  ${fmtPlayer(a.find(x=>x._slot===slot),'left')}
  <span class="fig-lineup-slot">${esc(slot)}</span>
  ${fmtPlayer(b.find(x=>x._slot===slot),'right')}
 </div>`).join('');
 const benchColumn=(rows,id)=>`<div class="fig-lineup-bench-team">
  <div class="fig-lineup-bench-team-title">${ownerAvatar(id,'fig-lineup-bench-avatar')}<span>${esc(displayOwnerName('',id))} · ${rows.length}</span></div>
  ${rows.map(x=>`<div class="fig-lineup-bench-entry"><span class="fig-lineup-bench-slot">${esc(x.lineup_slot||'BN')}</span>${fmtPlayer(x)}</div>`).join('')||'<div class="fig-lineup-bench-empty">No bench players above 0 points</div>'}
 </div>`;
 const startA=a.reduce((sum,x)=>sum+num(x.fantasy_points),0),startB=b.reduce((sum,x)=>sum+num(x.fantasy_points),0);
 const margin=Math.abs(num(g.score_1)-num(g.score_2));
 const winner=num(g.score_1)===num(g.score_2)?'TIE':esc(displayOwnerName(g.winner_name,g.winner_franchise_id))+' WON BY '+money(margin);
 app.innerHTML=hero(`${esc(season)} · WEEK ${esc(week)}`,'MATCHUP LINEUPS',`${esc(g.game_type)} · FINAL · ${winner}`)+
  `<section class="section fig-lineup-page">
   <div class="fig-lineup-scoreboard">
     <a href="#/team/${g.franchise_1}" class="fig-lineup-team">${ownerAvatar(g.franchise_1,'fig-lineup-owner-avatar')}<span>${esc(displayOwnerName(g.owner_1,g.franchise_1))}</span><strong>${money(g.score_1)}</strong></a>
     <span class="fig-lineup-final">FINAL</span>
     <a href="#/team/${g.franchise_2}" class="fig-lineup-team">${ownerAvatar(g.franchise_2,'fig-lineup-owner-avatar')}<span>${esc(displayOwnerName(g.owner_2,g.franchise_2))}</span><strong>${money(g.score_2)}</strong></a>
   </div>
   <div class="fig-lineup-section-head"><h2>STARTING LINEUPS</h2><span>PLAYER vs PLAYER · BY SLOT</span></div>
   <div class="fig-lineup-summary"><div><b>${a.length} STARTERS</b><strong>${money(startA)} PTS</strong></div><span>VS</span><div><b>${b.length} STARTERS</b><strong>${money(startB)} PTS</strong></div></div>
   <p class="fig-lineup-guide">Starters are compared side by side in corresponding lineup slots. Only bench players who scored above 0 points appear below.</p>
   <div class="fig-lineup-comparison">
    <div class="fig-lineup-side-label"><span>${esc(displayOwnerName(g.owner_1,g.franchise_1))}</span><span>POSITION</span><span>${esc(displayOwnerName(g.owner_2,g.franchise_2))}</span></div>
    ${lineups||'<div class="fig-lineup-bench-empty">Starter details unavailable for this matchup.</div>'}
   </div>
   <div class="fig-lineup-section-head fig-lineup-bench-heading"><h2>BENCH SCORERS</h2><span>ONLY PLAYERS ABOVE 0 POINTS</span></div>
   <div class="fig-lineup-bench-grid">${benchColumn(benA,g.franchise_1)}${benchColumn(benB,g.franchise_2)}</div>
  </section>`;
}
async function singleSeasonRecords(categoryEnc){
 await load(['singleSeasonRecords','teamSeasonMaster','playerLog','standingsCareer']);navActive('records');
 const completeSeasons=new Set(DATA.teamSeasonMaster.filter(x=>x.season_complete===true||String(x.season_complete).toLowerCase()==='true').map(x=>String(x.season)));
 const all=DATA.singleSeasonRecords.filter(x=>!redundantScoreAverageRecord(x)&&!excludedSingleSeasonRecord(x)&&completeSeasons.has(String(x.season))&&num(x.value)!==0&&!['games_100'].includes(String(x.metric||''))&&!/100\+ point games/i.test(String(x.record_category||''))).concat(singleSeasonBombRows().filter(x=>num(x.value)!==0));
 const categories=[...new Set(all.map(x=>x.record_category))].sort();
 const selected=categoryEnc?decodeURIComponent(categoryEnc):null;
 if(selected){
   const data=all.filter(x=>x.record_category===selected).sort((a,b)=>num(b.value)-num(a.value)||num(b.season)-num(a.season));
   const valueCounts={};data.forEach(x=>valueCounts[String(x.value)]=(valueCounts[String(x.value)]||0)+1);let prevVal=null,compRank=0;const rows=data.map((x,i)=>{if(prevVal===null||!sameRecordValue(x.value,prevVal))compRank=i+1;prevVal=x.value;const tied=valueCounts[String(x.value)]>1;return{rank:tiedRankLabel(compRank,tied),team:ownerLink(x.owner_name,x.franchise_id),season:x.season,value:typeof x.value==='number'?money(x.value):esc(x.value),_href:`#/breakdown/season/${encodeURIComponent(selected)}/${x.franchise_id}/${x.season}`,_sort:{rank:compRank,team:displayOwnerName(x.owner_name,x.franchise_id),season:num(x.season),value:num(x.value)}}});
   app.innerHTML=hero('SINGLE-SEASON RECORD',esc(selected),'Every franchise-season ranked across league history.')+section('FULL HISTORY',sortableTable([{label:'#',key:'rank'},{label:'TEAM',key:'team'},{label:'SEASON',key:'season'},{label:'VALUE',key:'value'}],rows));
   return;
 }
 const cards=categories.map(cat=>{const rs=all.filter(x=>x.record_category===cat).sort((a,b)=>num(b.value)-num(a.value)||num(b.season)-num(a.season));const top=rs[0];const ties=rs.filter(x=>sameRecordValue(x.value,top.value));const sameSeason=ties.every(x=>String(x.season)===String(top.season));return `<a class="record-index-card" href="#/singleseasons/${encodeURIComponent(cat)}"><div class="record-index-label">${esc(cat)}</div><div class="record-index-value">${typeof top.value==='number'?money(top.value):esc(top.value)}</div><div class="record-index-holder">${sameSeason?`${ties.map(x=>ownerName(x.owner_name,x.franchise_id)).join(' / ')} • ${top.season}`:ties.map(x=>`${ownerName(x.owner_name,x.franchise_id)} • ${x.season}`).join(' / ')}</div></a>`}).join('');
 app.innerHTML=hero('SEASON RECORD BOOK','SINGLE-SEASON RECORDS','The best individual team seasons in league history, including all-play and Max PF.')+section('CATEGORIES',`<div class="record-index-grid">${cards}</div>`);
}

async function specialRecord(kind,viewEnc){
 await load(['games','standingsSeasons','standingsCareer']);navActive('records');
 const view=decodeURIComponent(viewEnc||'All-Time Combined');
 const viewGames=DATA.games.filter(g=>view==='All-Time Combined'?true:view==='Regular Season'?g.game_type==='Regular Season':view==='Playoffs'?g.game_type!=='Regular Season':true);
 const viewLabel=view==='All-Time Combined'?'ALL-TIME':view.toUpperCase();
 if(kind==='teamweeks'||kind==='teamweeks-low'){
  const rows=[];
  viewGames.forEach(g=>{
    rows.push({team:ownerLink(g.owner_1,g.franchise_1),score:money(g.score_1),season:g.season,week:g.week,type:g.game_type,_href:`#/game/${g.season}/${g.week}/${g.matchup_id}`,_sort:{team:displayOwnerName(g.owner_1,g.franchise_1),score:num(g.score_1),season:num(g.season),week:num(g.week),type:g.game_type}});
    rows.push({team:ownerLink(g.owner_2,g.franchise_2),score:money(g.score_2),season:g.season,week:g.week,type:g.game_type,_href:`#/game/${g.season}/${g.week}/${g.matchup_id}`,_sort:{team:displayOwnerName(g.owner_2,g.franchise_2),score:num(g.score_2),season:num(g.season),week:num(g.week),type:g.game_type}});
  });
  const low=kind==='teamweeks-low';
  rows.sort((a,b)=>low?a._sort.score-b._sort.score:b._sort.score-a._sort.score);
  const headers=[{label:'#',key:'rank'},{label:'TEAM',key:'team'},{label:'POINTS',key:'score'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},{label:'TYPE',key:'type'}];
  const makeRow=(x,i)=>({...x,rank:i+1,_sort:{...x._sort,rank:i+1}});
  app.innerHTML=hero('RECORD HISTORY',low?'LOWEST SCORING WEEKS':'HIGHEST SCORING WEEKS',`${viewLabel} • every qualifying team-week ranked ${low?'from lowest to highest':'from highest to lowest'}.`)+
   section('FULL HISTORY',pagedWeekHistory(headers,rows,makeRow,{label:'team weeks',initialDescending:!low,sortKey:'score'}));
  return;
 }
 if(kind==='seasons'){const data=DATA.standingsSeasons.filter(x=>x.season_complete===true||String(x.season_complete).toLowerCase()==='true').sort((a,b)=>num(b.points_for)-num(a.points_for));const rows=data.map((x,i)=>({rank:i+1,team:ownerLink(x.owner_name,x.franchise_id),points:money(x.points_for),season:x.season,w:x.wins,l:x.losses,avg:money(num(x.points_for)/Math.max(1,num(x.games))),_sort:{rank:i+1,team:displayOwnerName(x.owner_name,x.franchise_id),points:num(x.points_for),season:num(x.season),w:num(x.wins),l:num(x.losses),avg:num(x.points_for)/Math.max(1,num(x.games))}}));app.innerHTML=hero('SEASON RECORD','BEST SCORING SEASONS','Completed 14-game regular seasons ranked by points scored.')+section('FULL HISTORY',sortableTable([{label:'#',key:'rank'},{label:'TEAM',key:'team'},{label:'POINTS',key:'points'},{label:'SEASON',key:'season'},{label:'W',key:'w'},{label:'L',key:'l'},{label:'PPG',key:'avg'}],rows));return}
 const perf=[];viewGames.forEach(g=>{perf.push({season:String(g.season),week:num(g.week),id:+g.franchise_1,owner:g.owner_1,score:num(g.score_1)});perf.push({season:String(g.season),week:num(g.week),id:+g.franchise_2,owner:g.owner_2,score:num(g.score_2)})});const groups={};perf.forEach(x=>(groups[`${x.season}-${x.week}`]??=[]).push(x));const out={};DATA.standingsCareer.forEach(x=>out[+x.franchise_id]={id:+x.franchise_id,owner:x.owner_name,high:0,top3:0});Object.values(groups).forEach(rows=>{rows.sort((a,b)=>b.score-a.score);rows.forEach((x,i)=>{if(i===0&&out[x.id])out[x.id].high++;if(i<3&&out[x.id])out[x.id].top3++})});const metric=kind==='highscores'?'high':'top3',title=kind==='highscores'?'WEEKLY HIGH SCORES':'TOP-3 WEEKLY SCORES';const ranked=Object.values(out).sort((a,b)=>b[metric]-a[metric]);const counts={};ranked.forEach(x=>counts[String(x[metric])]=(counts[String(x[metric])]||0)+1);let prev=null,rank=0;const rows=ranked.map((x,i)=>{if(prev===null||x[metric]!==prev)rank=i+1;prev=x[metric];return{rank:tiedRankLabel(rank,counts[String(x[metric])]>1),team:ownerLink(x.owner,x.id),value:x[metric],_href:`#/breakdown/weekly/${encodeURIComponent(kind)}/${encodeURIComponent(view)}/${x.id}`,_sort:{rank,team:displayOwnerName(x.owner,x.id),value:x[metric]}}});app.innerHTML=hero('WEEKLY PERFORMANCE RECORD',title,`${viewLabel} • qualifying weeks only.`)+section('FULL HISTORY',sortableTable([{label:'#',key:'rank'},{label:'TEAM',key:'team'},{label:'COUNT',key:'value'}],rows));
}


function gamesForFranchise(fid,view='All-Time Combined',season=null){
 const out=[];
 (DATA.games||[]).forEach(g=>{
  if(season!==null&&String(g.season)!==String(season))return;
  if(view==='Regular Season'&&g.game_type!=='Regular Season')return;
  if(view==='Playoffs'&&g.game_type==='Regular Season')return;
  const is1=+g.franchise_1===+fid,is2=+g.franchise_2===+fid;if(!is1&&!is2)return;
  const pf=num(is1?g.score_1:g.score_2),pa=num(is1?g.score_2:g.score_1),oppId=+(is1?g.franchise_2:g.franchise_1),opp=is1?g.owner_2:g.owner_1;
  out.push({season:g.season,week:g.week,type:g.game_type,pf,pa,diff:pf-pa,result:pf>pa?'W':pf<pa?'L':'T',oppId,opp,matchup_id:g.matchup_id});
 });
 return out.sort((a,b)=>num(a.season)-num(b.season)||num(a.week)-num(b.week));
}
function bombMatch(label,score){const p=num(score);if(label==='5 BOMBS')return p>=0&&p<10;if(label==='20 BOMBS')return p>=20&&p<30;if(label==='30 BOMBS')return p>=30&&p<40;if(label==='40 BOMBS')return p>=40&&p<50;if(label==='50 BOMBS')return p>=50;return false}
function gameRowsTable(games){return games.map((g,i)=>({n:i+1,season:g.season,week:g.week,opp:ownerLink(g.opp,g.oppId),pf:money(g.pf),pa:money(g.pa),diff:`${g.diff>=0?'+':''}${money(g.diff)}`,result:g.result,type:g.type,open:`<a class="btn-lite" href="#/game/${g.season}/${g.week}/${g.matchup_id}">OPEN</a>`,_sort:{n:i+1,season:num(g.season),week:num(g.week),opp:displayOwnerName(g.opp,g.oppId),pf:g.pf,pa:g.pa,diff:g.diff,result:g.result,type:g.type}}))}
async function breakdown(kind,...parts){
 navActive('records');
 if(kind==='season'){
  await load(['singleSeasonRecords','teamSeasonMaster','playerLog','games','weeklyRanks','standingsCareer']);
  const category=decodeURIComponent(parts[0]||''),fid=+parts[1],season=parts[2];const owner=displayOwnerName('',fid);
  if(/^(5|20|30|40|50) BOMBS$/.test(category)){
   const logs=(DATA.playerLog||[]).filter(x=>+x.franchise_id===fid&&String(x.season)===String(season)&&x.game_type==='Regular Season'&&bombMatch(category,x.starter_points)).sort((a,b)=>num(a.week)-num(b.week)||num(b.starter_points)-num(a.starter_points));
   const rows=logs.map((x,i)=>({n:i+1,player:`${playerLink(x.player_id,x.player_name)}`,pos:`<span class="pos">${esc(x.position)}</span>`,week:x.week,points:money(x.starter_points),_sort:{n:i+1,player:x.player_name,pos:x.position,week:num(x.week),points:num(x.starter_points)}}));
   app.innerHTML=hero('RECORD BREAKDOWN',`${esc(owner)} • ${season} ${esc(category)}`,`${logs.length} qualifying starter performances make up this record.`)+section('EVERY QUALIFYING PERFORMANCE',sortableTable([{label:'#',key:'n'},{label:'PLAYER',key:'player'},{label:'POS',key:'pos'},{label:'WEEK',key:'week'},{label:'POINTS',key:'points'}],rows));return;
  }
  if(category==='Weekly High Scores'||category==='Weekly Top-3 Finishes'){
   const high=category==='Weekly High Scores';const wr=(DATA.weeklyRanks||[]).filter(x=>+x.franchise_id===fid&&String(x.season)===String(season)&&(high?(x.weekly_high_score===true||String(x.weekly_high_score).toLowerCase()==='true'):(x.weekly_top_3===true||String(x.weekly_top_3).toLowerCase()==='true'))).sort((a,b)=>num(a.week)-num(b.week));
   const rows=wr.map((x,i)=>({n:i+1,week:x.week,points:money(x.points_for),rank:`#${x.weekly_score_rank}`,_sort:{n:i+1,week:num(x.week),points:num(x.points_for),rank:num(x.weekly_score_rank)}}));
   app.innerHTML=hero('RECORD BREAKDOWN',`${esc(owner)} • ${season} ${esc(category)}`,`${wr.length} weeks make up this total.`)+section('QUALIFYING WEEKS',sortableTable([{label:'#',key:'n'},{label:'WEEK',key:'week'},{label:'POINTS',key:'points'},{label:'WEEKLY RANK',key:'rank'}],rows));return;
  }
  const games=gamesForFranchise(fid,'Regular Season',season);const seasonRow=(DATA.teamSeasonMaster||[]).find(x=>+x.franchise_id===fid&&String(x.season)===String(season));
  const metricRow=(DATA.singleSeasonRecords||[]).find(x=>x.record_category===category&&+x.franchise_id===fid&&String(x.season)===String(season));
  const summary=metricRow?`Official value: ${money(metricRow.value)}.`:'';
  app.innerHTML=hero('RECORD BREAKDOWN',`${esc(owner)} • ${season} ${esc(category)}`,`${summary} Weekly team results used to build the season are below.`)+section('SEASON GAME-BY-GAME',sortableTable([{label:'#',key:'n'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},{label:'OPPONENT',key:'opp'},{label:'PF',key:'pf'},{label:'PA',key:'pa'},{label:'DIFF',key:'diff'},{label:'RESULT',key:'result'},{label:'',key:'open'}],gameRowsTable(games)));
  if(category==='Max PF'&&seasonRow){app.innerHTML+=section('MAX PF NOTE',`<div class="empty">Sleeper stores the official season Max PF as <strong>${money(seasonRow.max_pf)}</strong>. The weekly game log above gives the season context; the site does not invent per-week potential-points splits that Sleeper did not preserve in this archive.</div>`)}
  return;
 }
 if(kind==='streak'){
  await load(['games','standingsCareer','websiteStreaks']);const type=decodeURIComponent(parts[0]||''),mode=decodeURIComponent(parts[1]||'Career Games'),fid=+parts[2],ss=+parts[3],sw=+parts[4],es=+parts[5],ew=+parts[6];const owner=displayOwnerName('',fid);
  const entry=(DATA.websiteStreaks||[]).find(s=>+s.franchise_id===fid&&s.streak_type===type&&s.streak_mode===mode&&+s.start_season===ss&&+s.start_week===sw&&+s.end_season===es&&+s.end_week===ew);
  const isActive=entry&&(entry.active===true||String(entry.active).toLowerCase()==='true');
  const all=gamesForFranchise(fid,mode==='Regular Season'?'Regular Season':mode==='Playoffs'?'Playoffs':'All-Time Combined').filter(g=>{const k=num(g.season)*100+num(g.week);return k>=ss*100+sw&&k<=es*100+ew}).sort((a,b)=>num(a.season)-num(b.season)||num(a.week)-num(b.week));
  const gameCards=all.map((g,i)=>`<a class="fig-streak-game" href="#/game/${g.season}/${g.week}/${g.matchup_id}">
    <span class="fig-streak-game-index">#${i+1}</span>
    <div class="fig-streak-game-when"><b>${g.season} · WEEK ${g.week}</b><small>${g.type==='Regular Season'?'REGULAR SEASON':'POSTSEASON'}</small></div>
    <div class="fig-streak-game-opponent">${ownerAvatar(g.oppId,'fig-streak-game-avatar')}<span>VS <b>${esc(displayOwnerName(g.opp,g.oppId))}</b></span></div>
    <div class="fig-streak-game-result"><b>${money(g.pf)} – ${money(g.pa)}</b><span class="fig-season-outcome fig-season-${g.result.toLowerCase()}">${g.result}</span></div>
    <span class="fig-streak-game-open">VIEW LINEUPS →</span>
   </a>`).join('');
  app.innerHTML=hero(isActive?'ACTIVE STREAK':'STREAK BREAKDOWN',`${esc(owner)} • ${esc(type)}`,`${esc(mode)} • ${ss} W${sw} through ${es} W${ew} • ${all.length} qualifying completed games.`)+
   section('EVERY GAME IN THE STREAK',`<div class="fig-streak-games">${gameCards||'<div class="empty">No qualifying games found.</div>'}</div>`,'In playing order · select any matchup to see its starting lineups and bench.');return;
 }
 if(kind==='teamrecord'){
  await load(['records','playerLog','games','standingsCareer']);const category=decodeURIComponent(parts[0]||''),view=decodeURIComponent(parts[1]||'All-Time Combined'),fid=+parts[2],owner=displayOwnerName('',fid);
  if(/^(5|20|30|40|50) BOMBS$/.test(category)){
   const logs=(DATA.playerLog||[]).filter(x=>+x.franchise_id===fid&&(view==='All-Time Combined'||(view==='Regular Season'&&x.game_type==='Regular Season')||(view==='Playoffs'&&x.game_type!=='Regular Season'))&&bombMatch(category,x.starter_points)).sort((a,b)=>num(a.season)-num(b.season)||num(a.week)-num(b.week)||num(b.starter_points)-num(a.starter_points));
   const rows=logs.map((x,i)=>({n:i+1,player:`${playerLink(x.player_id,x.player_name)}`,pos:`<span class="pos">${esc(x.position)}</span>`,season:x.season,week:x.week,points:money(x.starter_points),type:x.game_type,_sort:{n:i+1,player:x.player_name,pos:x.position,season:num(x.season),week:num(x.week),points:num(x.starter_points),type:x.game_type}}));
   app.innerHTML=hero('RECORD BREAKDOWN',`${esc(owner)} • ${esc(category)}`,`${esc(view)} • ${logs.length} qualifying player performances.`)+section('EVERY QUALIFYING PERFORMANCE',sortableTable([{label:'#',key:'n'},{label:'PLAYER',key:'player'},{label:'POS',key:'pos'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},{label:'POINTS',key:'points'},{label:'TYPE',key:'type'}],rows));return;
  }
  if(category==='Total All-Play Wins'){
   const weeks=new Map();
   // All-Play is defined on completed regular-season team scores only.
   (DATA.games||[]).filter(g=>g.game_type==='Regular Season').forEach(g=>{
    const key=`${g.season}-${g.week}`;
    if(!weeks.has(key))weeks.set(key,[]);
    const scores=weeks.get(key);
    scores.push({franchise_id:+g.franchise_1,score:num(g.score_1),season:g.season,week:+g.week});
    scores.push({franchise_id:+g.franchise_2,score:num(g.score_2),season:g.season,week:+g.week});
   });
   const weekly=[];
   for(const scores of weeks.values()){
    const team=scores.find(x=>x.franchise_id===fid);
    if(!team)continue;
    const others=scores.filter(x=>x.franchise_id!==fid);
    weekly.push({season:team.season,week:team.week,points:team.score,
     wins:others.filter(x=>team.score>x.score).length,
     losses:others.filter(x=>team.score<x.score).length,
     ties:others.filter(x=>team.score===x.score).length});
   }
   weekly.sort((a,b)=>num(a.season)-num(b.season)||a.week-b.week);
   const total=weekly.reduce((sum,w)=>sum+w.wins,0);
   const rows=weekly.map((w,i)=>({n:i+1,season:w.season,week:w.week,points:money(w.points),wins:w.wins,losses:w.losses,ties:w.ties,
    _sort:{n:i+1,season:num(w.season),week:w.week,points:w.points,wins:w.wins,losses:w.losses,ties:w.ties}}));
   app.innerHTML=hero('RECORD BREAKDOWN',`${esc(owner)} • TOTAL ALL-PLAY WINS`,`${money(total)} total regular-season All-Play wins.`)
    +section(`WEEK-BY-WEEK ALL-PLAY · ${money(total)} WINS`,sortableTable([
      {label:'#',key:'n'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},
      {label:'POINTS',key:'points'},{label:'WINS',key:'wins'},
      {label:'LOSSES',key:'losses'},{label:'TIES',key:'ties'}],rows));
   return;
  }
  let games=gamesForFranchise(fid,view);
  // Record breakdowns should show only the games that actually make up
  // count-based records, not the franchise's entire history.
  const thresholdMatch=category.match(/(?:Career\s+)?(\d+)\+ Point Games/i);
  if(thresholdMatch){
   const threshold=+thresholdMatch[1];
   games=games.filter(g=>num(g.pf)>=threshold);
  }else if(/(?:Career\s+)?Wins$/i.test(category)){
   games=games.filter(g=>String(g.result).toUpperCase()==='W');
  }else if(/(?:Career\s+)?Losses$/i.test(category)){
   games=games.filter(g=>String(g.result).toUpperCase()==='L');
  }
  const countBased=!!thresholdMatch||/(?:Career\s+)?Wins$/i.test(category)||/(?:Career\s+)?Losses$/i.test(category);
  const subtitle=countBased?`${esc(view)} • ${games.length} qualifying games make up this record.`:`${esc(view)} • game-by-game source history.`;
  app.innerHTML=hero('RECORD BREAKDOWN',`${esc(owner)} • ${esc(category)}`,subtitle)+section(countBased?'EVERY QUALIFYING GAME':'SOURCE GAME HISTORY',sortableTable([{label:'#',key:'n'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},{label:'OPPONENT',key:'opp'},{label:'PF',key:'pf'},{label:'PA',key:'pa'},{label:'DIFF',key:'diff'},{label:'RESULT',key:'result'},{label:'TYPE',key:'type'},{label:'',key:'open'}],gameRowsTable(games)));return;
 }
 if(kind==='weekly'){
  await load(['weeklyRanks','standingsCareer']);const metric=decodeURIComponent(parts[0]||''),view=decodeURIComponent(parts[1]||'All-Time Combined'),fid=+parts[2],owner=displayOwnerName('',fid);const isHigh=metric==='highscores';let rows=(DATA.weeklyRanks||[]).filter(x=>+x.franchise_id===fid&&(view==='All-Time Combined'||view==='Regular Season'));if(view==='Playoffs')rows=[];rows=rows.filter(x=>isHigh?(x.weekly_high_score===true||String(x.weekly_high_score).toLowerCase()==='true'):(x.weekly_top_3===true||String(x.weekly_top_3).toLowerCase()==='true')).sort((a,b)=>num(a.season)-num(b.season)||num(a.week)-num(b.week));const out=rows.map((x,i)=>({n:i+1,season:x.season,week:x.week,points:money(x.points_for),rank:`#${x.weekly_score_rank}`,_sort:{n:i+1,season:num(x.season),week:num(x.week),points:num(x.points_for),rank:num(x.weekly_score_rank)}}));app.innerHTML=hero('RECORD BREAKDOWN',`${esc(owner)} • ${isHigh?'WEEKLY HIGH SCORES':'TOP-3 WEEKLY SCORES'}`,`${esc(view)} • every week counted in the total.`)+section('QUALIFYING WEEKS',sortableTable([{label:'#',key:'n'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},{label:'POINTS',key:'points'},{label:'WEEKLY RANK',key:'rank'}],out));return;
 }
}

async function playerWeeks(){
 await load(['playerLog']);navActive('players');
 const data=[...(DATA.playerLog||[])].sort((a,b)=>num(b.starter_points)-num(a.starter_points));
 const headers=[{label:'#',key:'rank'},{label:'PLAYER',key:'player'},{label:'POS',key:'pos'},{label:'POINTS',key:'points'},{label:'TEAM',key:'team'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},{label:'TYPE',key:'type'}];
 const makeRow=(x,i)=>({
  rank: i+1,
  player:playerLink(x.player_id,x.player_name),
  pos:`<span class="pos">${esc(x.position)}</span>`,
  points:money(x.starter_points),
  team:`<a class="fig-playerweeks-team-photo" href="#/team/${+x.franchise_id}" aria-label="Open ${esc(displayOwnerName(x.owner_name,x.franchise_id))} team profile" title="${esc(displayOwnerName(x.owner_name,x.franchise_id))}">${ownerAvatar(x.franchise_id,'fig-playerweeks-avatar')}</a>`,
  season:x.season,week:x.week,type:x.game_type,
  _sort:{rank:i+1,player:x.player_name,pos:x.position,points:num(x.starter_points),team:displayOwnerName(x.owner_name,x.franchise_id),season:num(x.season),week:num(x.week),type:x.game_type}
 });
 app.innerHTML=hero('PLAYER RECORD','HIGHEST SCORING PLAYER WEEKS','Every official starter performance ranked by points.')+
  section('FULL HISTORY',pagedWeekHistory(headers,data,makeRow,{label:'player weeks'}));
}

async function rivalryDetail(a,b){
 await load(['standingsCareer','h2h','games']);navActive('h2h');
 if(a==='james'){const james=DATA.standingsCareer.find(x=>+x.franchise_id===10);const rows=DATA.h2h.filter(x=>+x.franchise_id===10).sort((x,y)=>num(y.games)-num(x.games)).map(x=>({opp:ownerLink(x.opponent,x.opponent_franchise_id),g:x.games,w:x.wins,l:x.losses,pct:pct(x.win_pct),diff:`${num(x.point_differential)>=0?'+':''}${money(x.point_differential)}`,_sort:{opp:displayOwnerName(x.opponent,x.opponent_franchise_id),g:x.games,w:x.wins,l:x.losses,pct:x.win_pct,diff:x.point_differential}}));app.innerHTML=hero('SPECIAL RIVALRY',`${ownerName(james.owner_name,10)} VS EVERYBODY`,'Every James matchup is personal.')+section('THE LEAGUE',sortableTable([{label:'OPPONENT',key:'opp'},{label:'G',key:'g'},{label:'W',key:'w'},{label:'L',key:'l'},{label:'WIN %',key:'pct'},{label:'DIFF',key:'diff'}],rows));return}
 a=+a;b=+b;const r=DATA.h2h.find(x=>+x.franchise_id===a&&+x.opponent_franchise_id===b),ta=DATA.standingsCareer.find(x=>+x.franchise_id===a),tb=DATA.standingsCareer.find(x=>+x.franchise_id===b);const games=DATA.games.filter(g=>(+g.franchise_1===a&&+g.franchise_2===b)||(+g.franchise_1===b&&+g.franchise_2===a)).sort((x,y)=>+y.season-+x.season||+y.week-+x.week);const rows=games.map(g=>({open:`<a class="btn-lite" href="#/game/${g.season}/${g.week}/${g.matchup_id}">OPEN</a>`,season:g.season,week:g.week,a:+g.franchise_1===a?money(g.score_1):money(g.score_2),b:+g.franchise_1===b?money(g.score_1):money(g.score_2),winner:ownerLink(g.winner_name,g.winner_franchise_id),margin:money(g.margin),_sort:{season:num(g.season),week:num(g.week),a:+g.franchise_1===a?num(g.score_1):num(g.score_2),b:+g.franchise_1===b?num(g.score_1):num(g.score_2),winner:displayOwnerName(g.winner_name,g.winner_franchise_id),margin:num(g.margin)}}));app.innerHTML=hero('RIVALRY HISTORY',`${ownerName(ta.owner_name,a)} VS ${ownerName(tb.owner_name,b)}`,r?`${r.wins}-${r.losses} series • ${money(r.point_differential)} point differential`:'Series history')+section('EVERY MEETING',sortableTable([{label:'',key:'open'},{label:'SEASON',key:'season'},{label:'WEEK',key:'week'},{label:displayOwnerName(ta.owner_name,a).toUpperCase(),key:'a'},{label:displayOwnerName(tb.owner_name,b).toUpperCase(),key:'b'},{label:'WINNER',key:'winner'},{label:'MARGIN',key:'margin'}],rows));
}

/* Current-week matchup route. The separate live-matchups module owns polling
   and lineup rendering; this shell must exist before it receives its event. */
async function liveMatchPage(weekArg, matchupArg) {
 navActive('home');
 const week=Number(weekArg);
 const matchup=String(matchupArg||'');
 if(!Number.isInteger(week)||week<1||week>18||!/^(?:[0-9]+|solo-[0-9]+)$/.test(matchup)){
  app.innerHTML=hero('LIVE MATCHUP','MATCHUP UNAVAILABLE')+
   section('LIVE LINEUPS','<div class="fig-live-empty">Invalid matchup link. <a href="#/home">Back to live scores →</a></div>');
  return;
 }
 app.innerHTML=hero('LIVE MATCHUP','WEEK '+week+' LINEUPS')+
  '<div class="toolbar"><a href="#/home" class="pill">← LIVE SCOREBOARD</a></div>'+
  section('STARTERS & BENCH',
   '<div id="figLiveDetailStatus" role="status" aria-live="polite">Connecting to Sleeper…</div>'+
   '<div id="figLiveDetail" data-week="'+week+'" data-matchup="'+esc(matchup)+'">'+
   '<div class="fig-live-empty">Loading current matchups and player lineups…</div></div>');
 // Give the independently loaded live module a chance to attach its listener.
 setTimeout(()=>window.dispatchEvent(new Event('fig:live-route')),0);
}

async function route(){window.scrollTo(0,0);const tn=$('#topNav');if(tn)tn.classList.remove('open');const parts=(location.hash.replace(/^#\//,'')||'home').split('/');try{if(parts[0]==='home')await home();else if(parts[0]==='standings'){location.hash='#/home';return;}else if(parts[0]==='champions')await champions();else if(parts[0]==='playoffbracket')await playoffBracket(parts[1]);else if(parts[0]==='teams')await teams();else if(parts[0]==='dynasty')await dynastyValues();else if(parts[0]==='minigames')await minigames();else if(parts[0]==='team')await team(parts[1]);else if(parts[0]==='teamseason')await teamSeason(parts[1],parts[2]);else if(parts[0]==='livematch')await liveMatchPage(parts[1],parts[2]);else if(parts[0]==='game')await gameDetail(parts[1],parts[2],parts[3]);else if(parts[0]==='teamseason')await teamSeason(parts[1],parts[2]);else if(parts[0]==='game')await gameDetail(parts[1],parts[2],parts[3]);else if(parts[0]==='records')await records();else if(parts[0]==='record')await recordDetail(parts[1],parts[2],parts[3]);else if(parts[0]==='special')await specialRecord(parts[1],parts[2]);else if(parts[0]==='singleseasons')await singleSeasonRecords(parts[1]);else if(parts[0]==='breakdown')await breakdown(parts[1],...parts.slice(2));else if(parts[0]==='playerweeks')await playerWeeks();else if(parts[0]==='streaks')await streaks();else if(parts[0]==='streak')await streakDetail(parts[1],parts[2]);else if(parts[0]==='players')await players();else if(parts[0]==='playerbombrank')await playerBombLeaderboard(parts[1],parts[2],parts[3]);else if(parts[0]==='playerbomb')await playerBombBreakdown(parts[1],parts[2],parts[3],parts[4],parts[5]);else if(parts[0]==='player')await player(parts[1]);else if(parts[0]==='h2h')await h2h();else if(parts[0]==='matchup')await matchupHistory(parts[1],parts[2]);else if(parts[0]==='rivalry')await home();else if(parts[0]==='games')await gamesArchive();else if(parts[0]==='draft')await draft();else if(parts[0]==='trades')await trades();else if(parts[0]==='more')await more();else await home()}catch(e){console.error(e);app.innerHTML=`<div class="empty"><strong>Could not load this page.</strong><br><br>${esc(e.message)}</div>`}}
// Check the published snapshot, not Sleeper itself. One tiny request per visible
// browser tab every five minutes; the server-side build owns official records.
// Inactive tabs do not poll. A changed snapshot is applied without a hard reload.
let publishedSnapshot=null,checkingSnapshot=false;
async function checkPublishedSnapshot(){
 if(document.hidden||checkingSnapshot)return;
 checkingSnapshot=true;
 try{
  const response=await fetch('data/refresh_manifest.json',{cache:'no-store'});
  if(!response.ok)return; // Backwards-compatible with an older deployment.
  const manifest=await response.json();
  const revision=String(manifest.updated_at||'');
  if(!revision)return;
  if(publishedSnapshot===null){publishedSnapshot=revision;return;}
  if(revision!==publishedSnapshot){
   publishedSnapshot=revision;
   Object.keys(DATA).forEach(key=>delete DATA[key]);
   await route();
  }
 }catch(error){console.warn('Unable to check published league snapshot:',error)}
 finally{checkingSnapshot=false}
}
setInterval(checkPublishedSnapshot,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkPublishedSnapshot()});
checkPublishedSnapshot();

const mb=$('#menuButton');if(mb)mb.onclick=()=>{const tn=$('#topNav');if(tn)tn.classList.toggle('open')};window.addEventListener('hashchange',route);route();
