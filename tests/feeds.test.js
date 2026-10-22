import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, publicRecords, handleFeed, validDate } from '../worker.js';
const source = 'https://example.org/feed.csv';
const request = () => new Request('https://lab.example/api/announcements');
const csv = 'date,title,speaker,published\n2026-11-04,A talk,A researcher,yes';
function memoryCache() {
  const entries = new Map();
  return { match: async key => entries.get(key.url)?.clone(), put: async (key, value) => entries.set(key.url, value.clone()) };
}
test('CSV handles quoted commas, newlines, escaped quotes, BOM and CRLF', () => {
  const rows = parseCsv('\uFEFFtitle,summary\r\n"A, B","Line 1\nLine ""2"""\r\n');
  assert.deepEqual(rows, [{ title: 'A, B', summary: 'Line 1\nLine "2"' }]);
  assert.throws(() => parseCsv('title\n"unclosed'));
  assert.throws(() => parseCsv('<html>Sign in</html>'));
});
test('Public data excludes drafts, invalid dates, secret fields and dangerous links', () => {
  const rows = [{ title: 'Public', date: '2026-11-04', private_note: 'secret', published: 'yes' }, { title: 'Draft', date: '2026-11-05', published: 'no' }, { title: 'Invalid', date: '2026-02-30' }];
  const records = publicRecords(rows, 'seminars');
  assert.equal(records.length, 1); assert.equal(records[0].private_note, undefined);
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(publicRecords([{ title: 'Notice', link: 'javascript:alert(1)' }], 'announcements')[0].link, '');
});
test('Repeated public requests share a cache and ignore caller query parameters', async () => {
  const cache = memoryCache(); let calls = 0;
  const fetcher = async () => { calls++; return new Response(csv); };
  const env = { ANNOUNCEMENTS_FEED_URL: source };
  await handleFeed(request(), env, {}, cache, fetcher);
  const second = await handleFeed(new Request('https://lab.example/api/announcements?bust=1'), env, {}, cache, fetcher);
  assert.equal(calls, 1); assert.equal((await second.json()).items.length, 1);
  await handleFeed(request(), { ANNOUNCEMENTS_FEED_URL: `${source}?new-sheet` }, {}, cache, fetcher);
  assert.equal(calls, 2);
});
test('Older cached content survives an upstream outage and refreshes in the background', async () => {
  const cached = { configured: true, items: [{ title: 'Saved talk' }], updatedAt: new Date(Date.now() - 600000).toISOString() };
  const cache = { match: async () => new Response(JSON.stringify(cached)) }; const pending = [];
  const response = await handleFeed(request(), { ANNOUNCEMENTS_FEED_URL: source }, { waitUntil: p => pending.push(p) }, cache, async () => { throw new Error('offline'); });
  const data = await response.json(); assert.equal(data.stale, true); assert.equal(data.items[0].title, 'Saved talk');
  assert.equal(response.headers.get('cache-control'), 'no-store'); await Promise.all(pending);
});
test('Cold-cache outages fail cleanly and optional unconfigured notices stay empty', async () => {
  const failed = await handleFeed(request(), { ANNOUNCEMENTS_FEED_URL: source }, {}, memoryCache(), async () => new Response('Failure', { status: 500 }));
  assert.equal(failed.status, 503);
  const notices = await handleFeed(new Request('https://lab.example/api/announcements'), {}, {}, memoryCache());
  assert.deepEqual(await notices.json(), { configured: false, items: [] });
});
test('Feed endpoints are read-only, support HEAD, and reject oversized feeds', async () => {
  assert.equal((await handleFeed(new Request(request(), { method: 'POST' }), {}, {}, memoryCache())).status, 405);
  const head = await handleFeed(new Request(request(), { method: 'HEAD' }), { ANNOUNCEMENTS_FEED_URL: source }, {}, memoryCache(), async () => new Response(csv));
  assert.equal(await head.text(), '');
  const large = await handleFeed(request(), { ANNOUNCEMENTS_FEED_URL: source }, {}, memoryCache(), async () => new Response('title\n' + 'x'.repeat(1024 * 1024)));
  assert.equal(large.status, 503);
});
