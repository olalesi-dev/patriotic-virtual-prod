self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        payload = {};
    }

    const notification = payload.notification || {};
    const data = payload.data || {};
    const title = notification.title || data.title || 'New notification';
    const body = notification.body || data.body || 'You have a new update.';
    const href = data.href || '/notifications';
    const icon = notification.icon || '/favicon.ico';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            data: { href },
            tag: data.notificationId || undefined
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetHref = event.notification?.data?.href || '/notifications';
    const absoluteTarget = new URL(targetHref, self.location.origin).toString();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url === absoluteTarget && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(absoluteTarget);
            }
            return undefined;
        })
    );
});
