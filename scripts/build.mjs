import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
const root = new URL('../', import.meta.url);
const origin = 'https://utn-emlab.danajalobeanu.com';
const pages = [
  { slug: '', title: 'Team & lab', description: 'Meet Dana Jalobeanu and the researchers of the Early Modern Lab at UTN.', sections: ['home', 'people', 'explore'] },
  { slug: 'research', title: 'Research', description: 'Projects on Baconianism, natural magic, and experimental knowledge.', sections: ['research'] },
  { slug: 'publications', title: 'Publications', description: 'Selected books and articles by researchers in the Early Modern Lab.', sections: ['publications'] },
  { slug: 'events', title: 'Seminars & events', description: 'Links to the seminar programme, international meetings, and summer school archives.', sections: ['events'] },
  { slug: 'about', title: 'About the lab', description: 'Our approach to early modern philosophy and the sciences at UTN.', sections: ['about'] },
  { slug: 'contact', title: 'Contact', description: 'Get in touch about research, seminars, and doctoral supervision.', sections: ['contact'] },
  { slug: 'search', title: 'Search the lab', description: 'Find team members, projects, publications, and events.', sections: ['search'] },
];
const layout = await readFile(new URL('templates/layout.html', root), 'utf8');
const revision = createHash('sha256');
for (const file of ['styles.css', 'search.js', 'search-core.js', 'dynamic.js']) revision.update(await readFile(new URL(`public/${file}`, root)));
const version = revision.digest('hex').slice(0, 12);
const index = [], documents = [];
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('public/', root), new URL('dist/', root), { recursive: true });
for (const page of pages) {
  const path = page.slug ? `/${page.slug}/` : '/';
  const sections = await Promise.all(page.sections.map(name => readFile(new URL(`content/${name}.html`, root), 'utf8')));
  const { document } = parseHTML(layout.replace('<!-- PAGE CONTENT -->', sections.join('\n')));
  document.title = `${page.title} · Early Modern Lab · UTN`;
  document.querySelector('meta[name="description"]').setAttribute('content', page.description);
  document.querySelector('link[rel="canonical"]').href = origin + path;
  document.body.setAttribute('data-page', page.slug || 'home');
  for (const n of document.querySelectorAll('[href="/styles.css"], [src="/search.js"], [src="/dynamic.js"]')) {
    const attr = n.hasAttribute('href') ? 'href' : 'src'; n.setAttribute(attr, `${n.getAttribute(attr)}?v=${version}`);
  }
  for (const link of document.querySelectorAll('nav a')) if (link.getAttribute('href') === path) link.setAttribute('aria-current', 'page');
  const main = document.querySelector('main');
  if (page.slug) {
    const crumb = document.createElement('nav'); crumb.className = 'breadcrumbs wrap'; crumb.setAttribute('aria-label', 'Breadcrumb');
    const home = document.createElement('a'); home.href = '/'; home.textContent = 'Home';
    const current = document.createElement('span'); current.textContent = page.title;
    crumb.append(home, ' / ', current); main.prepend(crumb);
    if (!main.querySelector('h1')) {
      const h = main.querySelector('h2'), h1 = document.createElement('h1'); h1.innerHTML = h.innerHTML; h1.id = h.id; h.replaceWith(h1);
    }
  }
  const ids = new Set([...document.querySelectorAll('[id]')].map(n => n.id));
  for (const article of main.querySelectorAll('article')) {
    const heading = article.querySelector('h2,h3,h4'); if (!heading) continue;
    if (!article.id) {
      const base = slugify(text(heading)) || 'entry'; let id = base, i = 2;
      while (ids.has(id)) id = `${base}-${i++}`;
      article.id = id; ids.add(id);
    }
    index.push({ title: text(heading), category: page.title, url: `${path}#${article.id}`, text: text(article) });
  }
  if (page.slug !== 'search') index.push({ title: page.title, category: 'Page', url: path, text: `${page.description} ${text(main)}` });
  documents.push({ page, document });
}
for (const { page, document } of documents) {
  if (page.slug === 'search') for (const entry of pages.filter(p => p.slug !== 'search')) {
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = entry.slug ? `/${entry.slug}/` : '/'; a.textContent = entry.title; li.append(a); document.querySelector('#browse-pages').append(li);
  }
  const directory = new URL(`dist/${page.slug ? `${page.slug}/` : ''}`, root);
  await mkdir(directory, { recursive: true }); await writeFile(new URL('index.html', directory), document.toString());
}
await writeFile(new URL('dist/search-index.json', root), JSON.stringify(index));
await writeFile(new URL('dist/sitemap.xml', root), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(p => p.slug !== 'search').map(p => `<url><loc>${origin}/${p.slug ? `${p.slug}/` : ''}</loc></url>`).join('')}</urlset>`);
await cp(new URL('worker.js', root), new URL('dist/_worker.js', root));
await cp(new URL('EDITING.html', root), new URL('dist/editing.html', root));
await writeFile(new URL('dist/_routes.json', root), JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
console.log(`Built ${pages.length} pages and ${index.length} searchable entries.`);
