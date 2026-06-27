// erosia SW v4539bf2-1782563326904 — generated at build time
const CACHE_NAME = 'erosia-v4539bf2-1782563326904'
const ASSETS_CACHE = 'erosia-v4539bf2-1782563326904-assets'
const STATIC_ASSETS = ['/', '/offline', '/logo.png', '/icone.png', '/manifest.json', '/login', '/register', '/welcome', '/privacy', '/cgu']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(ASSETS_CACHE).then((c) => c.addAll(STATIC_ASSETS.map((u) => new Request(u, { cache: 'reload' })))).catch(() => {})
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== ASSETS_CACHE).map((k) => caches.delete(k)))
      ),
      self.clients.claim(),
    ])
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  if (req.url.includes('/api/')) return
  if (req.url.includes('supabase.co')) return

  if (req.destination === 'document') {
    e.respondWith(staleWhileRevalidate(req))
  } else {
    e.respondWith(cacheFirst(req))
  }
})

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(req)
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone())
    return res
  }).catch(() => cached)
  return cached ?? fetchPromise
}

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(ASSETS_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    const fallback = await caches.match('/offline')
    return fallback ?? new Response('Hors ligne', { status: 503 })
  }
}

self.addEventListener('push', (e) => {
  let data = { title: 'Erosia', body: '', icon: '/logo.png', badge: '/logo.png', url: '/discover' }
  try {
    const parsed = e.data?.json()
    if (parsed) data = { ...data, ...parsed }
  } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/discover'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matching = clients.find((c) => c.url === url && 'focus' in c)
      if (matching) return matching.focus()
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
