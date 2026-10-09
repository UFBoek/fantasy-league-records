/* FIG League v69 — connected back navigation, live sort metrics, and streamlined record histories on phones.
   Enhances the actual archive tables; does not change league data or desktop rendering. */
(() => {
  'use strict';
  const phone = window.matchMedia('(max-width:699px)');
  const app = document.getElementById('app');
  const header = document.querySelector('.app-header');
  if (!app || !header) return;
  const CHUNK = 32;
  let lastHash = location.hash || '#/home';
  const backTrail=[];
  let suppressTrail=false;
  const navItems = [
    ['HOME','#/home'], ['TEAMS','#/teams'], ['RECORDS','#/records'], ['PLAYERS','#/players']
  ];

  function routeName() {
    return (location.hash.replace(/^#\/?/,'').split('/')[0] || 'home').toLowerCase();
  }
  function currentSection(route) {
    if (['team','teamseason','teams'].includes(route)) return 'teams';
    if (route.startsWith('player')) return 'players';
    if (['records','record','singleseasons','breakdown','special','streak','streaks'].includes(route)) return 'records';
    return 'home';
  }
  function fallbackBack(route) {
    if (['team','teamseason'].includes(route)) return '#/teams';
    if (['record','singleseasons','special','breakdown'].includes(route)) return '#/records';
    if (route === 'streak') return '#/streaks';
    if (['playoffbracket'].includes(route)) return '#/champions';
    if (route === 'game') return '#/games';
    if (route === 'livematch') return '#/home';
    if (['matchup','rivalry'].includes(route)) return '#/h2h';
    if (route.startsWith('player') && route !== 'players') return '#/players';
    return '#/home';
  }
  function updateBack() {
    if (!phone.matches) return;
    let back = header.querySelector('.fig-back-button');
    if (!back) {
      back=document.createElement('button');
      back.type='button';
      back.className='fig-back-button';
      back.setAttribute('aria-label','Go back');
      back.title='Back';
      back.textContent='←';
      header.prepend(back);
      back.addEventListener('click',() => {
        const current=location.hash || '#/home';
        let target=backTrail.pop();
        while (target === current) target=backTrail.pop();
        if (!target) target=fallbackBack(routeName());
        if (target === current) return;
        suppressTrail=true;
        location.hash=target;
      });
    }
    const show=routeName() !== 'home';
    back.hidden=!show;
    header.classList.toggle('fig-has-back',show);
  }
  function handleHashChange() {
    const nextHash=location.hash || '#/home';
    if (nextHash !== lastHash) {
      if (!suppressTrail && lastHash) {
        backTrail.push(lastHash);
        if (backTrail.length > 50) backTrail.shift();
      }
      lastHash=nextHash;
    }
    suppressTrail=false;
    updateNav();
    scheduleScan();
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
    updateBack();
    const section = currentSection(route);
    top.querySelectorAll('a').forEach(a => {
      const active = a.getAttribute('href') === '#/' + section;
      a.classList.toggle('active',active);
      if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    const dockSection = (route === 'team' || route === 'teamseason') ? 'teams' :
      route.startsWith('player') ? 'players' :
      ['records','record','singleseasons','special','breakdown'].includes(route) ? 'records' :
      ['streaks','streak'].includes(route) ? 'streaks' :
      ['minigames','game'].includes(route) ? 'more' :
      route === 'livematch' ? 'home' :
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
    if (!phone.matches || wrap.dataset.figVersion === '69') return;
    const table = wrap.querySelector('table.sortable');
    if (!table || !table.tBodies[0]) return;
    const headings = [...table.querySelectorAll('thead th')];
    const rows = [...table.tBodies[0].rows];
    if (headings.length < 3 || !rows.length) return;
    const labels = headings.map(labelFor);
    const nameIndex = labels.findIndex(l => /^(PLAYER|TEAM|NAME|HOLDER|OWNER|OPPONENT|RECORD)$/i.test(l));
    const rankIndex = labels.findIndex(l => l === '#');
    const keyIndex = nameIndex >= 0 ? nameIndex : (rankIndex === 0 ? 1 : 0);
    const firstMetric = labels.findIndex(l => /^(VALUE|LENGTH|COUNT|SCORE|POINTS|FPTS|FANTASY PTS|PTS|TOTAL|PF|WINS|WIN %|PTS\/START)$/i.test(l));
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
    const route = routeName();
    const typeIndex = labels.findIndex(value => /^TYPE$/i.test(value));
    const lengthIndex = labels.findIndex(value => /^LENGTH$/i.test(value));
    const valueIndex = labels.findIndex(value => /^(VALUE|POINTS|COUNT|SCORE)$/i.test(value));
    const isActiveStreaks = route === 'streaks' && typeIndex >= 0 && lengthIndex >= 0;
    const isRecordHistory = ['record','streak','singleseasons','special','playerweeks','playerbombrank','playerbomb'].includes(route) && (valueIndex >= 0 || lengthIndex >= 0);
    const standingsDefault = route === 'standings' ?
      labels.findIndex(text => /^(WIN %|AP %|LUCK W|ALL-PLAY %)$/i.test(text)) : -1;
    const mainIndex = isRecordHistory ? (route === 'streak' && lengthIndex >= 0 ? lengthIndex : (valueIndex >= 0 ? valueIndex : lengthIndex)) :
      isActiveStreaks ? typeIndex : standingsDefault >= 0 ? standingsDefault : metricIndex;
    const isStatsBoard = route === 'players' || route === 'standings';
    const allowedIndices = isRecordHistory ? [mainIndex] :
      isActiveStreaks ? [typeIndex,lengthIndex] :
      isStatsBoard ? labels.map((_,i) => i).filter(i =>
        i !== keyIndex && i !== rankIndex &&
        !/^(PLAYER|TEAM|NAME|OWNER|POS|POSITION|TYPE|STATUS|SEASON|YEAR|WEEK)$/i.test(labels[i])
      ) : labels.map((_,i) => i);
    if (!allowedIndices.length) allowedIndices.push(mainIndex);
    allowedIndices.forEach(index => {
      const option = document.createElement('option'); option.value=String(index);
      option.textContent=labels[index] || 'STAT';
      select.add(option);
    });
    select.value=String(mainIndex);
    if (isRecordHistory) {
      label.textContent = route === 'streak' || valueIndex < 0 ? 'SORT BY STREAK LENGTH' : 'SORT BY VALUE';
      select.hidden=true;
    } else {
      label.textContent = isActiveStreaks ? 'SORT ACTIVE STREAKS BY' : 'SORT LEADERS BY';
    }
    label.append(select);
    const dirButton = document.createElement('button');dirButton.type='button';dirButton.textContent='↓';
    dirButton.setAttribute('aria-label','Descending, tap to reverse order');
    controls.append(label,dirButton);
    const count = document.createElement('small');count.className='fig-results-count';
    const more = document.createElement('button');more.type='button';more.className='fig-table-more';
    let visible = CHUNK;
    const lowestFirst = route === 'special' && location.hash.includes('teamweeks-low');
    let descending = !isActiveStreaks && !lowestFirst;
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
      more.textContent = `Show ${Math.min(CHUNK,Math.max(0,all.length-visible))} more results`;
    }
    // Keep the headline number AND its label synced with the selected sort stat.
    function refreshPrimary() {
      const idx=Number(select.value);
      if (!Number.isInteger(idx) || idx<0 || idx>=headings.length ||
          idx===keyIndex || idx===rankIndex) return;
      const priorities=[
        /^(POS|POSITION)$/i,
        /^(POINTS|PF|FPTS|TOTAL|WIN %|AP %|LUCK W)$/i,
        /^(STARTS|GAMES|GP|W|WINS)$/i,
        /^(PTS\/START|AVG|PPG|L|LOSSES)$/i
      ];
      const otherIndices=labels.map((_,i)=>i)
        .filter(i=>i!==keyIndex && i!==rankIndex && i!==idx);
      otherIndices.sort((a,b) => {
        const priority=i=>{
          const p=priorities.findIndex(re=>re.test(labels[i]));
          return p<0?99:p;
        };
        return priority(a)-priority(b)||a-b;
      });
      const visibleExtras=otherIndices.slice(0,3);
      for (const row of table.tBodies[0].rows) {
        const cells=[...row.cells];
        if (!cells[idx]) continue;
        cells.slice(0,headings.length).forEach((cell,i)=>{
          cell.classList.toggle('fig-primary',i===idx);
          if (i!==idx) cell.removeAttribute('data-caption');
        });
        cells[idx].dataset.caption=labels[idx];
        const summary=row.querySelector('.fig-mobile-substats');
        if (summary) {
          summary.replaceChildren();
          visibleExtras.forEach(i=>{
            const value=(cells[i]?.textContent||'').replace(/\s+/g,' ').trim();
            if(!value || value==='—') return;
            const stat=document.createElement('span');
            if (/^(POS|POSITION)$/i.test(labels[i])) stat.className='fig-pos-tag';
            const caption=document.createElement('span');caption.textContent=labels[i]+' ';
            const amount=document.createElement('b');amount.textContent=value;
            stat.append(caption,amount);summary.append(stat);
          });
        }
        const detail=row.querySelector('.fig-expanded-stats');
        if (detail) {
          detail.replaceChildren();
          for (const i of otherIndices.filter(i=>!visibleExtras.includes(i))) {
            const item=document.createElement('span');
            const caption=document.createElement('small');caption.textContent=labels[i];
            const value=document.createElement('span');value.innerHTML=cells[i]?.innerHTML||'—';
            item.append(caption,value);detail.append(item);
          }
          const toggle=row.querySelector('.fig-expand-button');
          if (toggle) {
            toggle.hidden=!detail.children.length;
            if (!detail.children.length) row.classList.remove('fig-expanded');
          }
        }
      }
    }
    function sort() {
      const idx=Number(select.value);
      const body=table.tBodies[0];
      const field=headings[idx]?.dataset.key;
      const textField=/^(PLAYER|TEAM|NAME|HOLDER|OWNER|TYPE|STATUS|POS|POSITION)$/i.test(labels[idx]);
      const current=[...body.rows];
      const getSortValue=(row) => {
        let stored;
        try {stored=JSON.parse(row.dataset.row || '{}')[field];} catch {}
        return stored == null ? (row.cells[idx]?.textContent||'').trim() : String(stored).trim();
      };
      current.sort((a,b) => {
        const ax=getSortValue(a),bx=getSortValue(b);
        const an=textField?NaN:getNumber(ax),bn=textField?NaN:getNumber(bx);
        const d=Number.isFinite(an)&&Number.isFinite(bn) ? an-bn :
          ax.localeCompare(bx,undefined,{numeric:true,sensitivity:'base'});
        if (isActiveStreaks && idx===typeIndex && d===0) {
          const al=getNumber(a.cells[lengthIndex]?.textContent);
          const bl=getNumber(b.cells[lengthIndex]?.textContent);
          return (Number.isFinite(bl)?bl:0)-(Number.isFinite(al)?al:0);
        }
        return descending?-d:d;
      });
      const frag=document.createDocumentFragment();
      current.forEach(row=>frag.append(row));
      body.append(frag);
      dirButton.textContent=descending?'↓':'↑';
      dirButton.setAttribute('aria-label',descending?'Sort descending, tap for ascending':'Sort ascending, tap for descending');
      visible=CHUNK;refreshPrimary();paginate();
    }
    if (isActiveStreaks) {
      controls.classList.add('fig-streak-controls');
      const typeFilter=document.createElement('label');
      typeFilter.className='fig-streak-type-filter';
      typeFilter.textContent='STREAK TYPE';
      const filter=document.createElement('select');
      filter.setAttribute('aria-label','Filter active streaks by type');
      const all=document.createElement('option');all.value='';all.textContent='ALL TYPES';filter.add(all);
      const names=[...new Set(rows.map(row => {
        try {return String(JSON.parse(row.dataset.row || '{}').type || '').trim();}
        catch {return String(row.cells[typeIndex]?.textContent || '').trim();}
      }).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
      names.forEach(name=> {
        const option=document.createElement('option');option.value=name;option.textContent=name;filter.add(option);
      });
      typeFilter.append(filter);
      controls.append(typeFilter);
      filter.addEventListener('change',()=> {
        [...table.tBodies[0].rows].forEach(row => {
          let name='';
          try {name=String(JSON.parse(row.dataset.row || '{}').type || '').trim();}
          catch {name=String(row.cells[typeIndex]?.textContent || '').trim();}
          row.hidden = filter.value !== '' && name !== filter.value;
        });
        visible=CHUNK;paginate();
      });
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
    wrap.classList.add('fig-list-table');wrap.dataset.figVersion='69';
    wrap.prepend(controls);wrap.append(count,more);
    more.addEventListener('click',()=>{visible+=CHUNK;paginate();});
    select.addEventListener('change',()=> {
      if (isActiveStreaks) descending=Number(select.value) !== typeIndex;
      sort();
    });
    dirButton.addEventListener('click',()=>{descending=!descending;sort();});
    // History pages sort only by the record value / streak length; preserve built-in search/filter handlers.
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
      grid.dataset.figTabs='69';
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
  window.addEventListener('hashchange',handleHashChange);
  phone.addEventListener('change',()=>{updateNav();scheduleScan();});
  updateNav();scheduleScan();
})();