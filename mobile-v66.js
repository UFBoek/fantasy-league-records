/* FIG League v66 — responsive stat-card renderer. Original tables and sorting remain intact. */
(() => {
  const isPhone = window.matchMedia('(max-width: 699px)');
  const app = document.getElementById('app');
  if (!app) return;
  const CHUNK = 24;

  const activeDock = () => {
    const route = (location.hash.slice(2).split('/')[0] || 'home');
    const section = route === 'team' || route === 'teamseason' ? 'teams' :
      route.startsWith('player') ? 'players' :
      ['record','breakdown','singleseasons','special'].includes(route) ? 'records' :
      ['streak','streaks'].includes(route) ? 'more' :
      ['trades','dynasty','h2h','draft','champions','standings','game'].includes(route) ? 'more' : route;
    document.querySelectorAll('.app-dock a').forEach((link) => {
      if (link.getAttribute('href') === '#/' + section) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  const enhance = (wrap) => {
    if (!isPhone.matches || wrap.dataset.v66Enhanced === 'yes') return;
    const table = wrap.querySelector('table.sortable');
    if (!table) return;
    const headings = Array.from(table.querySelectorAll('thead th'));
    if (!headings.length) return;
    const labels = headings.map((th) => th.querySelector('.sort-head')?.textContent.replace(/[↕↑↓]/g, '').trim() || th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const keyIndex = labels.findIndex((label) => /^(PLAYER|TEAM|OWNER|OPPONENT|RECORD|NAME)$/i.test(label));
    const primaryIndex = keyIndex === -1 ? (labels.length > 1 && labels[0] === '#' ? 1 : 0) : keyIndex;
    rows.forEach((tr) => {
      Array.from(tr.cells).forEach((td, idx) => {
        td.dataset.label = labels[idx] || 'STAT';
        if (idx === primaryIndex) td.classList.add('mobile-card-primary');
      });
    });
    wrap.classList.add('v66-mobile-cards');
    wrap.dataset.v66Enhanced = 'yes';
    let visible = CHUNK;
    const controls = document.createElement('div');
    controls.className = 'v66-table-controls';
    const selectLabel = document.createElement('label');
    selectLabel.textContent = 'SORT STATS BY';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Sort statistics by');
    labels.forEach((label, index) => {
      const opt = document.createElement('option');
      opt.value = String(index);
      opt.textContent = label || 'COLUMN ' + (index + 1);
      select.appendChild(opt);
    });
    const sortBy = labels.findIndex((l) => /^(POINTS|TOTAL|WIN %|WINS)$/i.test(l));
    select.value = String(sortBy === -1 ? primaryIndex : sortBy);
    selectLabel.appendChild(select);
    const direction = document.createElement('button');
    direction.type = 'button';
    direction.className = 'v66-sort-direction';
    direction.textContent = '↓ High first';
    direction.setAttribute('aria-label', 'Switch sort order');
    controls.append(selectLabel, direction);
    wrap.prepend(controls);
    const count = document.createElement('small');
    count.className = 'v66-results-count';
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'v66-table-more';
    more.addEventListener('click', () => { visible += CHUNK; paginate(); });
    wrap.append(count, more);

    const paginate = () => {
      if (!isPhone.matches) return;
      const entries = Array.from(table.tBodies[0]?.rows || []);
      entries.forEach((tr, index) => tr.classList.toggle('mobile-hidden', index >= visible));
      count.textContent = entries.length ? `Showing ${Math.min(visible, entries.length)} of ${entries.length} results` : 'No results';
      more.hidden = entries.length <= visible;
      more.textContent = `Show ${Math.min(CHUNK, Math.max(0, entries.length - visible))} more`;
    };
    const applySort = (resetDirection = true) => {
      const th = headings[Number(select.value)];
      if (!th) return;
      const descending = resetDirection ? true : direction.dataset.desc !== 'false';
      direction.dataset.desc = String(descending);
      direction.textContent = descending ? '↓ High first' : '↑ Low first';
      // Reuse the original table's sorting handler; never duplicate sorting rules.
      if (th.onclick) {
        th.dataset.asc = descending ? 'true' : 'false';
        th.click();
      }
      visible = CHUNK;
      paginate();
    };
    select.addEventListener('change', () => applySort(true));
    direction.addEventListener('click', () => {
      direction.dataset.desc = String(direction.dataset.desc !== 'true');
      applySort(false);
    });
    // The existing app binds the headers in setTimeout(0), after rendering.
    setTimeout(() => applySort(true), 0);
    paginate();
  };

  const scan = () => {
    if (!isPhone.matches) return;
    app.querySelectorAll('.table-wrap:not([data-v66-enhanced])').forEach(enhance);
    activeDock();
  };
  let pending = false;
  const schedule = () => {
    if (pending || !isPhone.matches) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; scan(); });
  };
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === 'TR') return false;
      return node.matches?.('.table-wrap, .player-book-section, .control-output, section, main') ||
        !!node.querySelector?.('.table-wrap');
    }))) schedule();
  });
  observer.observe(app, {childList:true, subtree:true});
  window.addEventListener('hashchange', () => { activeDock(); schedule(); });
  isPhone.addEventListener('change', () => { if (isPhone.matches) scan(); });
  activeDock();
  schedule();
})();