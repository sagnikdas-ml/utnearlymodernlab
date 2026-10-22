// Only /api/* reaches this Worker. All persistent content is static HTML.
const FRESH_SECONDS = 300;
const RETAIN_SECONDS = 3600;
const MAX_FEED_BYTES = 1024 * 1024;

export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      row.push(field); rows.push(row); row = []; field = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = (rows.shift() || []).map(h => h.trim().toLowerCase());
  if (!headers.includes('title')) throw new Error('Missing title column');
  return rows.filter(r => r.some(v => v.trim())).map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
}
export function safeUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function publicRecords(rows, kind) {
  return rows.filter(r => r.title && ['', 'yes', 'true', '1'].includes((r.published || '').toLowerCase()))
    .filter(r => kind !== 'seminars' || validDate(r.date))
    .filter(r => kind !== 'announcements' || ((!r.date || validDate(r.date)) && (!r.expires || validDate(r.expires))))
    .map(r => kind === 'seminars' ? {
      title: r.title, date: r.date, speaker: r.speaker || '', time: r.time || '',
      timezone: r.timezone || 'Europe/Berlin', venue: r.venue || '',
    } : { title: r.title, date: r.date || '', expires: r.expires || '', summary: r.summary || '', link: safeUrl(r.link) });
}
function json(data, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': cache,
    'x-content-type-options': 'nosniff',
  } });
}
async function readLimited(response) {
  if (!response.body) throw new Error('Empty feed');
  const reader = response.body.getReader(); const chunks = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_FEED_BYTES) { await reader.cancel(); throw new Error('Feed too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(result);
}
export async function handleFeed(request, env, ctx, cache, fetcher = fetch) {
  const path = new URL(request.url).pathname;
  const kind = path === '/api/announcements' ? 'announcements' : null;
  if (!kind) return json({ error: 'Not found' }, 404);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const source = env.ANNOUNCEMENTS_FEED_URL;
  if (!source) return json({ configured: false, items: [] });
  // Include the configured source in the internal key so changing Sheets cannot reuse old content.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const sourceKey = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const key = new Request(`${new URL(request.url).origin}${path}?source=${sourceKey}`);
  let previous = null;
  try { const match = await cache?.match(key); if (match) previous = await match.json(); } catch { /* Cache is optional. */ }
  const age = previous ? (Date.now() - Date.parse(previous.updatedAt)) / 1000 : Infinity;
  async function refresh() {
    const upstream = await fetcher(source, { headers: { accept: 'text/csv' }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!upstream.ok) throw new Error('Feed unavailable');
    const items = publicRecords(parseCsv(await readLimited(upstream)), kind);
    const data = { configured: true, items, updatedAt: new Date().toISOString() };
    try { await cache?.put(key, json(data, 200, `public, max-age=${RETAIN_SECONDS}`)); } catch { /* Serve fresh content even if cache fails. */ }
    return data;
  }
  let data;
  if (age < FRESH_SECONDS) data = { ...previous, stale: false };
  else if (age < RETAIN_SECONDS) {
    data = { ...previous, stale: true };
    ctx.waitUntil(refresh().catch(() => {}));
  } else {
    try { data = { ...await refresh(), stale: false }; }
    catch { return json({ error: 'Live updates are temporarily unavailable.' }, 503); }
  }
  const response = json(data, 200, data.stale ? 'no-store' : 'public, max-age=60');
  return request.method === 'HEAD' ? new Response(null, response) : response;
}
export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleFeed(request, env, ctx, caches.default);
    return env.ASSETS.fetch(request);
  },
};
