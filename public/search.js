import { searchEntries } from './search-core.js';
const dialog = document.querySelector('.search-dialog');
const panels = [...document.querySelectorAll('[data-search-panel]')];
let entries = null, loading = null, failed = false, returnFocus;
const node = (tag, text, className) => { const n = document.createElement(tag); n.textContent = text; if (className) n.className = className; return n; };
document.querySelectorAll('[data-shortcut]').forEach(n => { n.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'; });
function render(panel) {
  const input = panel.querySelector('[data-search-input]'), list = panel.querySelector('[data-search-results]'), status = panel.querySelector('[data-search-status]');
  list.replaceChildren();
  if (!entries) {
    status.textContent = failed ? 'Search could not load. Browse using the navigation, or retry below.' : 'Loading search…';
    if (failed) { const button = node('button', 'Retry search', 'search-retry'); button.onclick = () => load(); const li = node('li', ''); li.append(button); list.append(li); }
    return;
  }
  const results = searchEntries(entries, input.value);
  status.textContent = !input.value.trim() ? 'Explore the website, or type to search.' : results.length ? `${results.length === 20 ? 'Top ' : ''}${results.length} result${results.length === 1 ? '' : 's'}` : 'No results. Try a name, a shorter phrase, or a topic such as Bacon.';
  for (const result of results) {
    const a = node('a', ''); a.href = result.url;
    a.append(node('span', result.category, 'result-category'), node('strong', result.title));
    const summary = result.text.replace(/\s+/g, ' ').trim();
    a.append(node('span', summary.length > 145 ? summary.slice(0, 145) + '…' : summary, 'result-summary'));
    a.addEventListener('click', () => { if (dialog.open) dialog.close(); });
    const li = node('li', ''); li.append(a); list.append(li);
  }
}
const renderAll = () => panels.forEach(render);
async function load() {
  if (entries || loading) { renderAll(); return loading; }
  failed = false; renderAll();
  loading = (async () => {
    try {
      const response = await fetch('/search-index.json', { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Index unavailable');
      const data = await response.json(); if (!Array.isArray(data)) throw new Error('Invalid index');
      entries = data; renderAll();
      // Live results are optional and never delay searching HTML content.
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      await Promise.allSettled(['announcements'].map(async kind => {
        const response = await fetch(`/api/${kind}`, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return;
        const data = await response.json(); if (!Array.isArray(data.items)) return;
        const items = data.items.filter(item => (!item.date || item.date <= today) && (!item.expires || item.expires >= today));
        entries.push(...items.map(item => ({ title: item.title, category: 'Notice', text: [item.speaker, item.date, item.summary].filter(Boolean).join(' · '), url: '/events/#announcements' })));
        panels.filter(p => !p.querySelector('[data-search-results]').contains(document.activeElement)).forEach(render);
      }));
    } catch { failed = true; renderAll(); }
    finally { loading = null; }
  })();
  return loading;
}
function openSearch() {
  if (dialog.open) return;
  returnFocus = document.activeElement; dialog.showModal(); document.body.classList.add('search-open');
  dialog.querySelector('input').focus(); load();
}
document.querySelectorAll('[data-open-search]').forEach(a => a.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); openSearch();
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && dialog.open) { event.preventDefault(); dialog.close(); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey) {
    event.preventDefault(); if (dialog.open) dialog.querySelector('input').focus(); else openSearch();
  }
});
dialog.querySelector('[data-close-search]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }
});
dialog.addEventListener('close', () => { document.body.classList.remove('search-open'); returnFocus?.focus(); });
for (const panel of panels) {
  const input = panel.querySelector('input'); input.addEventListener('input', () => render(panel));
  panel.addEventListener('keydown', event => {
    const links = [...panel.querySelectorAll('[data-search-results] a')], current = links.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' && links.length) { event.preventDefault(); links[(current + 1) % links.length].focus(); }
    if (event.key === 'ArrowUp' && links.length) { event.preventDefault(); if (current === 0) input.focus(); else links[current < 0 ? links.length - 1 : current - 1].focus(); }
    if (event.key === 'Enter' && event.target === input && links.length) { event.preventDefault(); links[0].click(); }
  });
}
if (document.querySelector('.search-page')) load();
function resolveLegacyBookmark() {
  if (location.pathname === '/' && ['research', 'publications', 'events', 'contact', 'about'].includes(location.hash.slice(1))) location.replace(`/${location.hash.slice(1)}/`);
}
window.addEventListener('hashchange', resolveLegacyBookmark);
resolveLegacyBookmark();
