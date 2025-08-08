// Lisk Dashboard Service Worker - Enhanced PWA Version
const CACHE_NAME = 'lisk-dashboard-cache-v2';
const OFFLINE_CACHE = 'lisk-dashboard-offline-v1';
const RUNTIME_CACHE = 'lisk-dashboard-runtime-v1';

// Background sync and notification settings
const BACKGROUND_SYNC_TAG = 'dashboard-sync';
const PERIODIC_SYNC_TAG = 'dashboard-periodic-sync';
const NOTIFICATION_TAG = 'dashboard-alert';
const NOTIFICATION_ICON = '/icon-192.png';
const NOTIFICATION_BADGE = '/icon-72.png';

// Cache strategies configuration
const STRATEGIES = [
  {
    "pattern": "\\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$",
    "strategy": "CacheFirst",
    "cacheName": "static-assets",
    "options": {
      "maxEntries": 100,
      "maxAgeSeconds": 31536000
    }
  },
  {
    "pattern": "\\/api\\/",
    "strategy": "NetworkFirst",
    "cacheName": "api-cache",
    "options": {
      "maxEntries": 50,
      "maxAgeSeconds": 300
    }
  },
  {
    "pattern": "\\/dashboard",
    "strategy": "StaleWhileRevalidate",
    "cacheName": "pages-cache",
    "options": {
      "maxEntries": 20,
      "maxAgeSeconds": 3600
    }
  },
  {
    "pattern": "\\/api\\/charts",
    "strategy": "NetworkFirst",
    "cacheName": "chart-data",
    "options": {
      "maxEntries": 30,
      "maxAgeSeconds": 600
    }
  },
  {
    "pattern": "\\/api\\/(metrics|live|ws)",
    "strategy": "NetworkOnly",
    "cacheName": "realtime-data"
  }
];

// Critical resources for offline functionality
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/dashboard'
];

// Install event - Enhanced with better offline support
self.addEventListener('install', (event) => {
  console.log('Service Worker installing - Enhanced PWA version');
  
  event.waitUntil(
    Promise.all([
      // Pre-cache critical resources
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Pre-caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES).catch(error => {
          console.error('Failed to pre-cache critical resources:', error);
          return Promise.resolve();
        });
      }),
      
      // Create offline cache
      caches.open(OFFLINE_CACHE).then((cache) => {
        console.log('Creating offline cache');
        return cache.addAll([
          '/offline.html',
          '/icon-192.png'
        ]).catch(error => {
          console.error('Failed to create offline cache:', error);
          return Promise.resolve();
        });
      }),
      
      // Register for background sync
      self.registration.sync && self.registration.sync.register(BACKGROUND_SYNC_TAG).catch(error => {
        console.log('Background sync not supported or failed to register:', error);
      })
    ])
  );
  
  self.skipWaiting();
});

// Activate event - Enhanced cleanup
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating - Enhanced PWA version');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_CACHE && 
                cacheName !== RUNTIME_CACHE &&
                (cacheName.startsWith('lisk-dashboard-cache') || 
                 cacheName.startsWith('lisk-dashboard-offline') ||
                 cacheName.startsWith('lisk-dashboard-runtime'))) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Initialize runtime cache
      caches.open(RUNTIME_CACHE).then((cache) => {
        console.log('Runtime cache initialized');
        return cache;
      }),
      
      // Send update notification to all clients
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            timestamp: Date.now()
          });
        });
      })
    ])
  );
  
  self.clients.claim();
});

// Fetch event - Enhanced with better offline handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle navigation requests specially
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Find matching strategy
  const strategy = findMatchingStrategy(request.url);
  
  if (strategy) {
    event.respondWith(handleRequest(request, strategy));
  } else {
    // Default to runtime cache for unmatched requests
    event.respondWith(handleRuntimeCacheRequest(request));
  }
});

// Enhanced navigation request handler
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the navigation response
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Navigation request failed, serving from cache or offline page');
    
    // Try to serve from cache first
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve offline page
    const offlineCache = await caches.open(OFFLINE_CACHE);
    return offlineCache.match('/offline.html') || new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Runtime cache handler for unmatched requests
async function handleRuntimeCacheRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Find matching caching strategy
function findMatchingStrategy(url) {
  for (const strategy of STRATEGIES) {
    const pattern = new RegExp(strategy.pattern);
    if (pattern.test(url)) {
      return strategy;
    }
  }
  return null;
}

// Handle request based on strategy
async function handleRequest(request, strategy) {
  const cache = await caches.open(strategy.cacheName);
  
  switch (strategy.strategy) {
    case 'CacheFirst':
      return cacheFirstStrategy(request, cache, strategy);
    case 'NetworkFirst':
      return networkFirstStrategy(request, cache, strategy);
    case 'StaleWhileRevalidate':
      return staleWhileRevalidateStrategy(request, cache, strategy);
    case 'NetworkOnly':
      return networkOnlyStrategy(request);
    case 'CacheOnly':
      return cacheOnlyStrategy(request, cache);
    default:
      return fetch(request);
  }
}

// Cache First strategy
async function cacheFirstStrategy(request, cache, strategy) {
  try {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isCacheExpired(cachedResponse, strategy.options?.maxAgeSeconds)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await enforceMaxEntries(cache, strategy.options?.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First strategy failed:', error);
    const cachedResponse = await cache.match(request);
    return cachedResponse || createOfflineResponse();
  }
}

// Network First strategy - Enhanced with better error handling
async function networkFirstStrategy(request, cache, strategy) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ]);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await enforceMaxEntries(cache, strategy.options?.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, falling back to cache:', error.message);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-From-Cache', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    return createOfflineResponse();
  }
}

