/* global self, clients */
self.addEventListener('push', (event) => {
  const show = (payload) => {
    const title = payload.title || 'DrinkatHR';
    const opts = {
      body: payload.body || '',
      data: { ...(payload.data || {}), url: payload.data?.url || payload.url },
      icon: '/favicon.ico',
    };
    return self.registration.showNotification(title, opts);
  };
  if (event.data) {
    event.waitUntil(
      event.data.text().then((t) => {
        let payload = { title: 'DrinkatHR', body: '', data: {} };
        try {
          if (t) payload = JSON.parse(t);
        } catch {
          /* ignore */
        }
        return show(payload);
      })
    );
  } else {
    event.waitUntil(show({ title: 'DrinkatHR', body: '' }));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const c of windowClients) {
          if (c.url.startsWith(new URL(url).origin) && 'focus' in c) return c.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
    );
  }
});
