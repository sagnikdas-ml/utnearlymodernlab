EARLY MODERN LAB

Start with EDITING.html (open it in a browser). It explains content editing with copy-and-paste examples.

Architecture
  content/*.html       Permanent content, edited by humans
  templates/layout.html Shared page structure
  public/              CSS, dynamic panel script, manuscript asset
  worker.js            Read-only feed proxy, CSV validation, edge cache
  scripts/build.mjs    Builds separate pages and an automatic search index
  dist/                Generated deployment output; never edit here

Setup: npm install
Checks: npm run check
Build: npm run build
Preview: npm run dev (restart after source changes)

Deploy using a NEW Cloudflare Pages project named utn-early-modern-lab.
Connect this repository, build command npm run build, output directory dist.
Or run npm run deploy after Cloudflare authentication and project setup.
Add utn-emlab.danajalobeanu.com under Pages Custom domains and follow the DNS instructions there.
CNAME records point to the assigned project.pages.dev hostname; the bundled CNAME file is only a declaration of the intended domain and does not configure DNS.

All future seminars live at https://seminars.danajalobeanu.com/. The lab site links there and does not fetch or duplicate seminar listings.
Do not copy the existing site's credentials or change its deployment.
Optional announcements: configure ANNOUNCEMENTS_FEED_URL to a public Google Sheets CSV export with columns title,summary,link,date,expires,published.
Seminars retain their existing professor editor. Notices use Sheets directly. There is no new write endpoint or database.
Only /api/* runs through the Worker. Other pages/assets use Pages static hosting.

Cache: 5 minutes fresh; up to 1 hour retained for background revalidation/outages.
Cache is local to a Cloudflare location and may be evicted; it is not a durable backup.
Browsers cache successful fresh API responses for 60 seconds. Stale responses are not browser-cached.
Static HTML revalidates; CSS/JS cache for an hour; images for a day. Rename assets when replacing them if immediate refresh is needed.
Feed reads have a 10-second timeout and a 1 MB cap. Long-term archives belong in HTML, not the live feed.
Public APIs expose only public display fields; source Sheets remain public including unpublished rows.

Initial content sources (reviewed 21 October 2026):
https://www.utn.de/en/departments/department-liberal-arts-and-social-sciences/early-modern/
https://www.utn.de/person/dr-rodolfo-garau/
https://www.utn.de/person/andrei-catalin-bunaciu/
https://danajalobeanu.com/
Visual reference: existing Philosophy-Seminars-Site project.
Structure reference: https://utndatasystems.github.io/
Manuscript copied from the existing project; Cambridge University Library attribution and CC BY-NC 4.0 retained in footer.

Publishing requires Cloudflare project/account access and DNS configuration. No production deployment is created by building this folder.

Pages: / (people), /research/, /publications/, /events/, /about/, /contact/, /search/.
Search: Ctrl+K or Cmd+K; automatic HTML index plus optional lab notices.
Browser checks: npm run test:browser (uses installed Microsoft Edge).

Team portraits: downloaded from the official UTN profiles on 22 October 2026.
Andrei: https://www.utn.de/files/2026/06/Andrei-Catalin-Bunaciu_47076_c-eye-d-Photodesign-w-240x320.jpg (source filename credits eye-d Photodesign).
Rodolfo: https://www.utn.de/files/2026/03/Rodolfo-Garau-2-240x320.jpg
Portraits are framed using CSS object-fit; original image files are preserved.

Dana portrait: https://www.utn.de/files/2025/05/TU_Nuernberg_Prof_Daniela-Jalobeanu-w-240x320.jpg (official UTN portrait, added 22 October 2026).

Current Andrei and Rodolfo portraits use the user-supplied public/personnel/andrei.jpg and public/personnel/rudi.JPG. These replace the previously downloaded UTN images in the team cards. Andrei uses a CSS zoomed crop; original files remain unchanged.
