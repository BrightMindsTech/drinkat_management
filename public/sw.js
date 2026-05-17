/* global self, clients */
function parsePushPayload(event) {
  const fallback = { title: 'DrinkatHR', body: '', data: {} };
  if (!event.data) return Promise.resolve(fallback);
  return event.data.text().then((t) => {
    if (!t) return fallback;
    try {
      return JSON.parse(t);
    } catch {
      return { ...fallback, body: t };
    }
  });
}

self.addEventListener('push', (event) => {
  const show = (payload) => {
    const title = payload.title || 'DrinkatHR';
    const body = payload.body || '';
    const tag = payload.data?.type || payload.data?.threadId || 'drinkat-alert';
    const opts = {
      body,
      tag,
      renotify: true,
      requireInteraction: false,
      silent: false,
      vibrate: [120, 60, 120],
      data: { ...(payload.data || {}), url: payload.data?.url || payload.url },
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    };
    return self.registration.showNotification(title, opts);
  };

  event.waitUntil(parsePushPayload(event).then(show));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (!url) return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const c of windowClients) {
        if (c.url.startsWith(new URL(url, self.location.origin).origin) && 'focus' in c) {
          if ('navigate' in c && typeof c.navigate === 'function') {
            return c.navigate(url).then(() => c.focus());
          }
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
