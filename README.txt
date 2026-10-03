CHARGE THE LINE — now a Preconnect module.
It lives in its OWN repository named "charge-the-line" (not the root repo), so its address is /charge-the-line/.
GitHub: + New repository -> charge-the-line -> Public -> upload these files -> Settings -> Pages -> main, / (root) -> Save.

CHARGE THE LINE — HOSTING
Upload ALL five files together, in the same folder:
  index.html  manifest.json  sw.js  icon-192.png  icon-512.png

GitHub Pages (free):
 1. github.com -> sign up -> "+" -> New repository -> name it charge-the-line -> Public -> Create
 2. "uploading an existing file" -> drag in all five files -> Commit changes
 3. Settings -> Pages -> Source: Deploy from a branch -> Branch: main, / (root) -> Save
 4. About a minute later the site is at https://YOUR-USERNAME.github.io/charge-the-line/

Updating: upload the new index.html (and sw.js) over the old ones -> Commit.
The link never changes. Bump the version in sw.js each time so phones refresh.

Install on a phone: open the link -> iPhone: Share -> Add to Home Screen
                                   Android: menu -> Install app

TESTS (optional, for whoever maintains the app)
The tests/ folder and TESTING.md can live in the same repository. They don't affect the app.
To run them on a computer with Node.js:  node tests/run_all.js
