/* FIG League v67 — shared dark app navigation and native-density statistics on phones.
   Enhances the actual archive tables; does not change league data or desktop rendering. */
(() => {
  'use strict';
  const phone = window.matchMedia('(max-width:699px)');
  const app = document.getElementById('app');
  const header = document.querySelector('.app-header');
  if (!app || !header) return;
  const CHUNK = 32;
  const navItems = [
    ['HOME','#/home'], ['TEAMS','#/teams'], ['PLAYERS','#/players'], ['LEAGUE','#/standings']
  ];

  function routeName() {
    return (location.hash.replace(/^#\/?/,'').split('/')[0] || 'home').toLowerCase();
  }
  function currentSection(route) {
    if (route === 'team' || route === 'teamseason' || route === 'teams') return 'teams';
    if (route.startsWith('player')) return 'players';
    if (['standings','playoffs','champions','h2h','dynasty','draft'].includes(route)) return 'standings';
    return 'home';
  }
  function updateNav() {
    if (!phone.matches) return;
    let top = document.getElementById('fig-topnav');
    if (!top) {
      top = document.createElement('nav');
      top.id = 'fig-topnav'; top.className = 'fig-topnav';
      top.setAttribute('aria-label','League sections');
      navItems.forEach(([label,href]) => {
        const a = document.createElement('a'); a.href = href; a.textContent = label;
        top.append(a);
      });
      header.append(top);
    }
    const route = routeName();
    const section = currentSection(route);
    top.querySelectorAll('a').forEach(a => {
      const active = a.getAttribute('href') === '#/' + section;
      a.classList.toggle('active',active);
      if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    const dockSection = (route === 'team' || route === 'teamseason') ? 'teams' :
      route.startsWith('player') ? 'players' :
      ['records','record','singleseasons','special','streaks','streak'].includes(route) ? 'records' :
      ['minigames','game'].includes(route) ? 'minigames' :
      ['standings','playoffs','champions','h2h','dynasty','draft','trades'].includes(route) ? 'more' : route;
    document.querySelectorAll('.app-dock a').forEach(a => {
      const active = a.getAttribute('href') === '#/' + dockSection;
      if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }
  function labelFor(th) {
    return (th.querySelector('.sort-head')?.textContent || th.textContent || '')
      .replace(/[↕↑↓⇵]/g,'').replace(/\s+/g,' ').trim();
  }
  function getNumber(str) {
    const txt = String(str ?? '').replace(/,/g,'').trim();
    const match = txt.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }
  function enhance(wrap) {
    if (!phone.matches || wrap.dataset.figVersion === '67') return;
    const table = wrap.querySelector('table.sortable');
    if (!table || !table.tBodies[0]) return;
    const headings = [...table.querySelectorAll('thead th')];
    const rows = [...table.tBodies[0].rows];
    if (headings.length < 3 || !rows.length) return;
    const labels = headings.map(labelFor);
    const nameIndex = labels.findIndex(l => /^(PLAYER|TEAM|NAME|OWNER|OPPONENT|RECORD)$/i.test(l));
    const rankIndex = labels.findIndex(l => l === '#');
    const keyIndex = nameIndex >= 0 ? nameIndex : (rankIndex === 0 ? 1 : 0);
    const firstMetric = labels.findIndex(l => /^(POINTS|FPTS|FANTASY PTS|PTS|TOTAL|PF|WINS|WIN %|PTS\/START)$/i.test(l));
    const metricIndex = firstMetric >= 0 ? firstMetric : (labels.length > 3 ? 3 : labels.length - 1);
    const extras = labels.map((l,i) => i).filter(i => i !== keyIndex && i !== rankIndex && i !== metricIndex);
    const preferred = [
      extras.find(i=>/^(POS|POSITION)$/i.test(labels[i])),
      extras.find(i=>/^(STARTS|GAMES|GP|W|WINS)$/i.test(labels[i])),
      extras.find(i=>/^(PTS\/START|AVG|PPG|WIN %|L|LOSSES)$/i.test(labels[i]))
    ].filter(i=> i !== undefined);
    const summaryIndices = [...new Set([...preferred,...extras])].slice(0,3);
    const controls = document.createElement('div');controls.className = 'fig-list-controls';
    const label = document.createElement('label');label.textContent = 'SORT LEADERS BY';
    const select = document.createElement('select');select.setAttribute('aria-label','Sort leaderboard');
    labels.forEach((text,index) => {
      const option = document.createElement('option');option.value = String(index);
      option.textContent = text || `STAT ${index+1}`;select.add(option);
    });
    select.value = String(metricIndex);
    label.append(select);
    const dirButton = document.createElement('button');dirButton.type='button';dirButton.textContent='↓';
    dirButton.setAttribute('aria-label','Descending, tap to reverse order');
    controls.append(label,dirButton);
    const count = document.createElement('small');count.className='fig-results-count';
    const more = document.createElement('button');more.type='button';more.className='fig-table-more';
    let visible = CHUNK;let descending=true;
    function filteredRows() {
      return [...table.tBodies[0].rows].filter(row => !row.hidden && row.style.display !== 'none');
    }
    function paginate() {
      const all=filteredRows();
      all.forEach((tr,index)=>{tr.classList.toggle('fig-hidden',index>=visible);
        const rank=tr.querySelector('.fig-rank');if(rank)rank.dataset.position=String(index+1);
      });
      count.textContent=`Showing ${Math.min(visible,all.length)} of ${all.length} results`;
      more.hidden = all.length <= visible;
      more.textContent = `Show ${Math.min(CHUNK,Math.max(0,all.length-visible))} more players`;
    }
    function sort() {
      const idx=Number(select.value);
      const body=table.tBodies[0];
      const current=[...body.rows];
      current.sort((a,b) => {
        const ax=(a.cells[idx]?.textContent||'').trim(),bx=(b.cells[idx]?.textContent||'').trim();
        const an=getNumber(ax),bn=getNumber(bx);
        const d=Number.isFinite(an)&&Number.isFinite(bn) ? an-bn : ax.localeCompare(bx,undefined,{numeric:true});
        return descending?-d:d;
      });
      const frag=document.createDocumentFragment();current.forEach(row=>frag.append(row));body.append(frag);
      dirButton.textContent=descending?'↓':'↑';
      dirButton.setAttribute('aria-label',descending?'Descending, tap for ascending':'Ascending, tap for descending');
      visible=CHUNK;paginate();
    }
    rows.forEach((row,rowIndex) => {
      const cells=[...row.cells];
      if (cells.length < headings.length) return;
      const key=cells[keyIndex],rank=rankIndex>=0?cells[rankIndex]:null,metric=cells[metricIndex];
      if (!key || !metric) return;
      key.classList.add('fig-name');
      if (rank) rank.classList.add('fig-rank');
      metric.classList.add('fig-primary');metric.dataset.caption=labels[metricIndex];
      const summary=document.createElement('td');summary.className='fig-mobile-substats';
      summary.setAttribute('aria-label','Key statistics');
      summaryIndices.forEach(idx => {
        const text=(cells[idx]?.textContent||'').replace(/\s+/g,' ').trim();
        if (!text || text==='—') return;
        const stat=document.createElement('span');
        if (/^(POS|POSITION)$/i.test(labels[idx])) stat.className='fig-pos-tag';
        const prefix=document.createElement('span');prefix.textContent=labels[idx] + ' ';
        const val=document.createElement('b');val.textContent=text;
        stat.append(prefix,val);summary.append(stat);
      });
      row.append(summary);
      const detail=document.createElement('td');detail.className='fig-expanded-stats';
      detail.id=`fig-stats-${rowIndex}-${Math.random().toString(36).slice(2,6)}`;
      extras.filter(i=>!summaryIndices.includes(i)).forEach(idx=> {
        const stat=document.createElement('span');
        const caption=document.createElement('small');caption.textContent=labels[idx];
        stat.append(caption);
        const value=document.createElement('span');
        value.innerHTML=cells[idx]?.innerHTML || '—';
        stat.append(value);detail.append(stat);
      });
      if (detail.children.length) {
        const exp=document.createElement('td');exp.className='fig-expand-cell';
        const toggle=document.createElement('button');toggle.type='button';toggle.className='fig-expand-button';
        toggle.textContent='+ Stats';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',detail.id);
        toggle.addEventListener('click',()=> {
          const expanded=row.classList.toggle('fig-expanded');
          toggle.textContent=expanded?'− Less':'+ Stats';toggle.setAttribute('aria-expanded',String(expanded));
        });
        exp.append(toggle);row.append(exp,detail);
      }
    });
    wrap.classList.add('fig-list-table');wrap.dataset.figVersion='67';
    wrap.prepend(controls);wrap.append(count,more);
    more.addEventListener('click',()=>{visible+=CHUNK;paginate();});
    select.addEventListener('change',sort);
    dirButton.addEventListener('click',()=>{descending=!descending;sort();});
    // Sorting by default highlights the primary total; search/filter handlers in app.js stay in control.
    sort();
    // Search fields may filter this table without replacing it. Recompute pagination afterwards.
    app.querySelectorAll('input[type=search],.player-record-search').forEach(input=>{
      input.addEventListener('input',()=>setTimeout(paginate,25),{passive:true});
    });
  }
  function enhanceLeaders() {
    app.querySelectorAll('.threshold-grid:not([data-fig-tabs])').forEach(grid => {
      const panels=[...grid.querySelectorAll(':scope > .threshold-panel')];
      if (panels.length < 2) return;
      grid.dataset.figTabs='67';
      grid.classList.add('fig-leaderbook');
      const nav=document.createElement('nav');nav.className='fig-leader-tabs';
      nav.setAttribute('aria-label','Scoring milestones');
      panels.forEach((panel,i) => {
        const label=panel.querySelector('.threshold-title')?.textContent.trim().replace(/\s+/g,' ') || `LEADERS ${i+1}`;
        const tab=document.createElement('button');tab.type='button';tab.textContent=label;
        tab.setAttribute('aria-pressed',i===0?'true':'false');
        if(i===0)panel.classList.add('fig-panel-active');
        tab.addEventListener('click',() => {
          panels.forEach((other,j)=>other.classList.toggle('fig-panel-active',i===j));
          [...nav.children].forEach((button,j)=>button.setAttribute('aria-pressed',String(i===j)));
        });
        nav.append(tab);
      });
      grid.prepend(nav);
    });
  }
  let scanScheduled=false;
  function scan() {
    if (!phone.matches) return;
    updateNav();
    app.querySelectorAll('.table-wrap:not([data-fig-version])').forEach(enhance);
    enhanceLeaders();
  }
  function scheduleScan() {
    if (!phone.matches || scanScheduled) return;
    scanScheduled=true;
    requestAnimationFrame(()=>{scanScheduled=false;scan();});
  }
  const observer=new MutationObserver(mutations=> {
    const relevant=mutations.some(m=> [...m.addedNodes].some(n=>{
      if(n.nodeType!==Node.ELEMENT_NODE) return false;
      if(n.closest?.('.fig-list-table')) return false;
      return n.matches?.('.table-wrap,section,main,.control-output')||!!n.querySelector?.('.table-wrap');
    }));
    if(relevant) scheduleScan();
  });
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{updateNav();scheduleScan();});
  phone.addEventListener('change',()=>{updateNav();scheduleScan();});
  updateNav();scheduleScan();
})();