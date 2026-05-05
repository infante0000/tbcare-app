self.addEventListener('notificationclick', e => e.notification.close());
// Register in main.jsx:
navigator.serviceWorker.register('/sw.js');