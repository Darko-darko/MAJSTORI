// public/sw.js
// Service Worker za Pro-Meister push notifikacije

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Pro-Meister', message: event.data.text(), url: '/dashboard' }
  }

  const { title, message, url } = data

  event.waitUntil(
    self.registration.showNotification(title || 'Pro-Meister', {
      body: message || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: { url: url || '/dashboard' },
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Ako je app već otvorena, fokusiraj je
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Inače otvori novi tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
