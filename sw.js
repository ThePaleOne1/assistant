/* ============================================================
   sw.js — service worker
   ------------------------------------------------------------
   Caches the app shell so it opens instantly and works with no
   signal. Bump CACHE when you change any of the app files.

   Deliberately does NOT touch Supabase or ntfy requests — those
   always go straight to the network so data is never stale.
   ============================================================ */

var CACHE = 'assistant-v2';

var SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './sb.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL).catch(function (err) {
        console.warn('[sw] shell cache incomplete', err);
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Never cache API traffic.
  if (url.hostname.indexOf('supabase.co') >= 0 || url.hostname.indexOf('ntfy.sh') >= 0) return;

  // The Supabase client library: cache it after the first successful load
  // so the app still syncs on a later offline-then-online session.
  if (req.url === LIB || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return fetch(req).then(function (res) {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () {
          return c.match(req);
        });
      })
    );
    return;
  }

  // App shell: network first, falling back to the cache.
  //
  // The other way round (cache first, refresh in the background) loads a
  // fraction faster but shows you yesterday's version once after every
  // update, which is baffling when you've just changed something. This way
  // you always get the current app when you have signal, and the cached one
  // when you don't. The files are small, so the difference isn't felt.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          // a deep link opened offline still needs the app shell
          return hit || caches.match('./index.html') || caches.match('./');
        });
      })
    );
  }
});
