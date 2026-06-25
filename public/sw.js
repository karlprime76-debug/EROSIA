self.addEventListener('push', function (event) {
  if (!event.data) return
  try {
    const data = event.data.json()
    const title = data.title || 'Erosia'
    const options = {
      body: data.body || '',
      icon: data.icon || '/logo.png',
      badge: data.badge || '/favicon.png',
      data: { url: data.url || '/' },
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (e) {
    console.error('Push notification error:', e)
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