// Stale While Revalidate strategy - Enhanced
async function staleWhileRevalidateStrategy(request, cache, strategy) {
  const cachedResponse = cache.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await enforceMaxEntries(cache, strategy.options?.maxEntries);
      
      // Notify clients of fresh data
      notifyClientsOfUpdate(request.url);
    }
    return networkResponse;
  }).catch((error) => {
    console.error('Network request failed in SWR:', error);
    return null;
  });
  
  return cachedResponse || fetchPromise || createOfflineResponse();
}

// Network Only strategy
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return createOfflineResponse();
  }
}

// Cache Only strategy
async function cacheOnlyStrategy(request, cache) {
  return cache.match(request) || createOfflineResponse();
}

// Check if cache entry is expired
function isCacheExpired(response, maxAgeSeconds) {
  if (!maxAgeSeconds) return false;
  
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const cacheDate = new Date(dateHeader);
  const now = new Date();
  const ageInSeconds = (now.getTime() - cacheDate.getTime()) / 1000;
  
  return ageInSeconds > maxAgeSeconds;
}

// Create offline response
function createOfflineResponse() {
  return new Response('You are offline. Some features may not be available.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain',
      'X-Offline': 'true'
    }
  });
}

// Notify clients of updates
function notifyClientsOfUpdate(url) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        url: url,
        timestamp: Date.now()
      });
    });
  });
}

// Enforce maximum cache entries
async function enforceMaxEntries(cache, maxEntries) {
  if (!maxEntries) return;
  
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    const entriesToDelete = keys.length - maxEntries;
    
    for (let i = 0; i < entriesToDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Background Sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(handleBackgroundSync());
  }
});

// Push event for notifications
self.addEventListener('push', (event) => {
  console.log('Push message received');
  
  let notificationData = {
    title: 'Dashboard Alert',
    body: 'New activity on your dashboard',
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
    tag: NOTIFICATION_TAG
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (error) {
      console.error('Failed to parse push payload:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Dashboard',
          icon: '/icon-72.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: notificationData.urgent || false
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Try to focus an existing window
        for (const client of clients) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/dashboard');
        }
      })
    );
  }
});

// Enhanced message handler
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_CLEAR':
      handleCacheClear(payload).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'CACHE_DELETE':
      handleCacheDelete(payload).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'CACHE_STATS':
      handleCacheStats().then((stats) => {
        event.ports[0].postMessage({ success: true, data: stats });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'SYNC_DATA':
      queueSyncData(payload).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'REQUEST_NOTIFICATION_PERMISSION':
      requestNotificationPermission().then((permission) => {
        event.ports[0].postMessage({ success: true, permission });
      });
      break;
  }
});

// Cache management functions
async function handleCacheClear(cacheName) {
  if (cacheName) {
    return caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

async function handleCacheDelete(url) {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    await cache.delete(url);
  }
}

// Handle cache stats
async function handleCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    let cacheSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response && response.headers.get('content-length')) {
        cacheSize += parseInt(response.headers.get('content-length'));
      }
    }
    
    stats[cacheName] = {
      entries: keys.length,
      size: cacheSize,
      urls: keys.map(request => request.url)
    };
    
    totalSize += cacheSize;
  }
  
  return {
    caches: stats,
    totalSize,
    totalEntries: Object.values(stats).reduce((sum, cache) => sum + cache.entries, 0)
  };
}

// Handle background sync
async function handleBackgroundSync() {
  try {
    console.log('Performing background sync');
    
    // Sync pending data (placeholder for actual sync logic)
    const syncData = await getSyncData();
    
    if (syncData.length > 0) {
      await uploadPendingData(syncData);
      await clearSyncData();
      
      // Notify user of successful sync
      self.registration.showNotification('Dashboard Synced', {
        body: `${syncData.length} items synchronized successfully`,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        tag: 'sync-complete',
        silent: true
      });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
    
    // Show error notification
    self.registration.showNotification('Sync Failed', {
      body: 'Failed to sync dashboard data. Will retry later.',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      tag: 'sync-error'
    });
  }
}

// Queue sync data
async function queueSyncData(data) {
  const syncQueue = await getSyncQueue();
  syncQueue.push({
    id: Date.now().toString(),
    data,
    timestamp: Date.now(),
    retries: 0
  });
  
  await setSyncQueue(syncQueue);
  
  // Register background sync
  if (self.registration.sync) {
    return self.registration.sync.register(BACKGROUND_SYNC_TAG);
  }
}

// Sync data management functions
async function getSyncData() {
  const syncQueue = await getSyncQueue();
  return syncQueue.filter(item => item.retries < 3);
}

async function getSyncQueue() {
  return self.syncQueue || [];
}

async function setSyncQueue(queue) {
  self.syncQueue = queue;
}

async function clearSyncData() {
  self.syncQueue = [];
}

async function uploadPendingData(data) {
  console.log('Uploading pending data:', data);
  return Promise.resolve();
}

async function requestNotificationPermission() {
  if ('Notification' in self && Notification.requestPermission) {
    return await Notification.requestPermission();
  }
  return 'default';
}

console.log('Service Worker loaded successfully - Enhanced PWA version');