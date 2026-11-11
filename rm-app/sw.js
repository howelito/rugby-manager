// Offline support. Bump VERSION whenever index.html changes so installed copies update.
var VERSION = 'rm-v11';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Network first so new versions arrive; fall back to the cached copy when offline.
  e.respondWith(fetch(e.request).then(function (r) { if (r.ok && new URL(e.request.url).origin === location.origin) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); } return r; }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match('index.html'); }); }));
});
