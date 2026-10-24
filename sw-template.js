/* My Mammutmarsch Diary service worker: offline support after first visit. */
const CACHE = 'mammut-__VERSION__'
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)))
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    // Network first for the page so updates arrive, cache fallback when offline.
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put('index.html', copy)).catch(() => undefined)
        return res
      }).catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    )
    return
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined) }
      return res
    }))
  )
})
