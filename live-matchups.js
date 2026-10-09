/* Read-only 30-second Sleeper scoreboard. Never modifies archived JSON or records. */
(() => {
  'use strict';
  const API = 'https://api.sleeper.app/v1/league/';
  const NAMES = {1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
  const PORTRAITS = {1:'boek',2:'fru',3:'fromm',4:'sack',5:'leyton',6:'hayden',7:'line',8:'winston',9:'camnol',10:'james'};
  const clean = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const photo = roster => PORTRAITS[roster] ? '<img class="fig-team-avatar" src="assets/avatars/' + PORTRAITS[roster] + '.webp" alt="" loading="lazy">' : '';
  const teamLabel = roster => photo(roster) + '<span>' + clean(NAMES[roster] || 'Roster ' + roster) + '</span>';
  const POLL_MS = 30 * 1000;
  const META_MS = 5 * 60 * 1000;
  let leagueMeta = null, metaLeague = '', metaAt = 0;
  let lastPoll = 0, retryAfter = 0, busy = false;

  function activeBoard() {
    const route = (location.hash.startsWith('#/') ? location.hash.slice(2) : 'home').split('/')[0] || 'home';
    return !document.hidden && route === 'home' ? document.getElementById('figLiveBoard') : null;
  }
  function score(row) {
    const raw = row.custom_points == null ? row.points : row.custom_points;
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  function gameCards(rows) {
    const groups = new Map();
    for (const row of rows) {
      const roster = Number(row.roster_id);
      if (!Number.isInteger(roster) || roster < 1) continue;
      // Null matchup IDs do not imply that unrelated teams are opponents.
      const matchId = row.matchup_id == null ? 'solo-' + roster : String(row.matchup_id);
      if (!groups.has(matchId)) groups.set(matchId, []);
      groups.get(matchId).push(row);
    }
    const entries = [...groups.entries()].sort((a,b) => {
      const aId = Number(a[0]), bId = Number(b[0]);
      if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
      return a[0].localeCompare(b[0]);
    });
    return entries.map(([id,group]) => {
      group.sort((a,b) => Number(a.roster_id) - Number(b.roster_id));
      const pair = group.length === 2;
      const high = pair ? Math.max(...group.map(score).filter(x => x !== null)) : null;
      const sides = group.map(row => {
        const roster = Number(row.roster_id);
        const name = NAMES[roster] || 'Roster ' + roster;
        const label = NAMES[roster] ? '<a class="fig-team-identity" href="#/team/' + roster + '">' + teamLabel(roster) + '</a>' : '<span class="fig-team-identity fig-live-name">' + teamLabel(roster) + '</span>';
        const value = score(row);
        const lead = pair && value !== null && value === high && group.filter(other => score(other) === high).length === 1;
        return '<div class="fig-live-side' + (lead ? ' fig-live-leading' : '') + '">' + label +
          '<span class="fig-live-score">' + (value == null ? '—' : value.toFixed(2)) + '</span></div>';
      }).join('');
      return '<article class="fig-live-match"><div class="fig-live-match-label">' +
        (pair ? 'MATCHUP ' + String(id).replace(/[^0-9]/g,'') : 'UNPAIRED ROSTER') + '</div>' +
        sides + '<a class="fig-live-open" href="#/livematch/' + Number(leagueMeta.settings.leg) + '/' + encodeURIComponent(id) + '">VIEW LINEUPS →</a></article>';
    }).join('');
  }
  async function refresh(force = false) {
    const board = activeBoard();
    if (!board || busy) return;
    const now = Date.now();
    if (now < retryAfter || (!force && now - lastPoll < POLL_MS - 1000)) return;
    const leagueId = board.dataset.leagueId || '';
    if (leagueId.length < 10 || leagueId.length > 22 || [...leagueId].some(c => c < '0' || c > '9')) return;
    busy = true;
    lastPoll = now;
    const status = document.getElementById('figLiveStatus');
    try {
      if (metaLeague !== leagueId || !leagueMeta || now - metaAt >= META_MS) {
        const result = await fetch(API + leagueId, {cache:'no-store'});
        if (!result.ok) throw new Error('Sleeper league HTTP ' + result.status);
        leagueMeta = await result.json();
        metaLeague = leagueId;
        metaAt = Date.now();
      }
      const week = Number(leagueMeta && leagueMeta.settings && leagueMeta.settings.leg);
      if (document.getElementById('figLiveBoard') !== board) return;
      if (leagueMeta.status !== 'in_season' || !Number.isInteger(week) || week < 1 || week > 18) {
        board.innerHTML = '<div class="fig-live-empty">No current-week matchups while the league is out of season.</div>';
        if (status) status.textContent = 'Sleeper season status: ' + (leagueMeta.status || 'unknown');
        return;
      }
      const result = await fetch(API + leagueId + '/matchups/' + week, {cache:'no-store'});
      if (!result.ok) throw new Error('Sleeper matchups HTTP ' + result.status);
      const rows = await result.json();
      if (!Array.isArray(rows)) throw new Error('Unexpected Sleeper matchup data');
      if (document.getElementById('figLiveBoard') !== board) return;
      // Scoreboard cards show scores only. Player lineups are fetched when
      // visitors open an individual current-week matchup.
      const cards = gameCards(rows);
      board.innerHTML = cards ? '<div class="fig-live-grid">' + cards + '</div>' :
        '<div class="fig-live-empty">Current-week matchups have not been posted on Sleeper yet.</div>';
      if (status) status.textContent = 'Week ' + week + ' · Updated ' + new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
      retryAfter = 0;
    } catch (error) {
      // Keep the last successful scoreboard visible during temporary API errors.
      if (document.getElementById('figLiveBoard') === board) {
        if (!board.querySelector('.fig-live-grid')) {
          board.innerHTML = '<div class="fig-live-empty">Sleeper live scores are temporarily unavailable. The official archive is unaffected.</div>';
        }
        if (status) status.textContent = 'Waiting to reconnect to Sleeper';
      }
      retryAfter = Date.now() + 2 * 60 * 1000;
      console.warn('FIG live matchup refresh:', error);
    } finally {
      busy = false;
    }
  }

  // Detail pages reuse the same read-only Sleeper endpoint. Player IDs get their
  // display names from the periodically published roster snapshot; never download
  // Sleeper's multi-megabyte NFL player dictionary for every visitor.
  let rosterNames = null, detailBusy = false, lastDetailPoll = 0, detailRetryAfter = 0;
  function activeDetail() {
    const route = location.hash.startsWith('#/') ? location.hash.slice(2).split('/')[0] : 'home';
    return !document.hidden && route === 'livematch' ? document.getElementById('figLiveDetail') : null;
  }
  async function namesForPlayers() {
    if (rosterNames) return rosterNames;
    const names = new Map();
    try {
      const response = await fetch('data/current_roster.json', {cache:'no-store'});
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows)) for (const x of rows) {
          if (x.player_id && x.player_name) names.set(String(x.player_id), {name:String(x.player_name),position:String(x.position || '')});
        }
      }
    } catch (error) {
      console.warn('Player-name snapshot unavailable; using Sleeper player IDs:', error);
    }
    rosterNames = names;
    return names;
  }
  // One shared, position-aligned lineup for both live scoreboard cards
  // and the dedicated matchup page. The source is always the live Sleeper
  // matchup feed; no in-progress scores enter historical league records.
  function liveLineups(rows, league, names, options = {}) {
    const compact = options.compact === true;
    const ordered = [...rows].sort((a,b) => Number(a.roster_id)-Number(b.roster_id)).slice(0,2);
    const positions = Array.isArray(league?.roster_positions)
      ? league.roster_positions.filter(slot => !['BN','IR','TAXI','RESERVE'].includes(String(slot).toUpperCase())) : [];
    const abbrev = slot => slot === 'SUPER_FLEX' ? 'SFLX' : String(slot || 'START').toUpperCase();
    const positionCounts = {};
    positions.forEach(slot => {const k=abbrev(slot);positionCounts[k]=(positionCounts[k]||0)+1;});
    const usedPositions = {};
    const positionLabel = i => {
      const key = abbrev(positions[i]);
      usedPositions[key] = (usedPositions[key]||0) + 1;
      return positionCounts[key]>1 ? key+usedPositions[key] : key;
    };
    const sides = ordered.map(row => {
      const starters = Array.isArray(row.starters) ? row.starters.map(String) : [];
      const onField = new Set(starters);
      const scored = row.players_points && typeof row.players_points === 'object' ? row.players_points : {};
      const starterPoints = Array.isArray(row.starters_points) ? row.starters_points : [];
      // Positive bench points only. Zero, negative, missing, reserve and empty
      // slots are never displayed in scoreboard bench lists.
      const bench = (Array.isArray(row.players) ? row.players.map(String) : [])
        .filter(id => id && id !== '0' && !onField.has(id) &&
          scored[id] !== null && scored[id] !== undefined &&
          scored[id] !== '' && Number.isFinite(Number(scored[id])) && Number(scored[id]) > 0)
        .sort((a,b) => Number(scored[b])-Number(scored[a]));
      return {roster:Number(row.roster_id), starters, scored, starterPoints, bench, total:score(row)};
    });
    const player = (side, id, points) => {
      if (!side || !id || id === '0') return '<div class="fig-live-lineup-empty">—</div>';
      const info = names.get(String(id)) || {};
      const name = info.name || 'Player ' + id;
      const value = points == null || points === '' || !Number.isFinite(Number(points)) ? '—' : Number(points).toFixed(2);
      const headshot = typeof window.playerHeadshot === 'function'
        ? window.playerHeadshot(id, name, 'fig-live-nfl-photo') : '';
      return '<div class="fig-live-slot-player">' + headshot +
        '<span class="fig-live-slot-info"><b>' + clean(name) + '</b>' +
        (info.position ? '<small>' + clean(info.position) + '</small>' : '') +
        '</span><strong class="fig-live-slot-points">' + value + '</strong></div>';
    };
    const maxStarters = Math.max(positions.length, ...sides.map(x=>x.starters.length), 0);
    const heading = side => side ? '<a href="#/team/' + side.roster + '" class="fig-live-lineup-team">' +
      teamLabel(side.roster) + '<strong>' + (side.total === null ? '—' : side.total.toFixed(2)) + '</strong></a>' :
      '<span class="fig-live-lineup-team">NO OPPONENT</span>';
    const starters = Array.from({length:maxStarters},(_,i) => {
      const left=sides[0], right=sides[1];
      const leftId=left?.starters[i],rightId=right?.starters[i];
      return '<div class="fig-live-lineup-pair">' +
        player(left,leftId,left?.starterPoints[i] ?? left?.scored[leftId]) +
        '<span class="fig-live-lineup-slot">' + clean(positionLabel(i)) + '</span>' +
        player(right,rightId,right?.starterPoints[i] ?? right?.scored[rightId]) +
        '</div>';
    }).join('');
    const benches = sides.map(side => '<div class="fig-live-bench-team">' +
      '<div class="fig-live-bench-team-title">' + clean(NAMES[side.roster] || 'Roster ' + side.roster) +
      ' · ' + side.bench.length + '</div>' +
      (side.bench.length ? side.bench.map(id=>player(side,id,side.scored[id])).join('') :
        '<div class="fig-live-bench-empty">No bench players above 0 points</div>') + '</div>').join('');
    const open = compact ? '' : ' open';
    return '<div class="fig-live-detail-grid' + (compact ? ' fig-live-compact' : '') + '">' +
      '<div class="fig-live-lineup-title">STARTING LINEUPS <span>HEAD TO HEAD · BY POSITION</span></div>' +
      '<div class="fig-live-lineup-comparison">' +
        '<div class="fig-live-lineup-heading">' + heading(sides[0]) +
        '<span class="fig-live-lineup-middle">SLOT</span>' + heading(sides[1]) + '</div>' +
        (starters || '<div class="fig-live-empty">Starting lineups have not been posted yet.</div>') +
      '</div>' +
      '<details class="fig-live-positive-bench"' + open + '><summary>BENCH SCORERS <span>ABOVE 0 POINTS · ' +
        sides.reduce((sum,side)=>sum+side.bench.length,0) + ' PLAYERS</span></summary>' +
        '<div class="fig-live-positive-bench-grid">' + benches + '</div></details>' +
      '</div>';
  }
  async function refreshDetail(force = false) {
    const detail = activeDetail();
    if (!detail || detailBusy) return;
    const now = Date.now();
    if (now < detailRetryAfter || (!force && now - lastDetailPoll < POLL_MS - 1000)) return;
    const week = Number(detail.dataset.week);
    const key = String(detail.dataset.matchup || '');
    if (!Number.isInteger(week) || week < 1 || week > 18 || !/^(?:[0-9]+|solo-[0-9]+)$/.test(key)) return;
    detailBusy = true;lastDetailPoll = now;
    const status = document.getElementById('figLiveDetailStatus');
    try {
      let id = metaLeague;
      if (!id) {
        const res = await fetch('data/league_history.json', {cache:'no-store'});
        if (!res.ok) throw new Error('Cannot find the active Sleeper league');
        const seasons = await res.json();
        const current = seasons.sort((a,b)=>Number(b.season)-Number(a.season))[0];
        id = String(current?.league_id || '');
      }
      if (!/^[0-9]{10,22}$/.test(id)) throw new Error('Invalid Sleeper league ID');
      if (!leagueMeta || metaLeague !== id || Date.now() - metaAt >= META_MS) {
        const response = await fetch(API + id, {cache:'no-store'});
        if (!response.ok) throw new Error('Sleeper league HTTP ' + response.status);
        leagueMeta = await response.json();metaLeague = id;metaAt = Date.now();
      }
      if (activeDetail() !== detail) return;
      if (leagueMeta.status !== 'in_season' || Number(leagueMeta.settings?.leg) !== week) {
        detail.innerHTML = '<div class="fig-live-empty">This is no longer the active Sleeper week. View finalized scores and lineups in the <a href="#/games">Game Archive</a>.</div>';
        if (status) status.textContent = 'Historical week — not live';
        return;
      }
      const res = await fetch(API + id + '/matchups/' + week, {cache:'no-store'});
      if (!res.ok) throw new Error('Sleeper matchup HTTP ' + res.status);
      const all = await res.json();
      if (!Array.isArray(all)) throw new Error('Invalid matchup response');
      const selected = all.filter(row => String(row.matchup_id == null ? 'solo-' + Number(row.roster_id) : row.matchup_id) === key);
      const names = await namesForPlayers();
      if (activeDetail() !== detail) return;
      detail.innerHTML = selected.length ? liveLineups(selected.sort((a,b)=>Number(a.roster_id)-Number(b.roster_id)),leagueMeta,names) :
        '<div class="fig-live-empty">Matchup not found in the current week. <a href="#/home">Back to scores</a>.</div>';
      if (status) status.textContent = 'Week ' + week + ' · Updated ' + new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
      detailRetryAfter = 0;
    } catch (error) {
      if (activeDetail() === detail) {
        if (!detail.querySelector('.fig-live-detail-grid')) detail.innerHTML =
          '<div class="fig-live-empty">Live lineups are temporarily unavailable. <a href="#/home">Back to scores</a>.</div>';
        if (status) status.textContent = 'Waiting to reconnect';
      }
      detailRetryAfter = Date.now() + 2 * 60 * 1000;
      console.warn('FIG current-week lineup refresh:',error);
    } finally {detailBusy = false;}
  }
  window.addEventListener('fig:live-route', () => {lastDetailPoll = 0;detailRetryAfter = 0;refreshDetail(true);});

  // Tapping empty space on a matchup card opens lineups; team-name links keep
  // navigating to their franchise pages. The dedicated link supports keyboards.
  document.addEventListener('click', event => {
    const card = event.target.closest?.('.fig-live-match');
    if (!card || event.target.closest('a,button,summary,details')) return;
    const link = card.querySelector('.fig-live-open');
    if (link) location.hash = link.getAttribute('href');
  });

  window.addEventListener('fig:home-rendered', () => {
    const board = activeBoard();
    if (!board) return;
    // A new home view must not leave stale scores from a previous week on screen.
    board.innerHTML = '<div class="fig-live-empty">Getting current matchups from Sleeper…</div>';
    lastPoll = 0;
    retryAfter = 0;
    refresh(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {refresh();refreshDetail();}
  });
  setInterval(() => {refresh();refreshDetail();}, POLL_MS);
  // Also handle a home view rendered before this deferred script was evaluated.
  refresh();
  refreshDetail();
})();
