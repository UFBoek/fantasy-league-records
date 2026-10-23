/* Presentation-only shell, accessibility and navigation context for FIG League. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const icons = {
  "home": "<path d=\"M5 12l-2 0l9 -9l9 9l-2 0\" />\n  <path d=\"M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7\" />\n  <path d=\"M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6\" />",
  "users": "<path d=\"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0\" />\n  <path d=\"M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2\" />\n  <path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />\n  <path d=\"M21 21v-2a4 4 0 0 0 -3 -3.85\" />",
  "trophy": "<path d=\"M8 21l8 0\" />\n  <path d=\"M12 17l0 4\" />\n  <path d=\"M7 4l10 0\" />\n  <path d=\"M17 4v8a5 5 0 0 1 -10 0v-8\" />\n  <path d=\"M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0\" />\n  <path d=\"M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0\" />",
  "user-square-rounded": "<path d=\"M12 13a3 3 0 1 0 0 -6a3 3 0 0 0 0 6\" />\n  <path d=\"M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9\" />\n  <path d=\"M6 20.05v-.05a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v.05\" />",
  "bolt": "<path d=\"M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11\" />",
  "dots": "<path d=\"M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" />\n  <path d=\"M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" />\n  <path d=\"M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" />",
  "arrows-exchange": "<path d=\"M7 10h14l-4 -4\" />\n  <path d=\"M17 14h-14l4 4\" />",
  "chart-bar": "<path d=\"M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6\" />\n  <path d=\"M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10\" />\n  <path d=\"M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14\" />\n  <path d=\"M4 20h14\" />",
  "arrows-left-right": "<path d=\"M21 17l-18 0\" />\n  <path d=\"M6 10l-3 -3l3 -3\" />\n  <path d=\"M3 7l18 0\" />\n  <path d=\"M18 20l3 -3l-3 -3\" />",
  "calendar-stats": "<path d=\"M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4\" />\n  <path d=\"M18 14v4h4\" />\n  <path d=\"M14 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0\" />\n  <path d=\"M15 3v4\" />\n  <path d=\"M7 3v4\" />\n  <path d=\"M3 11h16\" />",
  "ball-american-football": "<path d=\"M15 9l-6 6\" />\n  <path d=\"M10 12l2 2\" />\n  <path d=\"M12 10l2 2\" />\n  <path d=\"M8 21a5 5 0 0 0 -5 -5\" />\n  <path d=\"M16 3c-7.18 0 -13 5.82 -13 13a5 5 0 0 0 5 5c7.18 0 13 -5.82 13 -13a5 5 0 0 0 -5 -5\" />\n  <path d=\"M16 3a5 5 0 0 0 5 5\" />",
  "device-gamepad-2": "<path d=\"M12 5h3.5a5 5 0 0 1 0 10h-5.5l-4.015 4.227a2.3 2.3 0 0 1 -3.923 -2.035l1.634 -8.173a5 5 0 0 1 4.904 -4.019h3.4\" />\n  <path d=\"M14 15l4.07 4.284a2.3 2.3 0 0 0 3.925 -2.023l-1.6 -8.232\" />\n  <path d=\"M8 9v2\" />\n  <path d=\"M7 10h2\" />\n  <path d=\"M14 10h2\" />",
  "list-numbers": "<path d=\"M11 6h9\" />\n  <path d=\"M11 12h9\" />\n  <path d=\"M12 18h8\" />\n  <path d=\"M4 16a2 2 0 1 1 4 0c0 .591 -.5 1 -1 1.5l-3 2.5h4\" />\n  <path d=\"M6 10v-6l-2 2\" />",
  "chart-line": "<path d=\"M4 19l16 0\" />\n  <path d=\"M4 15l4 -6l4 2l4 -5l4 4\" />",
  "chevron-right": "<path d=\"M9 6l6 6l-6 6\" />",
  "arrow-left": "<path d=\"M5 12l14 0\" />\n  <path d=\"M5 12l6 6\" />\n  <path d=\"M5 12l6 -6\" />",
  "search": "<path d=\"M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0\" />\n  <path d=\"M21 21l-6 -6\" />",
  "menu-2": "<path d=\"M4 6l16 0\" />\n  <path d=\"M4 12l16 0\" />\n  <path d=\"M4 18l16 0\" />",
  "x": "<path d=\"M18 6l-12 12\" />\n  <path d=\"M6 6l12 12\" />",
  "arrow-up-right": "<path d=\"M17 7l-10 10\" />\n  <path d=\"M8 7l9 0l0 9\" />",
  "history": "<path d=\"M12 8l0 4l2 2\" />\n  <path d=\"M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5\" />",
  "circle-check": "<path d=\"M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" />\n  <path d=\"M9 12l2 2l4 -4\" />"
}; // Populated from the vendored MIT-licensed Tabler outline set.
  const icon = (name) => `<svg class="fig-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name] || icons['chevron-right'] || ''}</svg>`;
  const routes = {
    home: ['Home', 'home'], teams: ['Teams', 'users'], records: ['Records', 'trophy'],
    players: ['Players', 'user-square-rounded'], streaks: ['Streaks', 'bolt'],
    draft: ['Draft rankings', 'list-numbers'], trades: ['Trade ratings', 'arrows-exchange'],
    'manager-ratings': ['Manager ratings', 'chart-bar'], dynasty: ['Dynasty values', 'chart-line'],
    h2h: ['Head-to-head', 'arrows-left-right'], champions: ['Champions', 'trophy'],
    'playoff-calculator': ['Playoff calculator', 'ball-american-football'],
    'historical-predictions': ['Historical predictions', 'history'], games: ['Game archive', 'calendar-stats'],
    minigames: ['Minigames', 'device-gamepad-2'], more: ['More', 'dots']
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const currentHash = () => location.hash || '#/home';
  const routeParts = () => currentHash().replace(/^#\/?/, '').split('/');
  const sectionFor = (route) => {
    if (['team', 'teamseason', 'teams'].includes(route)) return 'teams';
    if (route.startsWith('player')) return 'players';
    if (['record', 'records', 'singleseasons', 'special', 'breakdown'].includes(route)) return 'records';
    if (['streak', 'streaks'].includes(route)) return 'streaks';
    if (['game', 'games'].includes(route)) return 'games';
    if (['matchup', 'rivalry'].includes(route)) return 'h2h';
    if (route === 'playoffbracket') return 'champions';
    if (route === 'manager') return 'manager-ratings';
    if (['livematch', 'standings'].includes(route)) return 'home';
    return routes[route] ? route : 'home';
  };
  const parentRoute = () => {
    const p = routeParts();
    if (p[0] === 'teamseason') return '#/team/' + p[1];
    if (p[0] === 'draft' && p[1] === 'team') return '#/draft';
    if (p[0] === 'playoff-calculator' && p[1]) return '#/playoff-calculator';
    const section = sectionFor(p[0]);
    return p[0] === section ? '#/home' : '#/' + section;
  };
  const skeleton = (label = 'Loading league page') => `<div class="fig-skeleton" role="status"><span class="fig-sr">${label}</span><div class="fig-skeleton-line" aria-hidden="true"></div><div class="fig-skeleton-line short" aria-hidden="true"></div><div class="fig-skeleton-cards" aria-hidden="true"><div class="fig-skeleton-block"></div><div class="fig-skeleton-block"></div><div class="fig-skeleton-block"></div></div><div class="fig-skeleton-rows" aria-hidden="true">${Array.from({length:4}, () => '<div class="fig-skeleton-row"><span></span><span></span><span></span></div>').join('')}</div></div>`;

  // Use real browser entries. Back does not create another entry in a parallel trail.
  // State is scoped to this tab, bounded, and contains UI state only (never league data).
  const storageKey = 'fig-ui-navigation-v1';
  let snapshots = {};
  try { snapshots = JSON.parse(sessionStorage.getItem(storageKey) || '{}') || {}; } catch {}
  let entry = history.state?.figUI || null;
  if (!entry) {
    entry = {id: String(Date.now()) + '-0', depth: 0, hash: currentHash()};
    history.replaceState({...history.state, figUI: entry}, '');
  }
  let activeHash = currentHash(), generation = 0, pendingTimer, restoring = false, scrollFrame = 0;
  let nextRestore = null;
  const snapshotControls = () => ({
    y: scrollY,
    groups: [...app.querySelectorAll('.pill-row[id],.tabs[id]')].map(group => {
      const button = group.querySelector('button.active');
      return button ? {id: group.id, value: button.dataset.value, tab: button.dataset.tab} : null;
    }).filter(Boolean),
    inputs: [...app.querySelectorAll('input[id],select[id]')].filter(input => !['checkbox','radio','password'].includes(input.type)).map(input => ({id:input.id,value:input.value})),
    details: [...app.querySelectorAll('details')].map((element,index) => ({id:element.id,index,open:element.open})).filter(item => item.open),
    scrolls: [...app.querySelectorAll('.table-wrap,.tabs,.fig-leader-tabs')].map((element,index) => ({index,x:element.scrollLeft})).filter(item => item.x > 0)
  });
  const remember = () => {
    if (restoring || app.getAttribute('aria-busy') === 'true' || !entry) return;
    snapshots[entry.id] = snapshotControls();
  };
  const persist = () => {
    remember();
    const ids = Object.keys(snapshots);
    for (const id of ids.slice(0,Math.max(0,ids.length-50))) delete snapshots[id];
    try { sessionStorage.setItem(storageKey, JSON.stringify(snapshots)); } catch {}
  };
  // Passive and frame-bounded; no layout reads or animation work in scroll events.
  addEventListener('scroll', () => {
    if (scrollFrame || restoring) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      if (entry && app.getAttribute('aria-busy') !== 'true') {
        snapshots[entry.id] ||= {y:0};
        snapshots[entry.id].y = scrollY;
      }
    });
  }, {passive:true});
  addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#/"],tr[data-href]');
    if (link) remember();
  }, true);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function restoreControls(snapshot) {
    if (!snapshot) return;
    for (const item of snapshot.groups || []) {
      const group = document.getElementById(item.id);
      const button = group && [...group.querySelectorAll('button')].find(b => item.tab ? b.dataset.tab === item.tab : b.dataset.value === item.value);
      if (button && !button.classList.contains('active')) button.click();
    }
    for (const item of snapshot.inputs || []) {
      const input = document.getElementById(item.id);
      if (!input || input.value === item.value) continue;
      if (input.tagName === 'SELECT' && ![...input.options].some(o => o.value === item.value)) continue;
      input.value = item.value;
      input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}));
    }
    for (const item of snapshot.details || []) {
      const target = item.id ? document.getElementById(item.id) : app.querySelectorAll('details')[item.index];
      if (target?.tagName === 'DETAILS') target.open = true;
    }
    const scrolls = app.querySelectorAll('.table-wrap,.tabs,.fig-leader-tabs');
    for (const item of snapshot.scrolls || []) if (scrolls[item.index]) scrolls[item.index].scrollLeft = item.x;
  }

  function updateNavigation() {
    const path = routeParts()[0], section = sectionFor(path);
    const dockSection = ['home','teams','records','players','streaks'].includes(section) ? section : 'more';
    document.querySelectorAll('#topNav a,.app-dock a').forEach(a => {
      const active = a.getAttribute('href') === '#/' + (a.closest('.app-dock') ? dockSection : section);
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    const back = document.getElementById('figBack');
    if (back) back.hidden = path === 'home';
    document.querySelector('.app-header')?.classList.toggle('fig-has-back',path !== 'home');
    const title = app.querySelector('h1')?.textContent.replace(/\s+/g,' ').trim();
    const current = document.querySelector('.fig-header-current');
    if (current) current.textContent = title || routes[section]?.[0] || 'League archive';
    if (title) document.title = title + ' · FIG League';
  }

  function enhance() {
    updateNavigation();
    app.querySelectorAll('.app-tile-icon,.fig-more-item .avatar,.mini-arcade-icon').forEach(target => {
      if (target.dataset.uiIcon) return;
      const href = target.closest('a')?.getAttribute('href') || '#/minigames';
      target.innerHTML = icon(routes[href.split('/')[1]]?.[1] || 'device-gamepad-2');
      target.setAttribute('aria-hidden','true');target.dataset.uiIcon = '1';
    });
    app.querySelectorAll('input:not([aria-label]),select:not([aria-label])').forEach(input => {
      if ((input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) || input.closest('label')) return;
      const label = input.getAttribute('placeholder') || input.id.replace(/([a-z])([A-Z])/g,'$1 $2') || (input.tagName === 'SELECT' ? 'Filter results' : 'Search');
      input.setAttribute('aria-label', label);
    });
    app.querySelectorAll('.pill-row,.tabs').forEach(group => {
      group.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
    });
    app.querySelectorAll('.loading:not([data-ui-loading]),.pcl-loading:not([data-ui-loading])').forEach(target => {
      target.dataset.uiLoading='1';target.innerHTML=skeleton();
    });
  }

  function beginRoute() {
    clearTimeout(pendingTimer);
    const hash = currentHash(), old = entry;
    remember();
    const browserEntry = history.state?.figUI;
    const returning = browserEntry && browserEntry.id !== old?.id;
    const same = hash === activeHash;
    if (returning) entry = browserEntry;
    else if (!same || !browserEntry) {
      entry = {id: String(Date.now()) + '-' + (++generation), depth:(old?.depth || 0)+1, hash};
      history.replaceState({...history.state,figUI:entry}, '');
    }
    nextRestore = returning || same ? snapshots[entry.id] : null;
    activeHash = hash;
    const token = {id:++generation,hash,restore:nextRestore};
    const previousContent = app.firstChild;
    app.dataset.route = routeParts()[0] || 'home';
    app.setAttribute('aria-busy','true');
    // Some tools render their shell before awaiting an external service. Never
    // detach that shell (and its listeners) while its data request is in flight.
    pendingTimer = setTimeout(() => {
      if (token.id === generation && app.firstChild === previousContent) app.innerHTML = skeleton();
    },180);
    return token;
  }

  function finishRoute(token) {
    if (!token || token.id !== generation || token.hash !== currentHash()) return;
    clearTimeout(pendingTimer);
    app.removeAttribute('aria-busy');
    restoring = true;
    enhance();
    requestAnimationFrame(() => {
      restoreControls(token.restore);
      requestAnimationFrame(() => {
        const weekTarget = routeParts()[0] === 'playoff-calculator' && routeParts()[1] === 'week' && document.getElementById('pclWeekArea');
        if (!token.restore && weekTarget) weekTarget.scrollIntoView({block:'start'});
        else scrollTo({top:token.restore?.y || 0,behavior:'instant'});
        restoring = false;
        updateNavigation();
        const title = app.querySelector('h1');
        if (title) {
          title.tabIndex=-1;
          title.focus({preventScroll:true});
          document.getElementById('figRouteAnnouncer').textContent=title.textContent.trim();
        }
        if (!reduced.matches && !token.restore && app.animate) {
          app.animate([{opacity:.8,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'});
        }
        document.dispatchEvent(new CustomEvent('fig:route-ready',{detail:{hash:token.hash}}));
      });
    });
  }

  function initShell() {
    document.querySelectorAll('[data-fig-icon]').forEach(el => {el.innerHTML=icon(el.dataset.figIcon)});
    document.querySelectorAll('.app-dock a').forEach(a => {
      const target=a.querySelector('span'), key=a.getAttribute('href').split('/')[1];
      if(target)target.innerHTML=icon(routes[key]?.[1]||'dots');
    });
    document.getElementById('figBack')?.addEventListener('click', () => {
      if ((entry?.depth || 0) > 0) history.back(); else location.hash=parentRoute();
    });
    document.querySelector('.fig-skip')?.addEventListener('click', event => {event.preventDefault();app.focus({preventScroll:false});});
    updateNavigation();
  }

  // Only actual, changed live scores receive emphasis. No tweened historical numbers.
  const liveValues = new Map();
  function enhanceLive() {
    app.querySelectorAll('.fig-live-match').forEach(match => {
      match.querySelectorAll('.fig-live-score').forEach((score,index) => {
        const key=(match.getAttribute('href') || match.querySelector('a')?.getAttribute('href') || match.textContent.slice(0,20)) + ':' + index;
        const value=score.textContent.trim(), prior=liveValues.get(key);
        if(prior !== undefined && value !== prior && !reduced.matches)score.classList.add('fig-score-changed');
        liveValues.set(key,value);
      });
    });
  }
  let scheduled=false;
  const observer=new MutationObserver(mutations => {
    if(scheduled || !mutations.some(m => m.type==='childList' && m.addedNodes.length))return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;enhance();enhanceLive();});
  });
  observer.observe(app,{childList:true,subtree:true});
  app.addEventListener('click', () => requestAnimationFrame(enhance));
  app.addEventListener('toggle', event => {
    const details=event.target;
    if(details.tagName !== 'DETAILS' || !details.open || reduced.matches)return;
    const content=details.querySelector(':scope > :not(summary)');
    content?.animate?.([{opacity:.5,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
  },true);
  app.addEventListener('click',event => {
    if(reduced.matches || !event.target.closest('.sort-head'))return;
    const host=event.target.closest('.fig-frozen-grid,.table-wrap');
    if(!host)return;
    const before=[...host.querySelectorAll('tbody tr')].filter(el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}).slice(0,32).map(el=>[el,el.getBoundingClientRect().top]);
    requestAnimationFrame(()=>before.forEach(([el,top])=>{
      const delta=top-el.getBoundingClientRect().top;
      if(el.isConnected&&delta&&Math.abs(delta)<innerHeight)el.animate([{transform:`translateY(${delta}px)`},{transform:'none'}],{duration:200,easing:'cubic-bezier(.16,1,.3,1)'});
    }));
  },true);
  addEventListener('hashchange', () => requestAnimationFrame(updateNavigation));
  window.figUI={beginRoute,finishRoute,skeleton,icon,enhance};
  initShell();
})();
