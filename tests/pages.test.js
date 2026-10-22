import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { searchEntries } from '../public/search-core.js';
const routes = ['/', '/research/', '/publications/', '/events/', '/about/', '/contact/', '/search/'];
const docs = new Map(await Promise.all(routes.map(async path => [path, parseHTML(await readFile(new URL(`../dist${path}index.html`, import.meta.url), 'utf8')).document])));
test('All pages have one main heading, active navigation, unique IDs and working internal links', () => {
  for (const [path, document] of docs) {
    assert.equal(document.querySelectorAll('main h1').length, 1, path);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(ids.length, new Set(ids).size, path);
    if (path !== '/search/') assert.equal(document.querySelector('nav[aria-label="Main navigation"] [aria-current="page"]').getAttribute('href'), path);
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
