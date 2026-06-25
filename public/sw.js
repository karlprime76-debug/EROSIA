const CACHE = 'erosia-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      fetch(event.request).then((res) => {
        cache.put(event.request, res.clone())
        return res
      }).catch(() => cache.match(event.request))
    )
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    const title = data.title || 'Erosia'
    const options = {
      body: data.body || '',
      icon: data.icon || '/logo.png',
      badge: '/favicon.png',
      data: { url: data.url || '/' },
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (e) {
    console.error('Push notification error:', e)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
