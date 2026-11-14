// Offline support. Bump VERSION whenever index.html changes so installed copies update.
var VERSION = 'rm-v27';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
var AUDIO = ["audio/kickoff1.mp3", "audio/kickoff2.mp3", "audio/try1.mp3", "audio/try2.mp3", "audio/try3.mp3", "audio/try4.mp3", "audio/try5.mp3", "audio/try6.mp3", "audio/maultry1.mp3", "audio/maultry2.mp3", "audio/hattrick1.mp3", "audio/conv1.mp3", "audio/conv2.mp3", "audio/conv3.mp3", "audio/convmiss1.mp3", "audio/convmiss2.mp3", "audio/pen1.mp3", "audio/pen2.mp3", "audio/penmiss1.mp3", "audio/penmiss2.mp3", "audio/drop1.mp3", "audio/yellow1.mp3", "audio/yellow2.mp3", "audio/red1.mp3", "audio/injury1.mp3", "audio/injury2.mp3", "audio/break1.mp3", "audio/break2.mp3", "audio/break3.mp3", "audio/knockon1.mp3", "audio/knockon2.mp3", "audio/tackle1.mp3", "audio/tackle2.mp3", "audio/tackle3.mp3", "audio/turnover1.mp3", "audio/turnover2.mp3", "audio/scrum1.mp3", "audio/scrum2.mp3", "audio/lineout1.mp3", "audio/lineout2.mp3", "audio/ht1.mp3", "audio/ht2.mp3", "audio/ft1.mp3", "audio/ft2.mp3"];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL).then(function () { return Promise.all(AUDIO.map(function (u) { return c.add(u).catch(function () {}); })); }); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Network first so new versions arrive; fall back to the cached copy when offline.
  e.respondWith(fetch(e.request).then(function (r) { if (r.ok && new URL(e.request.url).origin === location.origin) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); } return r; }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match('index.html'); }); }));
});
