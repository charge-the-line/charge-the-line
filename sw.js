// Bump CACHE when you upload a new version so phones pick it up.
const CACHE = 'charge-the-line-v2.19.1';
const CORE = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'fonts/atkinson-hyperlegible-latin-400-normal.woff2', 'fonts/atkinson-hyperlegible-latin-700-normal.woff2', 'fonts/saira-condensed-latin-500-normal.woff2', 'fonts/saira-condensed-latin-600-normal.woff2', 'fonts/saira-condensed-latin-700-normal.woff2', 'preconnect-core.js'];
// How long to wait for the network before serving the saved copy. Airplane mode fails at once; one bar
// of signal can hang for a minute, and the whole app is already on the phone.
const NET_WAIT = 3500;
self.addEventListener('install', e => {
  // cache:'reload' skips the browser's own HTTP cache, so a fresh install never stores a stale file.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('charge-the-line-v') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first with a short wait, then the saved copy. A good answer (2xx) refreshes the saved copy even
// when it arrives after the wait; a bad answer (404, 500) is never saved and the saved copy is served instead.
let fellBack = 0;   // when the page last had to come from the saved copy, so the core follows it without a second wait
function netFirst(req, key) {
  let real = null;
  const net = fetch(req).then(r => { real = r; if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); return r; } return null; }).catch(() => null);
  const wait = new Promise(res => setTimeout(res, NET_WAIT, null));
  return Promise.race([net, wait]).then(r => { if (!r) fellBack = Date.now(); return r || caches.match(key).then(hit => hit || net.then(x => x || real || Response.error())); });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Anonymous statistics must always reach the network — never cache them (each count is unique).
  const u = new URL(req.url);
  if (/(^|\.)goatcounter\.com$|(^|\.)zgo\.at$/.test(u.hostname)) return;
  if (u.origin !== self.location.origin) return;
  // The page and the shared core travel together: both network first, so a new page never runs on an
  // old core (the first launch after an update used to do exactly that).
  if (req.mode === 'navigate') { e.respondWith(netFirst(req, 'index.html')); return; }
  if (/\/preconnect-core\.js$/.test(u.pathname)) { e.respondWith(Date.now() - fellBack < 10000 ? caches.match('preconnect-core.js').then(hit => hit || netFirst(req, 'preconnect-core.js')) : netFirst(req, 'preconnect-core.js')); return; }
  // Everything else (icons, fonts): cache first, then network.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
