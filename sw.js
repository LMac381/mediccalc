// Offline cache for Medic Pocket Calc.
// Bump VERSION with every release: that's what makes the "Update ready" banner appear on the phone.
const VERSION = "mpc-v2";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  // cache: "reload" skips the browser's HTTP cache so a new release never saves a stale file.
  // The new version takes over the background cache straight away. The open page keeps running
  // untouched; the page shows an "Update ready" banner and only reloads when you tap it.
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return; // app uses no outside files

  // The page: answer from the saved copy at once, refresh the saved copy in the background.
  if (req.mode === "navigate") {
    const net = fetch(req).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); }
      return r;
    });
    e.waitUntil(net.then(() => {}, () => {}));
    e.respondWith(caches.match("index.html").then(hit => hit || net).catch(() => caches.match("./")));
    return;
  }

  // Icons and manifest: saved copy first, then network.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
