self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

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
