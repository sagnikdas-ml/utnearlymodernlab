// Dynamic content lives here; permanent page content stays in content/*.html.
const el = (tag, text, className) => {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className;
  return node;
};
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
async function getFeed(kind) {
  const response = await fetch(`/api/${kind}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Feed unavailable');
  const data = await response.json();
  if (!Array.isArray(data.items)) throw new Error('Invalid feed');
  return data;
}
async function announcements() {
  const panel = document.querySelector('#announcement-feed'); if (!panel) return;
  try {
    const data = await getFeed('announcements');
    const items = data.items.filter(item => (!item.date || item.date <= today) && (!item.expires || item.expires >= today))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    if (!items.length) return;
    panel.replaceChildren();
    for (const item of items) {
      const article = el('article', ''); article.append(el('h4', item.title), el('p', item.summary));
      if (/^https?:\/\//i.test(item.link)) { const a = el('a', 'Read more ↗'); a.href = item.link; article.append(a); }
      panel.append(article);
    }
    if (data.stale) panel.append(el('p', 'Showing the last available notices.'));
    document.querySelector('#announcements').hidden = false;
  } catch { /* Optional notices must never prevent the rest of the page loading. */ }
}
announcements();
