/* Read-only 30-second Sleeper scoreboard. Never modifies archived JSON or records. */
(() => {
  'use strict';
  const API = 'https://api.sleeper.app/v1/league/';
  const NAMES = {1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
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
        const label = NAMES[roster] ? '<a href="#/team/' + roster + '">' + name + '</a>' : '<span class="fig-live-name">' + name + '</span>';
        const value = score(row);
        const lead = pair && value !== null && value === high && group.filter(other => score(other) === high).length === 1;
        return '<div class="fig-live-side' + (lead ? ' fig-live-leading' : '') + '">' + label +
          '<span class="fig-live-score">' + (value == null ? '—' : value.toFixed(2)) + '</span></div>';
      }).join('');
      return '<article class="fig-live-match"><div class="fig-live-match-label">' +
        (pair ? 'MATCHUP ' + String(id).replace(/[^0-9]/g,'') : 'UNPAIRED ROSTER') + '</div>' +
        sides + '</article>';
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
    if (!document.hidden) refresh();
  });
  setInterval(() => refresh(), POLL_MS);
})();
