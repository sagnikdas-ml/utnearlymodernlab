import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { searchEntries } from '../public/search-core.js';
const routes = ['/', '/research/', '/publications/', '/events/', '/events/archive/', '/events/princeton-bucharest-nuremberg-2026/', '/events/rome-nuremberg-oxford-2026/', '/events/francis-bacon-2026/', '/about/', '/contact/', '/search/'];
const docs = new Map(await Promise.all(routes.map(async path => [path, parseHTML(await readFile(new URL(`../dist${path}index.html`, import.meta.url), 'utf8')).document])));
test('All pages have one main heading, active navigation, unique IDs and working internal links', () => {
  for (const [path, document] of docs) {
    assert.equal(document.querySelectorAll('main h1').length, 1, path);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(ids.length, new Set(ids).size, path);
    if (path !== '/search/') {
      const current = document.querySelector('nav[aria-label="Main navigation"] [aria-current="page"]');
      assert.ok(current, `${path}: active navigation item missing`);
      assert.equal(current.getAttribute('href'), path.startsWith('/events/') ? '/events/' : path);
    }
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (!href.startsWith('/') && !href.startsWith('#')) continue;
      const u = new URL(href, `https://lab.example${path}`);
      if (u.pathname === '/editing.html') continue;
      assert.ok(docs.has(u.pathname), href);
      if (u.hash) assert.ok(docs.get(u.pathname).getElementById(u.hash.slice(1)), `${path}: ${href}`);
    }
  }
});
test('Homepage introduces people and keeps detailed research on its own page', () => {
  assert.ok(docs.get('/').querySelector('#people'));
  assert.equal(docs.get('/').querySelector('#research'), null);
  assert.ok(docs.get('/research/').querySelector('#research'));
});
test('Major event archive and event detail pages include sourced facts and no phone numbers', () => {
  const archive = docs.get('/events/archive/').body.textContent;
  assert.match(archive, /Princeton Bucharest Nuremberg Seminar/);
  assert.match(archive, /Rome–Nuremberg–Oxford/);
  assert.match(archive, /Francis Bacon, 1626–2026/);
  assert.match(docs.get('/events/princeton-bucharest-nuremberg-2026/').body.textContent, /5–10 July 2026/);
  assert.match(docs.get('/events/rome-nuremberg-oxford-2026/').body.textContent, /22–25 September 2026/);
  assert.match(docs.get('/events/francis-bacon-2026/').body.textContent, /12–13 June 2026/);
  for (const document of docs.values()) {
    assert.doesNotMatch(document.body.textContent, /\+\d[\d\s()-]{8,}/);
    assert.doesNotMatch(document.body.textContent, /\b\d{3,4}[\s-]\d{5,}\b/);
  }
});
test('Events direct all future listings to the separate seminar website; contact shows group email', () => {
  const events = docs.get('/events/');
  assert.match(events.body.textContent, /All future event and seminar listings/);
  assert.ok([...events.querySelectorAll('a[href]')].some(a => a.href === 'https://seminars.danajalobeanu.com/'));
  assert.match(docs.get('/contact/').body.textContent, /earlymodern@utn\.de/);
  assert.match(docs.get('/').body.textContent, /Professor of History of Philosophy/);
});
test('Every generated search result points to a real page or entry', async () => {
  const entries = JSON.parse(await readFile(new URL('../dist/search-index.json', import.meta.url)));
  for (const entry of entries) {
    const u = new URL(entry.url, 'https://lab.example'); assert.ok(docs.has(u.pathname));
    if (u.hash) assert.ok(docs.get(u.pathname).getElementById(u.hash.slice(1)));
  }
  assert.match(searchEntries(entries, 'Henry Power')[0].url, /^\/research\/#/);
  assert.match(searchEntries(entries, 'Dana Jalobeanu')[0].url, /^\/#/);
  assert.equal(searchEntries(entries, 'qzxqzxqzx').length, 0);
});
test('Search supports accents, punctuation, multiple words and ranks titles first', () => {
  const entries = [{ title: 'Other', category: 'Page', url: '/', text: 'René Descartes' }, { title: 'René Descartes', category: 'Research', url: '/research/', text: 'Philosophy' }];
  assert.equal(searchEntries(entries, 'rene descartes')[0].url, '/research/');
  assert.equal(searchEntries(entries, 'rene philosophy').length, 1);
  assert.equal(searchEntries(entries, '   ').length, 1);
});
