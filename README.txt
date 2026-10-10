CHARGE THE LINE — a Preconnect module (https://charge-the-line.github.io/charge-the-line/)
This folder is the whole app:
  index.html, preconnect-core.js, manifest.json, sw.js, icon-192.png, icon-512.png, fonts/
(plus tests/, TESTING.md and CLAUDE.md, which do not affect the app).
Every one of those files must be uploaded together: the page loads preconnect-core.js first, and the type comes from fonts/.

GitHub Pages serves the main branch root of the charge-the-line/charge-the-line repository. Committing to main deploys within a minute or two.
This repository shares the account's name, so a root README.md would show on the public profile: keep it README.txt.
Every release bumps APP_VERSION in index.html, the two version literals on the intro and menu, and CACHE in sw.js together; the "Current version" line in CLAUDE.md must match (the tests check all of them).

Install on a phone: open the link -> iPhone: Share -> Add to Home Screen; Android: menu -> Install app.
Tests (Node.js 18 or newer): node tests/run_all.js
