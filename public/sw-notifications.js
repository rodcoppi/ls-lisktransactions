// Push notification handling for Lisk Dashboard
// This extends the main service worker with notification functionality

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {};
  
  try {
    if (event.data) {
      notificationData = event.data.json();
    }
  } catch (error) {
    console.error('Failed to parse push notification data:', error);
    notificationData = {
      title: 'Lisk Dashboard Notification',
      body: 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
    };
  }

  const {
    title = 'Lisk Dashboard Notification',
    body = 'You have a new notification',
    icon = '/icon-192x192.png',
    badge = '/badge-72x72.png',
    image,
    vibrate = [200, 100, 200],
    silent = false,
    requireInteraction = false,
    tag,
    data = {},
    actions = []
  } = notificationData;

  const options = {
    body,
    icon,
    badge,
    image,
    vibrate,
    silent,
    requireInteraction,
    tag: tag || `notification-${Date.now()}`,
    data: {
      ...data,
      timestamp: Date.now(),
      url: data.url || '/',
    },
    actions: actions.slice(0, 2) // Limit to 2 actions per spec
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  const notification = event.notification;
  const data = notification.data || {};
  
  notification.close();

  if (event.action) {
    // Handle action button clicks
    console.log('Notification action clicked:', event.action);
    
    // Send message to client about action
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_ACTION',
          payload: {
            action: event.action,
            notification: {
              title: notification.title,
              body: notification.body,
              data: data,
            }
          }
        });
      });
    });
    
    return;
  }

  // Handle general notification clicks
  const url = data.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );

  // Send message to client about notification click
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_CLICK',
        payload: {
          notification: {
            title: notification.title,
            body: notification.body,
            data: data,
          }
        }
      });
    });
  });
});

// Notification close handling
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);

  // Send message to client about notification close
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_CLOSE',
        payload: {
          notification: {
            title: event.notification.title,
            body: event.notification.body,
            data: event.notification.data || {},
          }
        }
      });
    });
  });
});

// Push subscription change handling
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  // Re-subscribe to push notifications
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options.applicationServerKey
    }).then(subscription => {
      // Send new subscription to server
      return fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          }
        })
      });
    }).catch(error => {
      console.error('Failed to re-subscribe to push notifications:', error);
    })
  );
});

// Background sync for failed notifications
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'notification-retry') {
    event.waitUntil(retryFailedNotifications());
  }
});

// Retry failed notifications
async function retryFailedNotifications() {
  try {
    // Get failed notifications from IndexedDB or local storage
    const failedNotifications = await getFailedNotifications();
    
    for (const notification of failedNotifications) {
      try {
        await self.registration.showNotification(
          notification.title,
          notification.options
        );
        
        // Remove from failed queue
        await removeFailedNotification(notification.id);
      } catch (error) {
        console.error('Failed to retry notification:', error);
      }
    }
  } catch (error) {
    console.error('Failed to retry notifications:', error);
  }
}

// Utility functions for failed notification management
async function getFailedNotifications() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

async function removeFailedNotification(id) {
  // In a real implementation, this would remove from IndexedDB
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

console.log('Push notification service worker loaded successfully');