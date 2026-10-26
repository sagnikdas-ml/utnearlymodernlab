# Early Modern Lab website

This repository contains the source for the Early Modern Lab website at UTN. The site is built from small HTML content files and static assets, then published to Cloudflare Pages.

## Edit the website

You can edit the files in any text editor. If you are new to the project, start with [`EDITING.html`](EDITING.html), which includes examples for common content changes.

| What you want to change | Source file(s) |
| --- | --- |
| Homepage introduction | `content/home.html` |
| Team and biographies | `content/people.html` |
| Research projects | `content/research.html` |
| Publications | `content/publications.html` |
| Events and seminar link | `content/events.html` |
| Past events and event pages | `content/events-archive.html`, `content/event-*.html` |
| About and contact pages | `content/about.html`, `content/contact.html` |
| Homepage exploration links | `content/explore.html` |
| Shared page structure and navigation | `templates/layout.html` |
| Styling | `public/styles.css` |
| Images and other static assets | `public/` |

The site builder combines the content files with the shared layout and generates the pages and search index. Edit the source files above, not the generated `dist/` folder. Future seminar listings are maintained at [seminars.danajalobeanu.com](https://seminars.danajalobeanu.com/); this website links to that service.

### Preview changes locally

Install [Node.js](https://nodejs.org/) (npm is included), then from the repository folder run:

```sh
npm install
npm run dev
```

Open the local address printed by Wrangler, usually `http://localhost:8788`. The preview serves the built site and its `/api/*` Worker routes. After editing source files, stop and restart `npm run dev` to rebuild the site.

To create the production files without starting a preview, run:

```sh
npm run build
```

The generated site is written to `dist/`. `npm run check` builds the site and runs the repository's code and content checks.

## Deploy with Cloudflare Pages

There are two ways to deploy. For a maintained site, connect the Git repository so Cloudflare builds each change. The command-line option is useful for an initial deployment or a manual upload.

### Recommended: connect the repository to Pages

1. Push this repository to a Git provider supported by Cloudflare Pages, such as GitHub or GitLab.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Workers & Pages** and create a Pages project connected to that repository.
3. Choose the production branch (commonly `main`). Set the build command to `npm run build` and the build output directory to `dist`. The project does not need a framework preset.
4. Save and deploy. Cloudflare will install the dependencies from `package-lock.json`, build the site, and publish it. Each subsequent push to the production branch triggers a production deployment; other branches can be used for preview deployments.
5. In the Pages project's **Custom domains** settings, add `utn-emlab.danajalobeanu.com` and follow the DNS instructions Cloudflare shows. The domain must be configured in Cloudflare DNS (or pointed to the nameservers Cloudflare specifies) for the custom domain to become active.

The build copies `worker.js` to `dist/_worker.js` and writes a Pages routing file for `/api/*`. Cloudflare Pages therefore runs the Worker for API paths and serves the remaining pages and assets as static files. Keep these generated files in the build output; do not upload only the source `public/` directory.

### Deploy from the command line

Install dependencies and authenticate Wrangler with the Cloudflare account that owns the Pages project:

```sh
npm install
npx wrangler login
npm run build
npx wrangler pages deploy dist --project-name utn-early-modern-lab
```

Create a Pages project named `utn-early-modern-lab` in the Cloudflare dashboard first if it does not exist. The repository's `npm run deploy` script builds and deploys `dist/` using Wrangler; it uses the project name in `wrangler.toml`. You need access to the Cloudflare account and project to publish.

### Optional announcements feed

The announcements panel is optional. To enable it, configure `ANNOUNCEMENTS_FEED_URL` as a Pages environment variable for the production environment (and preview, if desired). Set it to the public CSV export URL of a Google Sheets tab with the columns `title,summary,link,date,expires,published`. See [`EDITING.html`](EDITING.html) for the expected row values and privacy considerations. Do not put private data in the sheet: the source CSV is public.

## Project map

- `content/` — editable page sections in HTML.
- `templates/layout.html` — shared document shell and navigation.
- `public/` — styles, scripts, images, and other static files copied to the build.
- `scripts/build.mjs` — assembles pages, generates the search index, and prepares the Pages Worker output.
- `worker.js` — read-only API proxy for optional announcement data; static pages are not served through this Worker.
- `dist/` — generated deployment output; ignored by Git and rebuilt for each deploy.

## Useful commands

```sh
npm run dev       # Build and preview locally with Wrangler
npm run build     # Generate the Cloudflare Pages output in dist/
npm run check     # Build and run code/content checks
npm run deploy    # Build and deploy using Wrangler
npm run test:browser  # Run browser checks with Playwright
```
