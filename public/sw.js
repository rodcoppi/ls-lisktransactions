// Lisk Dashboard Service Worker
const CACHE_NAME = 'lisk-dashboard-cache-v1';
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
    "pattern": "\\/api\\/(metrics|live)",
    "strategy": "NetworkOnly",
    "cacheName": "realtime-data"
  }
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache critical resources
      return cache.addAll([
        '/',
        '/manifest.json',
        '/offline.html',
      ]).catch(error => {
        console.error('Failed to pre-cache resources:', error);
      });
    })
  );
  
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('lisk-dashboard-cache')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event
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
  
  // Find matching strategy
  const strategy = findMatchingStrategy(request.url);
  
  if (strategy) {
    event.respondWith(handleRequest(request, strategy));
  }
});

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
    
    if (cachedResponse) {
      // Check if cache entry is expired
      const dateHeader = cachedResponse.headers.get('date');
      const maxAge = strategy.options?.maxAgeSeconds;
      
      if (dateHeader && maxAge) {
        const cacheDate = new Date(dateHeader);
        const now = new Date();
        const ageInSeconds = (now.getTime() - cacheDate.getTime()) / 1000;
        
        if (ageInSeconds > maxAge) {
          console.log('Cache entry expired, fetching from network');
        } else {
          return cachedResponse;
        }
      } else {
        return cachedResponse;
      }
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
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Network First strategy
async function networkFirstStrategy(request, cache, strategy) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await enforceMaxEntries(cache, strategy.options?.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, falling back to cache');
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Stale While Revalidate strategy
async function staleWhileRevalidateStrategy(request, cache, strategy) {
  const cachedResponse = cache.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await enforceMaxEntries(cache, strategy.options?.maxEntries);
    }
    return networkResponse;
  }).catch((error) => {
    console.error('Network request failed:', error);
    return null;
  });
  
  return cachedResponse || fetchPromise;
}

// Network Only strategy
async function networkOnlyStrategy(request) {
  return fetch(request);
}

// Cache Only strategy
async function cacheOnlyStrategy(request, cache) {
  return cache.match(request) || new Response('Not found in cache', { status: 404 });
}

// Enforce maximum cache entries
async function enforceMaxEntries(cache, maxEntries) {
  if (!maxEntries) return;
  
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Remove oldest entries (FIFO)
    const entriesToDelete = keys.length - maxEntries;
    
    for (let i = 0; i < entriesToDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Message handler for cache management
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
  }
});

// Handle cache clear
async function handleCacheClear(cacheName) {
  if (cacheName) {
    return caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

// Handle cache delete
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
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      entries: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return stats;
}

console.log('Service Worker loaded successfully');